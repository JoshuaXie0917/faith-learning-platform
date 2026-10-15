"use strict";
// Regression tests for public Share creation (src/lib/shareCreate.ts and its helpers):
// body byte limit, Unicode-aware field rules, repeated submissions and the
// per-address throttle.
//
//   node tests/share-create.test.cjs                 field and body rules only
//   TEST_DATABASE_URL=postgresql://...@127.0.0.1:<port>/<name>_test node tests/share-create.test.cjs
//                                                    also the database tests
//
// The database tests apply every migration to TEST_DATABASE_URL and write to it, so
// the URL must point at a disposable local database (localhost, name ending in _test).
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createRequire } = require("node:module");

const REPO = path.resolve(__dirname, "..");
const repoRequire = createRequire(path.join(REPO, "package.json"));
const TEST_URL = process.env.TEST_DATABASE_URL || "";
const OUT = path.join(REPO, "node_modules", ".cache", "flp-share-test");
const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, ok: false });
    console.log(`FAIL ${name}: ${String(error && error.message ? error.message : error).slice(0, 600)}`);
  }
}

function compile() {
  fs.rmSync(OUT, { recursive: true, force: true });
  const lib = (f) => path.join(REPO, "src", "lib", f);
  const r = spawnSync(process.execPath, [
    repoRequire.resolve("typescript/bin/tsc"), "--outDir", OUT, "--rootDir", path.join(REPO, "src", "lib"),
    "--module", "commonjs", "--target", "es2022", "--moduleResolution", "node", "--esModuleInterop",
    "--lib", "es2022,dom", "--skipLibCheck", "--strict", lib("shareCreate.ts"),
  ], { cwd: REPO, encoding: "utf8", windowsHide: true });
  if (r.status !== 0) throw new Error(`tsc failed:\n${r.stdout}${r.stderr}`);
}

function assertDisposable(url) {
  const u = new URL(url);
  if (!["127.0.0.1", "localhost"].includes(u.hostname) || !/_test$/.test(u.pathname.slice(1))) {
    throw new Error(`Refusing a database that is not a disposable local *_test database (${u.hostname}${u.pathname})`);
  }
}

