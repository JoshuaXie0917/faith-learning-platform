"use strict";
// Regression tests for Share deletion and favorites (src/lib/shareLifecycle.ts and
// src/lib/favoriteLimit.ts): explicit deletion is immediate and removes favorites,
// hidden favorites do not count toward the limit, invisible Shares cannot be
// favorited, and deletion stays consistent under concurrent favorites.
//
//   TEST_DATABASE_URL=postgresql://...@127.0.0.1:<port>/<name>_test node tests/share-lifecycle.test.cjs
//
// The tests apply every migration to TEST_DATABASE_URL and write to it, so the URL
// must point at a disposable local database (localhost, name ending in _test).
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createRequire } = require("node:module");

const REPO = path.resolve(__dirname, "..");
const repoRequire = createRequire(path.join(REPO, "package.json"));
const TEST_URL = process.env.TEST_DATABASE_URL || "";
const OUT = path.join(REPO, "node_modules", ".cache", "flp-share-lifecycle-test");
const HOUR = 60 * 60 * 1000;

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

function assertDisposable(url) {
  const u = new URL(url);
  if (!["127.0.0.1", "localhost"].includes(u.hostname) || !/_test$/.test(u.pathname.slice(1))) {
    throw new Error(`Refusing a database that is not a disposable local *_test database (${u.hostname}${u.pathname})`);
  }
}

function compile() {
  fs.rmSync(OUT, { recursive: true, force: true });
  const r = spawnSync(process.execPath, [
    repoRequire.resolve("typescript/bin/tsc"), "--outDir", OUT, "--rootDir", path.join(REPO, "src", "lib"),
    "--module", "commonjs", "--target", "es2022", "--moduleResolution", "node", "--esModuleInterop",
    "--lib", "es2022,dom", "--skipLibCheck", "--strict", path.join(REPO, "src", "lib", "shareLifecycle.ts"),
  ], { cwd: REPO, encoding: "utf8", windowsHide: true });
  if (r.status !== 0) throw new Error(`tsc failed:\n${r.stdout}${r.stderr}`);
}

