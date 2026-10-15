import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { verifyAdminSessionCookie } from "@/lib/adminSession";
import { ALLOWED_UPLOAD_CONTENT_TYPES, MAX_UPLOAD_BYTES } from "@/lib/uploadPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_COMPLETED = "blob.upload-completed";
const TOKEN_VALID_FOR_MS = 15 * 60 * 1000;

// The admin form names files resources/<random UUID><extension>.
const UPLOAD_PATHNAME = /^resources\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[A-Za-z0-9]{1,10})?$/;

class UploadRequestError extends Error {}

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
        if (!UPLOAD_PATHNAME.test(pathname)) {
          throw new UploadRequestError("invalid pathname");
        }

        return {
          allowedContentTypes: ALLOWED_UPLOAD_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          validUntil: Date.now() + TOKEN_VALID_FOR_MS,
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

    if (error instanceof UploadRequestError) {
      return NextResponse.json({ error: "上传请求无效，请重新选择文件。" }, { status: 400 });
    }

    // Details go to the server log only (URLs removed); the browser gets a fixed message.
    const message = error instanceof Error ? error.message : "";
    console.error("Blob upload route failed:", message.replace(/https?:\/\/\S+/gi, "[url]").slice(0, 300));

    return NextResponse.json(
      { error: "文件上传授权失败，请稍后再试。" },
      { status: 400 }
    );
  }
}
