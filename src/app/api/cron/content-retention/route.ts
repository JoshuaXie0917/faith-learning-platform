import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { handleContentRetentionRequest } from "@/lib/contentRetentionCleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function HEAD() {
  return new Response(null, { status: 405, headers: { Allow: "GET" } });
}

export async function GET(request: Request) {
  return handleContentRetentionRequest(request, {
    prisma,
    env: {
      CRON_SECRET: process.env.CRON_SECRET,
      CONTENT_RETENTION_DELETE_ENABLED: process.env.CONTENT_RETENTION_DELETE_ENABLED,
      CONTENT_RETENTION_DELETE_NOT_BEFORE: process.env.CONTENT_RETENTION_DELETE_NOT_BEFORE,
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    },
    deleteBlob: (url, options) => del(url, options),
  });
}
