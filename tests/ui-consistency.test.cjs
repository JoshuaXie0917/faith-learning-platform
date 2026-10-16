"use strict";
// Static regression checks for the member-facing UI (no database, no build):
// contrast classes, one h1 per page, pressed states and live regions, error states
// instead of "no content", copy rules, removed dead code, and the seed-script guard.
//
//   node tests/ui-consistency.test.cjs
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

const REPO = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(REPO, ...p.split("/")), "utf8");
const exists = (p) => fs.existsSync(path.join(REPO, ...p.split("/")));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(REPO, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(rel);
  }
  return out;
}
const sources = walk("src");
const tsx = sources.filter((f) => f.endsWith(".tsx"));

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, ok: false });
    console.log(`FAIL ${name}: ${String(error && error.message ? error.message : error).slice(0, 600)}`);
  }
}

// Class strings as written in JSX (string literals and template literals).
function classStrings(text) {
  return [...text.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{\s*"([^"]*)"\s*\})/g)].map((m) => m[1] ?? m[2] ?? m[3]);
}

test("no light-grey (stone-400) text except decorative icons and the dark footer", () => {
  const allowed = new Set(["src/components/FilterDisclosure.tsx", "src/components/SiteFooter.tsx"]);
  const offenders = tsx.filter((f) => !allowed.has(f) && /(?<![\w:-])text-stone-400\b/.test(read(f)));
  assert.deepEqual(offenders, []);
  // The one in FilterDisclosure is the aria-hidden chevron.
  assert.match(read("src/components/FilterDisclosure.tsx"), /aria-hidden="true"\s+className=\{`[^`]*text-stone-400/);
  // The footer's background is stone-950 (stone-400 is 7.8:1 there).
  assert.match(read("src/components/SiteFooter.tsx"), /bg-stone-950/);
});

test("no low-contrast pairs: red-500/600 text on red-50, stone-500 text on stone-100, red-500 asterisks", () => {
  const bad = [];
  for (const f of tsx) {
    for (const c of classStrings(read(f))) {
      if (/\bbg-red-50\b/.test(c) && /(?<![\w:-])text-red-(500|600)\b/.test(c)) bad.push(`${f}: ${c}`);
      if (/(?<![\w:-])bg-stone-100\b/.test(c) && /(?<![\w:-])text-stone-(400|500)\b/.test(c)) bad.push(`${f}: ${c}`);
    }
    if (/<span className="text-red-500">\*<\/span>/.test(read(f))) bad.push(`${f}: red-500 required marker`);
  }
  assert.deepEqual(bad, []);
});

test("every page renders at most one h1 (PageHeader counts as one)", () => {
  const pages = sources.filter((f) => /\/page\.tsx$/.test(f) || /\/(not-found|error)\.tsx$/.test(f));
  const over = pages.filter((f) => {
    const t = read(f);
    return (t.match(/<h1[\s>]/g) || []).length + (t.match(/<PageHeader\b/g) || []).length > 1;
  });
  assert.deepEqual(over, []);
  const share = read("src/app/sermons/share/[id]/page.tsx");
  assert.match(share, /<h2[^>]*>\s*\{share\.title\}\s*<\/h2>/, "Share title is an h2 under the page h1");
});

test("toggle buttons expose their state (aria-pressed)", () => {
  const sermons = read("src/app/sermons/page.tsx");
  assert.match(sermons, /aria-pressed=\{sidePanel === "my-shares"\}/);
  assert.match(sermons, /aria-pressed=\{sidePanel === "favorites"\}/);
  assert.match(sermons, /aria-pressed=\{isFavorite\}/);
  assert.match(sermons, /aria-pressed=\{isRead\}/);
  assert.match(read("src/app/sermons/shares/page.tsx"), /aria-pressed=\{share\.isFavorite\}/);
  assert.match(read("src/app/sermons/[id]/ReadButton.tsx"), /aria-pressed=\{isRead\}/);
  assert.match(read("src/components/FilterDisclosure.tsx"), /aria-expanded=\{isOpen\}/);
  assert.match(read("src/components/NavbarClient.tsx"), /aria-expanded=\{isMenuOpen\}/);
});

test("result messages are live regions that stay mounted", () => {
  for (const f of ["src/app/sermons/page.tsx", "src/app/sermons/shares/page.tsx", "src/app/sermons/[id]/ReadButton.tsx", "src/app/sermons/share/page.tsx", "src/app/sermons/share/[id]/page.tsx"]) {
    assert.match(read(f), /role="status"\s+aria-live="polite"/, f);
  }
});

