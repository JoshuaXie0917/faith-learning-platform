"use strict";
// Regression tests for request hardening that needs no database: admin session
// expiry cap (src/lib/adminSession.ts), the upload content-type policy
// (src/lib/uploadPolicy.ts) and the visitor-key header (src/lib/visitorKeyHeader.ts).
//
//   node tests/security-hardening.test.cjs
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createRequire } = require("node:module");

const REPO = path.resolve(__dirname, "..");
const repoRequire = createRequire(path.join(REPO, "package.json"));
const OUT = path.join(REPO, "node_modules", ".cache", "flp-security-test");

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

function compile() {
  fs.rmSync(OUT, { recursive: true, force: true });
  const lib = (f) => path.join(REPO, "src", "lib", f);
  const r = spawnSync(process.execPath, [
    repoRequire.resolve("typescript/bin/tsc"), "--outDir", OUT, "--rootDir", path.join(REPO, "src", "lib"),
    "--module", "commonjs", "--target", "es2022", "--moduleResolution", "node", "--esModuleInterop",
    "--lib", "es2022,dom", "--skipLibCheck", "--strict", "--types", "node",
    lib("adminSession.ts"), lib("uploadPolicy.ts"), lib("visitorKeyHeader.ts"),
  ], { cwd: REPO, encoding: "utf8", windowsHide: true });
  if (r.status !== 0) throw new Error(`tsc failed:\n${r.stdout}${r.stderr}`);
}

function main() {
  compile();
  process.env.ADMIN_PASSWORD = `test-${crypto.randomBytes(12).toString("hex")}`;
  const session = require(path.join(OUT, "adminSession.js"));
  const upload = require(path.join(OUT, "uploadPolicy.js"));
  const visitor = require(path.join(OUT, "visitorKeyHeader.js"));

  const now = () => Math.floor(Date.now() / 1000);
  const mint = (expiresAt, secret = process.env.ADMIN_PASSWORD) =>
    `${expiresAt}.${crypto.createHmac("sha256", secret).update(String(expiresAt)).digest("hex")}`;

  test("a session token issued by the server is accepted", () => {
    assert.equal(session.verifyAdminSessionToken(session.createAdminSessionToken()), true);
    assert.equal(session.verifyAdminSessionToken(mint(now() + 3600)), true);
  });

  test("a validly signed token with an expiry beyond the 8-hour session is refused", () => {
    const max = session.ADMIN_SESSION_MAX_AGE_SECONDS;
    assert.equal(session.verifyAdminSessionToken(mint(now() + max + 30)), true, "within one minute of skew");
    assert.equal(session.verifyAdminSessionToken(mint(now() + max + 120)), false);
    assert.equal(session.verifyAdminSessionToken(mint(now() + 10 * 365 * 24 * 3600)), false, "10-year token");
  });

  test("expired, tampered, wrongly signed and malformed tokens are refused", () => {
    assert.equal(session.verifyAdminSessionToken(mint(now() - 1)), false);
    const valid = mint(now() + 3600);
    assert.equal(session.verifyAdminSessionToken(valid.slice(0, -1) + (valid.endsWith("0") ? "1" : "0")), false);
    assert.equal(session.verifyAdminSessionToken(mint(now() + 3600, "another-secret")), false);
    for (const bad of ["", "abc", "1.2.3", `${now() + 60}.zz`, null]) assert.equal(session.verifyAdminSessionToken(bad), false);
  });

  test("uploads allow audio, common images, PDF, Word, PowerPoint and text only", () => {
    for (const ok of ["audio/mpeg", "audio/x-m4a", "audio/wav", "AUDIO/MPEG", "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain"]) {
      assert.equal(upload.isAllowedUploadType(ok), true, ok);
    }
    for (const bad of ["", "text/html", "image/svg+xml", "application/javascript", "text/javascript", "application/x-msdownload",
      "application/octet-stream", "application/zip", "audiox/mpeg", "image/jpeg2"]) {
      assert.equal(upload.isAllowedUploadType(bad), false, bad);
    }
    assert.equal(upload.MAX_UPLOAD_BYTES, 100 * 1024 * 1024);
    assert.ok(!upload.ALLOWED_UPLOAD_CONTENT_TYPES.some((t) => /html|svg|javascript|octet|zip/.test(t)));
  });

  test("the visitor key travels in a header; the query parameter is only a fallback", () => {
    assert.deepEqual(visitor.visitorKeyHeaders("3f1c-key"), { "X-Visitor-Key": "3f1c-key" });
    assert.deepEqual(visitor.visitorKeyHeaders(""), {});
    assert.deepEqual(visitor.visitorKeyHeaders("非ASCII"), {}, "never throws in fetch()");
    assert.deepEqual(visitor.visitorKeyHeaders("x".repeat(121)), {});
    const req = (url, headers = {}) => new Request(url, { headers });
    assert.equal(visitor.requestVisitorKey(req("http://h/api/shares?visitorKey=q", { "X-Visitor-Key": "h" })), "h");
    assert.equal(visitor.requestVisitorKey(req("http://h/api/shares?visitorKey=q")), "q");
    assert.equal(visitor.requestVisitorKey(req("http://h/api/shares?visitorKey=q", { "X-Visitor-Key": "  " })), "q");
    assert.equal(visitor.requestVisitorKey(req("http://h/api/shares")), "");
  });

  fs.rmSync(OUT, { recursive: true, force: true });
  const failed = results.filter((r) => !r.ok);
  console.log(`RESULT: ${failed.length === 0 ? "PASS" : "FAIL"} (${results.length - failed.length}/${results.length})`);
  process.exitCode = failed.length === 0 ? 0 : 1;
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error && error.message ? error.message : error}`);
  process.exitCode = 2;
}
