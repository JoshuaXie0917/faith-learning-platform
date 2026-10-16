"use strict";
// Visible-copy check: the website's fixed user-facing text is Chinese only.
//
//   node tests/visible-copy.test.cjs
//
// Parses every file under src/ with the TypeScript compiler and collects the strings a visitor or admin
// can see or hear: JSX text, JSX attribute values (except technical attributes such as className, href,
// id or type), strings inside JSX expressions, UI properties (label, title, description, message, error,
// placeholder, ...), React state messages (setError("...")), errors thrown in browser code, and route
// handler error responses. A string fails if it contains a Latin-letter word that is not one of the few
// technical names users see as-is (file-format abbreviations and size units). Product names that have a
// natural Chinese word (Word, PowerPoint) are not allowed. Code identifiers, API paths, CSS
// classes, URLs, file names and developer logs are not user-facing copy and are not collected.
// The scheduled-job endpoints (/api/cron/*, answered only to Vercel's scheduler with CRON_SECRET) are
// machine interfaces, not pages, and are not scanned.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");

const REPO = path.resolve(__dirname, "..");
const ts = createRequire(path.join(REPO, "package.json"))("typescript");

// Names users see unchanged in Chinese software: file-format abbreviations and size units.
const ALLOWED_WORDS = new Set(["PDF", "JPG", "JPEG", "PNG", "WebP", "GIF", "MB", "KB", "GB"]);
// JSX attributes whose values are technical, never shown as text.
const TECHNICAL_ATTRIBUTES = new Set([
  "className", "id", "href", "src", "type", "name", "htmlFor", "key", "method", "action", "rel", "target", "encType",
  "role", "aria-controls", "aria-labelledby", "aria-describedby", "aria-live", "aria-current", "aria-haspopup",
  "aria-hidden", "aria-expanded", "aria-pressed", "aria-busy", "aria-invalid", "autoComplete", "inputMode", "accept",
  "style", "sizes", "srcSet", "lang", "dir", "form", "pattern", "mode", "fill", "viewBox", "stroke", "d", "xmlns",
  "strokeWidth", "strokeLinecap", "strokeLinejoin", "loading", "decoding", "referrerPolicy", "tabIndex", "rows", "cols",
  "min", "max", "step", "maxLength", "minLength", "width", "height", "colSpan", "rowSpan", "scope", "headers",
  "dateTime", "suppressHydrationWarning", "adminTitleHref", "handleUploadUrl", "initialResourceUrl", "initialImageUrl",
  "contentId", "activeValue", "value", "defaultValue", "preload", "controls",
]);
const MACHINE_ONLY_FILES = [/^src\/app\/api\/cron\//, /^src\/lib\/contentRetentionCleanup\.ts$/];
// Object properties that hold user-facing text.
const UI_PROPERTIES = new Set(["label", "title", "subtitle", "description", "message", "error", "placeholder", "heading", "text", "detail", "confirmLabel", "pendingLabel", "emptyText", "activeLabel"]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(REPO, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(tsx?|mts)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) out.push(rel);
  }
  return out;
}

