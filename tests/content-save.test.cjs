"use strict";
// Regression tests for admin Content and Series saves (src/lib/contentForm.ts and
// src/lib/contentSave.ts): refused saves explain why, a double submission stores one
// Content, editing keeps a draft a draft and keeps an older free-text series name,
// a repeated delete keeps the first deletedAt, and search keywords follow renames.
//
//   TEST_DATABASE_URL=postgresql://...@127.0.0.1:<port>/<name>_test node tests/content-save.test.cjs
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
const OUT = path.join(REPO, "node_modules", ".cache", "flp-content-save-test");
const MINUTE = 60 * 1000;

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
    "--lib", "es2022,dom", "--skipLibCheck", "--strict", path.join(REPO, "src", "lib", "contentSave.ts"),
  ], { cwd: REPO, encoding: "utf8", windowsHide: true });
  if (r.status !== 0) throw new Error(`tsc failed:\n${r.stdout}${r.stderr}`);
}

function form(fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

async function main() {
  if (!TEST_URL) throw new Error("TEST_DATABASE_URL is required (a disposable local *_test database)");
  assertDisposable(TEST_URL);
  // The modules' default client must never see another database.
  process.env.DATABASE_URL = TEST_URL;

  compile();
  const F = require(path.join(OUT, "contentForm.js"));
  const S = require(path.join(OUT, "contentSave.js"));

  const migrate = spawnSync(process.execPath, [repoRequire.resolve("prisma/build/index.js"), "migrate", "deploy", "--schema", path.join(REPO, "prisma", "schema.prisma")], {
    cwd: REPO, encoding: "utf8", windowsHide: true, env: { ...process.env, DATABASE_URL: TEST_URL, CHECKPOINT_DISABLE: "1" },
  });
  if (migrate.status !== 0 || !/All migrations have been successfully applied|No pending migrations/.test(`${migrate.stdout}`)) throw new Error(`migrate deploy failed:\n${migrate.stdout}${migrate.stderr}`);

  const { PrismaClient } = repoRequire("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: TEST_URL, log: [] });
  const uid = (label) => `${label}-${crypto.randomBytes(5).toString("hex")}`;
  const valid = (overrides = {}) => {
    const values = { title: uid("标题"), contentType: "article", date: "2026-10-01", speaker: "", seriesId: "", resourceUrl: "", contentBody: "正文内容", tags: "安静，等候", ...overrides };
    const checked = F.validateContentForm(values, "2026-10-15");
    assert.equal(checked.ok, true, JSON.stringify(checked));
    return checked.value;
  };
  const series = (title = uid("系列"), data = {}) => prisma.series.create({ data: { title, titleKey: F.normalizeKey(title), ...data }, select: { id: true, title: true } });
  const countTitle = (title) => prisma.content.count({ where: { title } });

  try {
    await test("form rules: title, body, type and date are required and checked; empty date means today", () => {
      const base = { title: "t", contentType: "recording", date: "2026-10-01", speaker: "", seriesId: "", resourceUrl: "", contentBody: "b", tags: "" };
      assert.equal(F.validateContentForm({ ...base, title: "" }, "2026-10-15").error, F.CONTENT_MESSAGES.titleRequired);
      assert.equal(F.validateContentForm({ ...base, contentBody: "" }, "2026-10-15").error, F.CONTENT_MESSAGES.bodyRequired);
      assert.equal(F.validateContentForm({ ...base, contentType: "video" }, "2026-10-15").error, F.CONTENT_MESSAGES.typeInvalid);
      for (const d of ["2026-02-30", "2026-13-01", "26-10-01", "tomorrow"]) assert.equal(F.validateContentForm({ ...base, date: d }, "2026-10-15").error, F.CONTENT_MESSAGES.dateInvalid, d);
      assert.equal(F.validateContentForm({ ...base, date: "" }, "2026-10-15").value.date, "2026-10-15");
      const read = F.readContentForm(form({ title: "  空格  ", contentBody: " 正文 ", tags: "a, b、c" }));
      assert.equal(read.title, "空格");
      assert.equal(F.validateContentForm({ ...base, tags: "a, b、c" }, "2026-10-15").value.tagsText, JSON.stringify(["a", "b", "c"]));
      const long = "😀".repeat(130);
      assert.equal(F.summarize(long), `${"😀".repeat(120)}...`, "summary never cuts an emoji in half");
    });

    await test("create stores published Content with current search keywords", async () => {
      const s = await series();
      const input = valid({ speaker: "陈牧师", seriesId: s.id });
      const r = await S.createContentRecord(prisma, input);
      assert.equal(r.ok, true);
      const row = await prisma.content.findUnique({ where: { id: r.id } });
      assert.equal(row.status, "published");
      assert.ok(row.publishedAt);
      assert.equal(row.series, s.title);
      assert.equal(row.searchKeywordsText, JSON.stringify([input.title, "陈牧师", s.title]));
    });

    await test("a double submission stores one Content (sequential and concurrent)", async () => {
      const input = valid();
      const first = await S.createContentRecord(prisma, input);
      const second = await S.createContentRecord(prisma, input);
      assert.equal(second.ok, true);
      assert.equal(second.repeated, true);
      assert.equal(second.id, first.id);
      const parallel = valid({ speaker: uid("讲员") });
      const results2 = await Promise.all([1, 2, 3].map(() => S.createContentRecord(prisma, parallel)));
      assert.ok(results2.every((x) => x.ok));
      assert.equal(await countTitle(parallel.title), 1, "three simultaneous identical creates -> one row");
      assert.equal(await prisma.speaker.count({ where: { name: parallel.speaker } }), 1, "one new speaker");
      assert.equal(await countTitle(input.title), 1);
    });

    await test("the same Content after the repeat window, or with other text, is stored again", async () => {
      const input = valid();
      const t0 = new Date();
      await S.createContentRecord(prisma, input, t0);
      const later = await S.createContentRecord(prisma, input, new Date(t0.getTime() + S.CONTENT_REPEAT_WINDOW_MS + MINUTE));
      assert.equal(later.repeated, false);
      const other = await S.createContentRecord(prisma, { ...input, contentBody: "另一段正文" }, t0);
      assert.equal(other.repeated, false);
      assert.equal(await countTitle(input.title), 3);
    });

    await test("create refuses a disabled speaker or Series with a message and writes nothing", async () => {
      const name = uid("停用讲员");
      await prisma.speaker.create({ data: { name, nameKey: F.normalizeKey(name), deletedAt: new Date() } });
      // Matched like the stored key: case and repeated spaces do not matter.
      const a = valid({ speaker: name.toUpperCase() });
      let r = await S.createContentRecord(prisma, a);
      assert.equal(r.ok, false);
      assert.equal(r.error, F.CONTENT_MESSAGES.speakerDisabled(name));
      assert.equal(await countTitle(a.title), 0);
      const gone = await series(uid("已停用系列"), { deletedAt: new Date() });
      const b = valid({ seriesId: gone.id });
      r = await S.createContentRecord(prisma, b);
      assert.equal(r.error, F.CONTENT_MESSAGES.seriesInvalid);
      const c = valid({ seriesId: "does-not-exist" });
      r = await S.createContentRecord(prisma, c);
      assert.equal(r.error, F.CONTENT_MESSAGES.seriesInvalid);
      const d = valid({ seriesId: F.KEEP_LEGACY_SERIES });
      r = await S.createContentRecord(prisma, d);
      assert.equal(r.error, F.CONTENT_MESSAGES.seriesInvalid);
      assert.equal(await prisma.content.count({ where: { title: { in: [b.title, c.title, d.title] } } }), 0);
    });

    await test("editing a draft keeps it a draft (and unpublished)", async () => {
      const draft = await prisma.content.create({ data: { title: uid("草稿"), description: "d", date: "2026-10-01", status: "draft" }, select: { id: true } });
      const r = await S.updateContentRecord(prisma, draft.id, valid());
      assert.equal(r.ok, true);
      const row = await prisma.content.findUnique({ where: { id: draft.id } });
      assert.equal(row.status, "draft");
      assert.equal(row.publishedAt, null);
      const pub = await prisma.content.create({ data: { title: uid("已发布"), description: "d", date: "2026-10-01", status: "published", publishedAt: null }, select: { id: true } });
      await S.updateContentRecord(prisma, pub.id, valid());
      const pubRow = await prisma.content.findUnique({ where: { id: pub.id } });
      assert.equal(pubRow.status, "published");
      assert.ok(pubRow.publishedAt, "a published row without publishedAt gets one");
    });

    await test("editing older Content keeps its free-text series name unless another choice is made", async () => {
      const legacy = await prisma.content.create({ data: { title: uid("旧内容"), description: "d", date: "2026-10-01", status: "published", series: "旧系列名称" }, select: { id: true } });
      let r = await S.updateContentRecord(prisma, legacy.id, valid({ seriesId: F.KEEP_LEGACY_SERIES, title: "新标题" }));
      assert.equal(r.ok, true);
      let row = await prisma.content.findUnique({ where: { id: legacy.id } });
      assert.equal(row.series, "旧系列名称");
      assert.equal(row.seriesId, null);
      assert.equal(row.searchKeywordsText, JSON.stringify(["新标题", "旧系列名称"]));
      const s = await series();
      r = await S.updateContentRecord(prisma, legacy.id, valid({ seriesId: s.id }));
      row = await prisma.content.findUnique({ where: { id: legacy.id } });
      assert.equal(row.seriesId, s.id);
      assert.equal(row.series, s.title);
      r = await S.updateContentRecord(prisma, legacy.id, valid({ seriesId: F.KEEP_LEGACY_SERIES }));
      assert.equal(r.error, F.CONTENT_MESSAGES.seriesInvalid, "a linked Content cannot claim a legacy name");
      r = await S.updateContentRecord(prisma, legacy.id, valid({ seriesId: "" }));
      row = await prisma.content.findUnique({ where: { id: legacy.id } });
      assert.equal(row.series, null);
      assert.equal(row.seriesId, null);
    });

    await test("editing keeps a Series that was disabled later, but cannot move to one", async () => {
      const s = await series();
      const c = await S.createContentRecord(prisma, valid({ seriesId: s.id }));
      await prisma.series.update({ where: { id: s.id }, data: { deletedAt: new Date() } });
      let r = await S.updateContentRecord(prisma, c.id, valid({ seriesId: s.id, title: "改名" }));
      assert.equal(r.ok, true);
      assert.equal((await prisma.content.findUnique({ where: { id: c.id } })).seriesId, s.id);
      const other = await series(uid("另一停用"), { deletedAt: new Date() });
      r = await S.updateContentRecord(prisma, c.id, valid({ seriesId: other.id }));
      assert.equal(r.error, F.CONTENT_MESSAGES.seriesInvalid);
      assert.equal((await prisma.content.findUnique({ where: { id: c.id } })).seriesId, s.id, "unchanged after the refusal");
    });

    await test("editing refuses deleted or missing Content and disabled speakers, leaving the row unchanged", async () => {
      const del = await prisma.content.create({ data: { title: uid("已删除"), description: "d", date: "2026-10-01", deletedAt: new Date() }, select: { id: true, title: true } });
      let r = await S.updateContentRecord(prisma, del.id, valid());
      assert.equal(r.error, F.CONTENT_MESSAGES.contentMissing);
      assert.equal((await prisma.content.findUnique({ where: { id: del.id } })).title, del.title);
      r = await S.updateContentRecord(prisma, "missing-id", valid());
      assert.equal(r.error, F.CONTENT_MESSAGES.contentMissing);
      r = await S.updateContentRecord(prisma, "", valid());
      assert.equal(r.error, F.CONTENT_MESSAGES.contentMissing);
      const name = uid("停用");
      await prisma.speaker.create({ data: { name, nameKey: F.normalizeKey(name), deletedAt: new Date() } });
      const c = await S.createContentRecord(prisma, valid());
      const before = await prisma.content.findUnique({ where: { id: c.id } });
      r = await S.updateContentRecord(prisma, c.id, valid({ speaker: name, title: "不应保存" }));
      assert.equal(r.error, F.CONTENT_MESSAGES.speakerDisabled(name));
      assert.equal((await prisma.content.findUnique({ where: { id: c.id } })).title, before.title);
    });

    await test("deleting twice keeps the first deletedAt (the grace period is not restarted)", async () => {
      const c = await S.createContentRecord(prisma, valid());
      const t1 = new Date(Date.now() - 10 * MINUTE);
      assert.equal(await S.softDeleteContent(prisma, c.id, t1), "deleted");
      assert.equal(await S.softDeleteContent(prisma, c.id, new Date()), "already-deleted");
      assert.equal((await prisma.content.findUnique({ where: { id: c.id } })).deletedAt.getTime(), t1.getTime());
      assert.equal(await S.softDeleteContent(prisma, "missing-id"), "not-found");
      assert.equal(await S.softDeleteContent(prisma, ""), "not-found");
    });

    await test("new Series: empty and duplicate names are explained (including disabled and concurrent ones)", async () => {
      assert.equal((await S.createSeriesRecord(prisma, "   ")).error, F.CONTENT_MESSAGES.seriesTitleRequired);
      const title = uid("Series 名称");
      assert.equal((await S.createSeriesRecord(prisma, title)).ok, true);
      assert.equal((await S.createSeriesRecord(prisma, `  ${title.toUpperCase()}  `)).error, F.CONTENT_MESSAGES.seriesDuplicate(title));
      const off = await series(uid("停用系列"), { deletedAt: new Date() });
      assert.equal((await S.createSeriesRecord(prisma, off.title)).error, F.CONTENT_MESSAGES.seriesDuplicateDisabled(off.title));
      const race = uid("并发系列");
      const outcomes = await Promise.all([1, 2, 3].map(() => S.createSeriesRecord(prisma, race)));
      assert.equal(outcomes.filter((o) => o.ok).length, 1);
      assert.ok(outcomes.filter((o) => !o.ok).every((o) => o.error === F.CONTENT_MESSAGES.seriesDuplicate(race)));
      assert.equal(await prisma.series.count({ where: { title: race } }), 1);
    });

    await test("renaming a Series and assigning Content refresh search keywords", async () => {
      const s = await series("旧名称系列" + uid(""));
      const c1 = await S.createContentRecord(prisma, valid({ seriesId: s.id, speaker: "李长老" }));
      const c2 = await S.createContentRecord(prisma, valid({ seriesId: s.id }));
      const newTitle = uid("新名称系列");
      await prisma.$transaction(async (tx) => {
        await tx.series.update({ where: { id: s.id }, data: { title: newTitle, titleKey: F.normalizeKey(newTitle) } });
        assert.equal(await S.refreshSeriesContent(tx, s.id, newTitle), 2);
      });
      for (const id of [c1.id, c2.id]) {
        const row = await prisma.content.findUnique({ where: { id } });
        assert.equal(row.series, newTitle);
        assert.ok(JSON.parse(row.searchKeywordsText).includes(newTitle));
        assert.ok(!row.searchKeywordsText.includes(s.title), "old name gone");
      }
      const target = await series();
      const loose = await S.createContentRecord(prisma, valid({ speaker: "周弟兄" }));
      assert.equal(await S.assignContentToSeriesRecord(prisma, target.id, loose.id), true);
      const row = await prisma.content.findUnique({ where: { id: loose.id } });
      assert.equal(row.seriesId, target.id);
      assert.deepEqual(JSON.parse(row.searchKeywordsText), [row.title, "周弟兄", target.title]);
      await S.softDeleteContent(prisma, loose.id);
      assert.equal(await S.assignContentToSeriesRecord(prisma, target.id, loose.id), false, "deleted Content is not moved");
    });
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    results.push({ name: "setup", ok: false });
    console.log(`FAIL setup: ${String(error && error.message ? error.message : error).slice(0, 800)}`);
  })
  .finally(() => {
    fs.rmSync(OUT, { recursive: true, force: true });
    const failed = results.filter((r) => !r.ok);
    console.log(`RESULT: ${failed.length === 0 && results.length > 0 ? "PASS" : "FAIL"} (${results.length - failed.length}/${results.length})`);
    process.exitCode = failed.length === 0 && results.length > 0 ? 0 : 1;
  });
