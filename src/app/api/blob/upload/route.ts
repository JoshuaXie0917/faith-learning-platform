import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { verifyAdminSessionCookie } from "@/lib/adminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const UPLOAD_COMPLETED = "blob.upload-completed";

function unauthorized() {
  return NextResponse.json({ error: "未授权。" }, { status: 401 });
}

// Two callers use this route:
// - the admin's browser asks for an upload token: requires the admin session;
// - Vercel Blob reports a finished upload: no cookie, but handleUpload() verifies
//   the x-vercel-signature HMAC (keyed with BLOB_READ_WRITE_TOKEN) and rejects
//   unsigned or wrongly signed callbacks. A signature never authorizes token requests.
export async function POST(request: Request) {
  const isAdmin = verifyAdminSessionCookie(request.headers.get("cookie"));
  const hasSignature = Boolean(request.headers.get("x-vercel-signature"));

  if (!isAdmin && !hasSignature) {
    return unauthorized();
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "请求格式不正确。" }, { status: 400 });
  }

  const isCallback = body?.type === UPLOAD_COMPLETED;

  if (!isAdmin && !isCallback) {
    return unauthorized();
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async (pathname) => {
        return {
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            type: "resource-upload",
            pathname,
          }),
        };
      },

      onUploadCompleted: async ({ blob }) => {
        // Pathname and type only; the full public URL is not logged.
        console.log("Blob upload completed:", {
          pathname: blob.pathname,
          contentType: blob.contentType,
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    if (isCallback) {
      console.warn("Blob upload callback rejected.");
      return unauthorized();
    }

    const message = error instanceof Error ? error.message : "";
    console.error("Blob upload route failed:", message.replace(/https?:\/\/\S+/gi, "[url]").slice(0, 300));

    return NextResponse.json(
      { error: message || "文件上传失败，请稍后再试。" },
      { status: 400 }
    );
  }
}