function englishWords(text) {
  const cleaned = String(text)
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/(?<![\w/])(?:[\w.-]+\/)+[\w.-]+(?![\w/])/g, (m) => (/^[A-Za-z]+(\/[A-Za-z]+)+$/.test(m) && m.split("/").every((w) => ALLOWED_WORDS.has(w)) ? m : " "))
    .replace(/\b[\w-]+\.(mp3|m4a|wav|pdf|docx?|pptx?|txt|png|jpe?g|webp|gif)\b/gi, " ")
    .replace(/\$\{[^}]*\}/g, " ");
  return (cleaned.match(/[A-Za-z][A-Za-z+#.-]*[A-Za-z]|[A-Za-z]{2,}/g) || []).filter((w) => !ALLOWED_WORDS.has(w));
}

function collect(file) {
  const abs = path.join(REPO, file);
  const source = ts.createSourceFile(file, fs.readFileSync(abs, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const text = source.getFullText();
  const isClient = /^\s*["']use client["']/.test(text) || /Client\.ts$/.test(file);
  const isRoute = /\/route\.ts$/.test(file);
  const found = [];
  const add = (node, value) => {
    const words = englishWords(value);
    if (words.length) found.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, value: String(value).trim().slice(0, 120), words });
  };
  // All string pieces under a node (ternaries, ||, template literals), skipping technical JSX attributes and calls like cn().
  const strings = (node, allProps = false) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      // In message tables, single lowercase tokens are enum values ("ok", "warn"), not copy.
      if (allProps && /^[a-z][a-z0-9-]*$/.test(node.text)) return;
      return add(node, node.text);
    }
    if (ts.isTemplateExpression(node)) {
      add(node, node.head.text + node.templateSpans.map((s) => "${x}" + s.literal.text).join(""));
      node.templateSpans.forEach((s) => strings(s.expression, allProps));
      return;
    }
    // Message tables (CONTENT_MESSAGES = { titleRequired: "...", seriesDuplicate: (t) => `...` }): every value.
    if (allProps && ts.isObjectLiteralExpression(node)) {
      for (const p of node.properties) if (ts.isPropertyAssignment(p)) strings(p.initializer, true);
      return;
    }
    if (allProps && (ts.isArrowFunction(node) || ts.isFunctionExpression(node))) return strings(node.body, true);
    if (allProps && (ts.isAsExpression(node) || ts.isSatisfiesExpression?.(node) || ts.isParenthesizedExpression(node))) return strings(node.expression, true);
    if (ts.isJsxAttribute(node) && TECHNICAL_ATTRIBUTES.has(node.name.getText())) return;
    // Object literals: only their UI properties (not Prisma options, values, hrefs, ...).
    if (ts.isObjectLiteralExpression(node)) {
      for (const p of node.properties) if (ts.isPropertyAssignment(p) && UI_PROPERTIES.has(p.name.getText().replace(/["']/g, ""))) strings(p.initializer);
      return;
    }
    // Calls: only callbacks (items.map((x) => ...)), never plain arguments (filterHref("type", "all")).
    if (ts.isCallExpression(node)) {
      for (const a of node.arguments) if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) strings(a.body);
      return;
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) return;
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(node.operatorToken.kind)) return;
    ts.forEachChild(node, (child) => strings(child, allProps));
  };
  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const t = node.getText().replace(/\s+/g, " ").trim();
      if (t) add(node, t);
    } else if (ts.isJsxAttribute(node)) {
      if (!TECHNICAL_ATTRIBUTES.has(node.name.getText()) && node.initializer) strings(node.initializer);
      return;
    } else if (ts.isJsxExpression(node) && node.parent && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      if (node.expression) strings(node.expression);
    } else if (ts.isPropertyAssignment(node) && UI_PROPERTIES.has(node.name.getText().replace(/["']/g, ""))) {
      const v = node.initializer;
      const technical = ts.isStringLiteral(v) && /^(asc|desc)$/.test(v.text);
      if (!technical && !ts.isObjectLiteralExpression(v)) strings(v);
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression.getText();
      if (/^set[A-Z]\w*(Message|Error)$/.test(callee) || /^set(Message|Error)$/.test(callee)) node.arguments.forEach(strings);
      if (callee === "fail") node.arguments.forEach(strings);
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /[A-Z_]/.test(node.name.text) && /(LABEL|MESSAGES?|TEXT|TITLE|PLACEHOLDER)$/i.test(node.name.text) && node.initializer) {
      // Named copy constants: UPLOAD_TYPES_LABEL, CONTENT_MESSAGES, SHARE_CONTENT_LIMIT_MESSAGE, ...
      strings(node.initializer, true);
    } else if (ts.isNewExpression(node) && node.expression.getText() === "Error" && (isClient || isRoute)) {
      (node.arguments || []).forEach(strings);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function main() {
  const files = walk("src").filter((f) => !MACHINE_ONLY_FILES.some((re) => re.test(f)));
  const problems = files.flatMap(collect);
  for (const p of problems) console.log(`FOUND ${p.file}:${p.line} [${p.words.join(", ")}] ${JSON.stringify(p.value)}`);
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push(true);
      console.log(`PASS ${name}`);
    } catch (e) {
      results.push(false);
      console.log(`FAIL ${name}: ${String(e.message).slice(0, 300)}`);
    }
  };
  test(`no English in fixed user-facing text (${files.length} source files scanned)`, () => assert.deepEqual(problems.map((p) => `${p.file}:${p.line}`), []));
  test("the checker itself flags English and allows the technical names", () => {
    assert.deepEqual(englishWords("保存失败 Save failed"), ["Save", "failed"]);
    assert.deepEqual(englishWords("可以上传 JPG/PNG/WebP/GIF 图片、PDF、文档、演示文稿，单个文件最大 100MB。"), []);
    assert.deepEqual(englishWords("PDF、Word、PowerPoint"), ["Word", "PowerPoint"]);
    assert.deepEqual(englishWords("https://example.com/a.png 文件 resources/x.mp3"), []);
  });
  test("no browser-drawn controls in the browser's language: no confirm()/alert()/prompt(), no visible native file control", () => {
    const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
    const sources = walk("src").map((f) => [f, stripComments(fs.readFileSync(path.join(REPO, f), "utf8"))]);
    assert.deepEqual(sources.filter(([, t]) => /\bwindow\.(confirm|alert|prompt)\s*\(|(^|[^.\w])(confirm|alert|prompt)\s*\(/m.test(t)).map(([f]) => f), []);
    const fileInputs = sources.flatMap(([f, t]) => [...t.matchAll(/<input\b[^>]*type="file"[^>]*>/gs)].map((m) => [f, m[0]]));
    assert.ok(fileInputs.length > 0);
    assert.deepEqual(fileInputs.filter(([, tag]) => !/className="[^"]*\b(sr-only|hidden)\b/.test(tag)).map(([f]) => f), []);
  });
  test("the document language is Chinese and the page metadata is Chinese", () => {
    const layout = fs.readFileSync(path.join(REPO, "src/app/layout.tsx"), "utf8");
    assert.match(layout, /<html lang="zh-CN"/);
    assert.match(layout, /title: "四月花"/);
  });
  const failed = results.filter((r) => !r).length;
  console.log(`RESULT: ${failed === 0 ? "PASS" : "FAIL"} (${results.length - failed}/${results.length})`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main();
