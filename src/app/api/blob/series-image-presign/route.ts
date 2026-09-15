import { issueSignedToken, parseStoreIdFromDelegationToken, presignUrl } from "@vercel/blob";
import { NextResponse } from "next/server";
import { verifyAdminSessionCookie } from "@/lib/adminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const URL_VALID_FOR_MS = 10 * 60 * 1000;

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const extensionByContentType: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    if (!verifyAdminSessionCookie(request.headers.get("cookie"))) {
      return jsonError("未授权。", 401);
    }

    const body = await request.json();

    const contentType =
      typeof body.contentType === "string" ? body.contentType.trim().toLowerCase() : "";
    const size = typeof body.size === "number" ? body.size : Number(body.size);

    if (!allowedImageTypes.has(contentType)) {
      return jsonError("只支持 JPG、PNG 或 WebP 图片。", 400);
    }

    if (!Number.isInteger(size) || size <= 0 || size > MAX_IMAGE_SIZE) {
      return jsonError("图片不能超过 10MB。", 400);
    }

    const pathname = `series-images/${crypto.randomUUID()}${extensionByContentType[contentType]}`;
    const validUntil = Date.now() + URL_VALID_FOR_MS;

    const signedToken = await issueSignedToken({
      pathname,
      operations: ["put"],
      validUntil,
      allowedContentTypes: [contentType],
      maximumSizeInBytes: size,
    });

    const { presignedUrl } = await presignUrl(signedToken, {
      operation: "put",
      pathname,
      access: "public",
      validUntil,
      allowedContentTypes: [contentType],
      maximumSizeInBytes: size,
      allowOverwrite: false,
    });

    const storeId = parseStoreIdFromDelegationToken(signedToken.delegationToken);
    const blobUrl = `https://${storeId}.public.blob.vercel-storage.com/${pathname}`;

    return NextResponse.json({
      presignedUrl,
      blobUrl,
      pathname,
    });
  } catch (error) {
    console.error("Series image presign failed:", error);

    return jsonError(
      error instanceof Error ? error.message : "图片上传授权失败，请稍后再试。",
      500
    );
  }
}