test("form fields get a visible focus ring", () => {
  assert.match(read("src/app/globals.css"), /input:focus-visible,\s*select:focus-visible,\s*textarea:focus-visible\s*\{\s*outline: 2px solid #57534e;/);
});

test("load failures are errors with a retry, not an empty library", () => {
  for (const f of ["src/app/sermons/page.tsx", "src/app/dashboard/page.tsx"]) {
    const t = read(f);
    assert.match(t, /!response\.ok \|\| !data \|\| !Array\.isArray\(data\.contents\)/, `${f} checks /api/contents`);
    assert.match(t, /!response\.ok \|\| !data \|\| !Array\.isArray\(data\.shares\)/, `${f} checks /api/shares`);
    assert.match(t, /role="alert"/, f);
    assert.match(t, /重新加载/, f);
  }
  assert.match(read("src/app/sermons/shares/page.tsx"), /loadError \?/);
  const api = read("src/app/api/contents/route.ts");
  assert.match(api, /status: 500/);
  assert.match(api, /error instanceof Error \? error\.name/, "logs the error name only");
  assert.ok(exists("src/app/error.tsx") && exists("src/app/not-found.tsx"));
});

test("copy: 弟兄姊妹, no user-facing 数据库 or 待补充, login error names only the password", () => {
  const userFacing = tsx.filter((f) => !f.startsWith("src/lib/"));
  assert.deepEqual(userFacing.filter((f) => read(f).includes("兄弟姊妹")), []);
  assert.deepEqual(userFacing.filter((f) => /数据库/.test(read(f).replace(/\/\/.*$/gm, ""))), []);
  assert.deepEqual(sources.filter((f) => read(f).includes("待补充")), []);
  assert.ok(!read("src/app/api/auth/login/route.ts").includes("管理员姓名或密码不正确"));
});

test("admin forms: one save at a time, visible reasons, drafts and older series names kept", () => {
  const form = read("src/components/ContentEditorForm.tsx");
  assert.match(form, /useActionState\(action, INITIAL_CONTENT_FORM_STATE\)/);
  assert.match(form, /if \(submittingRef\.current \|\| isBusy\) return;/);
  assert.match(form, /disabled=\{isBusy\}/);
  assert.match(form, /role="alert"/);
  assert.match(form, /KEEP_LEGACY_SERIES/);
  for (const f of ["src/app/admin/sermons/new/page.tsx", "src/app/admin/sermons/[id]/edit/page.tsx"]) {
    const t = read(f);
    assert.match(t, /<ContentEditorForm/, f);
    assert.ok(!/status: "published"/.test(t), `${f} must not force the status`);
  }
  assert.match(read("src/app/admin/taxonomy/page.tsx"), /<SeriesCreateForm action=\{createSeries\} \/>/);
  assert.match(read("src/app/admin/taxonomy/[id]/page.tsx"), /<PendingSubmitButton/);
  assert.match(read("src/app/admin/sermons/page.tsx"), /softDeleteContent\(prisma, id\)/);
});

test("dead code removed and the stale Tailwind glob dropped", () => {
  for (const f of ["src/app/sermons/SermonsClient.tsx", "src/components/SermonCard.tsx", "src/components/CheckInList.tsx", "src/components/ReflectionCard.tsx", "src/components/RoleBadge.tsx", "src/data/sermons.ts", "src/types/index.ts"]) {
    assert.ok(!exists(f), f);
  }
  assert.ok(!read("tailwind.config.js").includes("src/pages"));
  assert.deepEqual(sources.filter((f) => /from ["']@\/(data|types)\//.test(read(f))), []);
});

test("prisma/seed.js refuses to run without confirmation or against a non-local database", () => {
  const run = (env) => spawnSync(process.execPath, [path.join(REPO, "prisma", "seed.js")], {
    cwd: REPO, encoding: "utf8", windowsHide: true, timeout: 60000,
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...env },
  });
  let r = run({ DATABASE_URL: "postgresql://u:p@localhost:5432/x" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Refusing to seed: set SEED_SAMPLE_DATA=local-only/);
  r = run({ SEED_SAMPLE_DATA: "local-only", DATABASE_URL: "postgresql://u:p@ep-example.us-east-2.aws.neon.tech/neondb" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /DATABASE_URL is not a database on this computer/);
});

const failed = results.filter((r) => !r.ok);
console.log(`RESULT: ${failed.length === 0 ? "PASS" : "FAIL"} (${results.length - failed.length}/${results.length})`);
process.exitCode = failed.length === 0 ? 0 : 1;