async function main() {
  if (!TEST_URL) throw new Error("TEST_DATABASE_URL is required (a disposable local *_test database)");
  assertDisposable(TEST_URL);
  // The modules' default client must never see another database.
  process.env.DATABASE_URL = TEST_URL;

  compile();
  const lifecycle = require(path.join(OUT, "shareLifecycle.js"));
  const limit = require(path.join(OUT, "favoriteLimit.js"));

  const migrate = spawnSync(process.execPath, [repoRequire.resolve("prisma/build/index.js"), "migrate", "deploy", "--schema", path.join(REPO, "prisma", "schema.prisma")], {
    cwd: REPO, encoding: "utf8", windowsHide: true, env: { ...process.env, DATABASE_URL: TEST_URL, CHECKPOINT_DISABLE: "1" },
  });
  if (migrate.status !== 0 || !/All migrations have been successfully applied|No pending migrations/.test(`${migrate.stdout}`)) throw new Error(`migrate deploy failed:\n${migrate.stdout}${migrate.stderr}`);

  const { PrismaClient } = repoRequire("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: TEST_URL, log: [] });
  const key = (label) => `${label}-${crypto.randomBytes(6).toString("hex")}`;
  const share = (data = {}) => {
    const now = Date.now();
    return prisma.share.create({
      data: { name: "测试", title: "主题", content: "内容", ownerKey: key("owner"), createdAt: new Date(now - HOUR), expiresAt: new Date(now + 167 * HOUR), ...data },
      select: { id: true, ownerKey: true },
    });
  };
  const expired = () => share({ createdAt: new Date(Date.now() - 200 * HOUR), expiresAt: new Date(Date.now() - 32 * HOUR) });
  const favorite = (shareId, visitorKey) => prisma.shareFavorite.create({ data: { shareId, visitorKey } });
  const content = (data) => prisma.content.create({ data: { title: "内容", description: "说明", date: "2026-10-01", ...data }, select: { id: true } });
  const state = async (id) => {
    const row = await prisma.share.findUnique({ where: { id }, select: { deletedAt: true } });
    return { exists: !!row, deleted: !!(row && row.deletedAt), favorites: await prisma.shareFavorite.count({ where: { shareId: id } }) };
  };
  const visibleCount = (visitorKey) => prisma.$transaction((tx) => limit.countVisitorFavorites(tx, visitorKey));

  await test("owner delete: only the owner's browser can delete; the Share disappears at once and every favorite is removed", async () => {
    const s = await share();
    await favorite(s.id, "fav-b");
    await favorite(s.id, "fav-c");
    assert.equal(await lifecycle.deleteShare(prisma, s.id, { ownerKey: "someone-else" }), "forbidden");
    assert.deepEqual(await state(s.id), { exists: true, deleted: false, favorites: 2 });
    assert.equal(await lifecycle.deleteShare(prisma, s.id, { ownerKey: s.ownerKey }), "deleted");
    assert.deepEqual(await state(s.id), { exists: true, deleted: true, favorites: 0 });
    assert.equal(await lifecycle.deleteShare(prisma, s.id, { ownerKey: s.ownerKey }), "not-found");
    assert.equal(await lifecycle.addShareFavorite(prisma, s.id, "fav-d"), "not-found");
    assert.equal(await lifecycle.deleteShare(prisma, "", {}), "not-found");
  });

  await test("admin removal (no owner key) deletes any stored Share, including an expired one kept by a favorite", async () => {
    const s = await expired();
    await favorite(s.id, "fav-keeper");
    assert.equal(await lifecycle.deleteShare(prisma, s.id), "deleted");
    assert.deepEqual(await state(s.id), { exists: true, deleted: true, favorites: 0 });
    assert.equal(await lifecycle.deleteShare(prisma, `missing-${key("x")}`), "not-found");
  });

  await test("favorites of deleted Shares and of unpublished or deleted Content do not count toward the 30 limit", async () => {
    const v = key("visitor");
    for (let i = 0; i < 28; i += 1) await favorite((await share()).id, v);
    const legacyDeleted = await share({ deletedAt: new Date() }); // favorite left over from before this release
    await favorite(legacyDeleted.id, v);
    const draft = await content({ status: "draft" });
    const removed = await content({ status: "published", deletedAt: new Date() });
    const visible = await content({ status: "published" });
    await prisma.contentFavorite.createMany({ data: [draft, removed, visible].map((c) => ({ contentId: c.id, visitorKey: v })) });
    assert.equal(await visibleCount(v), 29, "28 visible Share favorites + 1 visible Content favorite");
    assert.equal(await lifecycle.addShareFavorite(prisma, (await share()).id, v), "saved", "30th visible favorite is accepted");
    assert.equal(await lifecycle.addShareFavorite(prisma, (await share()).id, v), "limit", "31st is refused");
    assert.equal(await visibleCount(v), 30);
  });

  await test("an expired Share can be favorited only by visitors who already favorited it", async () => {
    const s = await expired();
    await favorite(s.id, "early-fan");
    assert.equal(await lifecycle.addShareFavorite(prisma, s.id, "late-visitor"), "not-found");
    assert.equal(await lifecycle.addShareFavorite(prisma, s.id, "early-fan"), "saved", "repeat favorite stays saved");
    assert.equal(await prisma.shareFavorite.count({ where: { shareId: s.id } }), 1);
    const fresh = await share();
    assert.equal(await lifecycle.addShareFavorite(prisma, fresh.id, "late-visitor"), "saved", "a public Share can be favorited");
  });

  await test("deletion racing 20 simultaneous favorites always ends deleted with no favorites (3 rounds)", async () => {
    for (let round = 0; round < 3; round += 1) {
      const s = await share();
      // Requests start in array order; the delete starts after 5, 10 and 15 favorites.
      const calls = Array.from({ length: 20 }, (_, i) => () => lifecycle.addShareFavorite(prisma, s.id, `race-${round}-${i}`));
      calls.splice(5 + round * 5, 0, () => lifecycle.deleteShare(prisma, s.id, { ownerKey: s.ownerKey }));
      const outcomes = await Promise.all(calls.map((call) => call()));
      assert.ok(outcomes.includes("deleted"), "the delete succeeded");
      assert.ok(outcomes.every((o) => ["saved", "not-found", "deleted"].includes(o)), JSON.stringify(outcomes));
      assert.deepEqual(await state(s.id), { exists: true, deleted: true, favorites: 0 });
    }
  });

  await test("10 simultaneous favorites by one visitor with 25 visible stop at exactly 30", async () => {
    const v = key("parallel");
    for (let i = 0; i < 25; i += 1) await favorite((await share()).id, v);
    const targets = [];
    for (let i = 0; i < 10; i += 1) targets.push((await share()).id);
    const outcomes = await Promise.all(targets.map((id) => lifecycle.addShareFavorite(prisma, id, v)));
    assert.equal(outcomes.filter((o) => o === "saved").length, 5, JSON.stringify(outcomes));
    assert.equal(outcomes.filter((o) => o === "limit").length, 5);
    assert.equal(await visibleCount(v), 30);
  });

  await prisma.$disconnect();
  // The modules' own default client (src/lib/prisma.ts) was never used; close it as well.
  await require(path.join(OUT, "prisma.js")).prisma.$disconnect().catch(() => undefined);
  fs.rmSync(OUT, { recursive: true, force: true });
  const failed = results.filter((r) => !r.ok);
  console.log(`RESULT: ${failed.length === 0 ? "PASS" : "FAIL"} (${results.length - failed.length}/${results.length})`);
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(`ERROR: ${error && error.message ? error.message : error}`);
  process.exitCode = 2;
});
