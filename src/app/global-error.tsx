"use client";

// Last-resort error page (used only when the root layout itself fails), in place of the framework's
// English fallback. It replaces the whole document, so it brings its own <html> and plain styles.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#fafaf9", color: "#1c1917" }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "96px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>页面暂时无法打开</h1>
          <p role="alert" style={{ marginTop: 16, lineHeight: 1.8, color: "#57534e" }}>
            读取页面时出现问题，请稍后重试。
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ marginTop: 24, minHeight: 44, padding: "0 20px", border: 0, borderRadius: 9999, background: "#1c1917", color: "#fff", fontSize: 14, cursor: "pointer" }}
          >
            重试
          </button>
        </main>
      </body>
    </html>
  );
}