async function main() {
  compile();
  const v = require(path.join(OUT, "shareValidation.js"));
  const body = require(path.join(OUT, "requestBody.js"));
  const create = require(path.join(OUT, "shareCreate.js"));
  const throttle = require(path.join(OUT, "loginThrottle.js"));

  const base = { visitorKey: "visitor-a", name: "张三", title: "主题" };
  const check = (content, extra = {}) => v.validateShareInput({ ...base, content, ...extra });
  const family = "👨‍👩‍👧‍👦";

  // ---------------------------------------------------------------- field rules
  await test("normal Share text is valid (Chinese, punctuation, line breaks)", () => {
    const r = check("今天读到诗篇 23 篇：\n“耶和华是我的牧者，我必不致缺乏。”很受感动！");
    assert.equal(r.ok, true);
  });
  await test("punctuation-only or whitespace-only content is refused", () => {
    for (const content of ["，。！？……", "!!! ??? ...", "   \n\t  ", "——"]) assert.equal(check(content).ok, false, content);
    assert.equal(check("，。！？").error, "分享内容需要包含文字。");
  });
  await test("emoji count as one character each (sequences, skin tones, flags)", () => {
    assert.equal(v.countCharacters(family), 1);
    assert.equal(v.countCharacters("👍🏽🇨🇦🙏"), 3);
    assert.equal(check("🙏").ok, true);
    assert.equal(check("🇨🇦".repeat(800)).ok, true);
    assert.equal(check(family.repeat(800)).ok, true);
    assert.equal(check(family.repeat(801)).ok, false);
  });
  await test("combining characters count with their base letter", () => {
    const decomposed = "é";
    assert.equal(v.countCharacters(decomposed), 1);
    assert.equal(check(decomposed.repeat(800)).ok, true);
    assert.equal(check(decomposed.repeat(801)).ok, false);
    assert.equal(check(`a${"́".repeat(300)}`).ok, true); // one character, bounded by the body limit
  });
  await test("the 800 limit counts punctuation and spaces", () => {
    assert.equal(check("字".repeat(800)).ok, true);
    assert.equal(check(`${"字".repeat(799)}。`).ok, true);
    assert.equal(check(`${"字".repeat(800)}。`).ok, false);
    assert.equal(check(`字${"，".repeat(5000)}字`).error, v.SHARE_CONTENT_LIMIT_MESSAGE);
    assert.equal(check(`  ${"字".repeat(800)}  \r\n`).ok, true); // trimmed first
  });
  await test("name and title limits use the same counting", () => {
    assert.equal(check("x", { name: "名".repeat(50) }).ok, true);
    assert.equal(check("x", { name: "名".repeat(51) }).ok, false);
    assert.equal(check("x", { name: "👍🏽".repeat(50) }).ok, true);
    assert.equal(check("x", { title: "题".repeat(100) }).ok, true);
    assert.equal(check("x", { title: "题".repeat(101) }).ok, false);
  });
  await test("control characters and missing or non-text fields are refused", () => {
    assert.equal(check("a\u0000b").ok, false);
    assert.equal(check("a\nb\tc").ok, true);
    assert.equal(check("x", { name: "a\nb" }).ok, false);
    assert.equal(check("x", { title: "a\u0007" }).ok, false);
    assert.equal(v.validateShareInput({ name: "a", title: "b", content: "c" }).ok, false);
    assert.equal(v.validateShareInput({ ...base, content: 123 }).ok, false);
    assert.equal(v.validateShareInput({ ...base, visitorKey: "k".repeat(500), content: "c" }).value.visitorKey.length, 120);
  });

  // ---------------------------------------------------------------- body limit
  const request = (raw, headers = {}) => new Request("http://localhost/api/shares", { method: "POST", body: raw, headers, duplex: "half" });
  const stream = (chunks, size) => new ReadableStream({
    start(c) {
      for (let i = 0; i < chunks; i += 1) c.enqueue(new TextEncoder().encode("x".repeat(size)));
      c.close();
    },
  });
  await test("bodies over the byte limit are refused with 413 before parsing", async () => {
    const limit = v.SHARE_BODY_MAX_BYTES;
    assert.equal((await body.readJsonObject(request("x".repeat(limit + 1)), limit)).status, 413);
    assert.equal((await body.readJsonObject(request("{}", { "content-length": String(10 * 1024 * 1024) }), limit)).status, 413);
    assert.equal((await body.readJsonObject(new Request("http://localhost", { method: "POST", body: stream(200, 1024), duplex: "half" }), limit)).status, 413);
    const worstCase = JSON.stringify({ visitorKey: "k".repeat(120), name: "👩🏽‍❤️‍💋‍👨🏿".repeat(50), title: "👩🏽‍❤️‍💋‍👨🏿".repeat(100), content: "👩🏽‍❤️‍💋‍👨🏿".repeat(800) });
    assert.ok(Buffer.byteLength(worstCase) < limit, "a valid Share of the longest emoji sequences fits the limit");
  });
  await test("malformed bodies are refused with 400", async () => {
    for (const raw of ["not json", "[1,2]", "null", "\"text\"", ""]) assert.equal((await body.readJsonObject(request(raw), 1024)).status, 400, raw);
    assert.equal((await body.readJsonObject(request(new Uint8Array([0x7b, 0x22, 0x61, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d])), 1024)).status, 400);
    assert.equal((await body.readJsonObject(new Request("http://localhost", { method: "POST" }), 1024)).status, 400);
    assert.deepEqual(await body.readJsonObject(request("{\"a\":1}"), 1024), { ok: true, value: { a: 1 } });
  });

  // ---------------------------------------------------------------- database
  if (!TEST_URL) {
    console.log("SKIP database tests (TEST_DATABASE_URL not set)");
  } else {
    assertDisposable(TEST_URL);
    const migrate = spawnSync(process.execPath, [repoRequire.resolve("prisma/build/index.js"), "migrate", "deploy", "--schema", path.join(REPO, "prisma", "schema.prisma")], {
      cwd: REPO, encoding: "utf8", windowsHide: true, env: { ...process.env, DATABASE_URL: TEST_URL, CHECKPOINT_DISABLE: "1" },
    });
    if (migrate.status !== 0 || !/All migrations have been successfully applied|No pending migrations/.test(`${migrate.stdout}`)) throw new Error(`migrate deploy failed:\n${migrate.stdout}${migrate.stderr}`);
    const { PrismaClient } = repoRequire("@prisma/client");
    const prisma = new PrismaClient({ datasourceUrl: TEST_URL, log: [] });
    const T0 = new Date("2026-11-01T12:00:00.000Z");
    let clock = T0;
    const deps = { prisma, now: () => clock, throttleSecret: "test-throttle-secret" };
    let ipCounter = 0;
    const freshIp = () => `203.0.113.${(ipCounter += 1)}`;
    const post = async (payload, { ip = freshIp(), raw = null, headers = {} } = {}) => {
      const res = await create.handleShareCreate(new Request("http://localhost/api/shares", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip, ...headers },
        body: raw !== null ? raw : JSON.stringify(payload),
        duplex: "half",
      }), deps);
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        /* not JSON */
      }
      return { status: res.status, json, text, retryAfter: res.headers.get("retry-after") };
    };
    const count = async (table) => Number((await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${table}"`))[0].n);
    const valid = (n, extra = {}) => ({ visitorKey: `visitor-${n}`, name: "李四", title: `分享 ${n}`, content: `感谢主，今天的提醒 ${n}。`, ...extra });

    await test("a normal valid Share is stored with a 168-hour lifetime and no key in the response", async () => {
      const r = await post(valid("normal"));
      assert.equal(r.status, 200, r.text);
      assert.equal(r.json.ok, true);
      assert.ok(!r.text.includes("visitor-normal"));
      const row = await prisma.share.findUnique({ where: { id: r.json.shareId } });
      assert.equal(row.ownerKey, "visitor-normal");
      assert.equal(row.content, "感谢主，今天的提醒 normal。");
      assert.equal(row.expiresAt.getTime() - row.createdAt.getTime(), 168 * HOUR);
    });

    await test("refused requests (oversized, malformed, punctuation-only) never reach the database", async () => {
      const shares = await count("Share");
      const rows = await count("LoginThrottle");
      const ip = freshIp();
      assert.equal((await post(null, { ip, raw: JSON.stringify(valid("big", { content: `字${"，".repeat(30000)}字` })) })).status, 413);
      assert.equal((await post(null, { ip, raw: "x".repeat(5 * 1024 * 1024) })).status, 413);
      assert.equal((await post(null, { ip, raw: "{\"visitorKey\": \"k\", " })).status, 400);
      assert.equal((await post(valid("punct", { content: "，。！？……" }), { ip })).status, 400);
      const almost = await post(valid("almost", { content: `字${"，".repeat(20000)}字` }), { ip }); // under 64 KB, over 800 characters
      assert.equal(almost.status, 400);
      assert.equal(almost.json.error, v.SHARE_CONTENT_LIMIT_MESSAGE);
      assert.equal(await count("Share"), shares);
      assert.equal(await count("LoginThrottle"), rows);
    });

    await test("emoji and combining-character Shares are stored exactly as sent", async () => {
      const emoji = await post(valid("emoji", { content: family.repeat(800) }));
      assert.equal(emoji.status, 200, emoji.text);
      assert.equal((await prisma.share.findUnique({ where: { id: emoji.json.shareId } })).content, family.repeat(800));
      assert.equal((await post(valid("emoji-over", { content: family.repeat(801) }))).status, 400);
      const combining = await post(valid("combining", { content: "é".repeat(800) }));
      assert.equal(combining.status, 200, combining.text);
      assert.equal((await post(valid("combining-over", { content: "é".repeat(801) }))).status, 400);
    });

    await test("a repeated submission returns the first Share instead of a duplicate", async () => {
      const ip = freshIp();
      const first = await post(valid("repeat"), { ip });
      const again = await post(valid("repeat"), { ip });
      assert.equal(first.status, 200);
      assert.equal(again.status, 200);
      assert.equal(again.json.shareId, first.json.shareId);
      assert.equal(again.json.repeated, true);
      assert.equal(await prisma.share.count({ where: { ownerKey: "visitor-repeat" } }), 1);
      const otherTitle = await post(valid("repeat", { title: "另一个主题" }), { ip });
      assert.notEqual(otherTitle.json.shareId, first.json.shareId);
      clock = new Date(T0.getTime() + 11 * MIN);
      const later = await post(valid("repeat"), { ip });
      assert.notEqual(later.json.shareId, first.json.shareId, "after 10 minutes the same text is a new Share");
      clock = T0;
    });

    await test("five simultaneous identical submissions create exactly one Share", async () => {
      const ip = freshIp();
      const all = await Promise.all(Array.from({ length: 5 }, () => post(valid("parallel"), { ip })));
      assert.ok(all.every((r) => r.status === 200), all.map((r) => r.status).join(","));
      assert.equal(new Set(all.map((r) => r.json.shareId)).size, 1);
      assert.equal(await prisma.share.count({ where: { ownerKey: "visitor-parallel" } }), 1);
    });

    await test("throttle: 6 new Shares per address per hour, then 429 with Retry-After; other addresses unaffected", async () => {
      const ip = freshIp();
      for (let i = 0; i < 6; i += 1) assert.equal((await post(valid(`t-${i}`), { ip })).status, 200, `share ${i + 1}`);
      const seventh = await post(valid("t-6"), { ip });
      assert.equal(seventh.status, 429);
      assert.ok(Number(seventh.retryAfter) > 0 && Number(seventh.retryAfter) <= 3600, seventh.retryAfter);
      assert.equal((await post(valid("t-7"), { ip })).status, 429);
      assert.equal(await prisma.share.count({ where: { ownerKey: { in: ["visitor-t-6", "visitor-t-7"] } } }), 0);
      assert.equal((await post(valid("t-other"), { ip: freshIp() })).status, 200);
      assert.equal((await post(valid("t-5"), { ip })).json.repeated, true, "a repeat of an existing Share is answered while blocked");
      clock = new Date(T0.getTime() + 61 * MIN);
      assert.equal((await post(valid("t-8"), { ip })).status, 200, "allowed again after the block");
      clock = T0;
    });

    await test("throttle: 10 simultaneous new Shares from one address create exactly 6", async () => {
      const ip = freshIp();
      const all = await Promise.all(Array.from({ length: 10 }, (_, i) => post(valid(`p-${i}`), { ip })));
      assert.equal(all.filter((r) => r.status === 200).length, 6, all.map((r) => r.status).join(","));
      assert.equal(all.filter((r) => r.status === 429).length, 4);
    });

    await test("throttle rows are HMACs separate from login rows; raw addresses are never stored", async () => {
      const ip = "198.51.100.77";
      for (let i = 0; i < 7; i += 1) await post(valid(`sep-${i}`), { ip });
      const shareKey = throttle.hashClientAddress(ip, "test-throttle-secret", "share-create");
      const loginKey = throttle.hashClientAddress(ip, "test-throttle-secret");
      assert.notEqual(shareKey, loginKey);
      assert.equal((await throttle.registerLoginAttempt(prisma, loginKey, T0)).allowed, true, "login is not blocked by the Share throttle");
      const rows = await prisma.$queryRawUnsafe(`SELECT "key" FROM "LoginThrottle"`);
      assert.ok(rows.length > 0 && rows.every((r) => /^[0-9a-f]{64}$/.test(r.key) && !r.key.includes("203.0.113") && !r.key.includes("198.51")));
    });

    await prisma.$disconnect();
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  const failed = results.filter((r) => !r.ok);
  console.log(`RESULT: ${failed.length === 0 ? "PASS" : "FAIL"} (${results.length - failed.length}/${results.length})`);
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(`ERROR: ${error && error.message ? error.message : error}`);
  process.exitCode = 2;
});
