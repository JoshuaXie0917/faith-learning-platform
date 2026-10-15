import { Prisma, type PrismaClient } from "@prisma/client";
import { readJsonObject } from "./requestBody";
import { SHARE_BODY_MAX_BYTES, validateShareInput } from "./shareValidation";
import {
  getClientAddress,
  getThrottleSecret,
  hashClientAddress,
  pruneLoginThrottle,
  registerThrottledAttempt,
  SHARE_CREATE_POLICY,
} from "./loginThrottle";

// POST /api/shares. Relative imports only, so it can be tested against a disposable
// database without HTTP.
//
// Order: bounded body (413) -> field rules (400) -> per-browser lock -> repeated
// submission returns the existing Share -> per-address throttle (429) -> insert.
// Rejected requests never reach the database.

export const SHARE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
// The same browser posting the same title and text again within this window gets
// the first Share back instead of a duplicate (double clicks, retries).
export const SHARE_REPEAT_WINDOW_MS = 10 * 60 * 1000;

export type ShareCreateDeps = {
  prisma: PrismaClient;
  now?: () => Date;
  throttleSecret?: string;
};

export async function handleShareCreate(request: Request, deps: ShareCreateDeps): Promise<Response> {
  const body = await readJsonObject(request, SHARE_BODY_MAX_BYTES);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status });

  const input = validateShareInput(body.value);
  if (!input.ok) return Response.json({ error: input.error }, { status: 400 });

  const { visitorKey, name, title, content } = input.value;
  const now = deps.now ? deps.now() : new Date();
  const throttleKey = hashClientAddress(
    getClientAddress(request.headers),
    deps.throttleSecret ?? getThrottleSecret(),
    "share-create"
  );

  try {
    await pruneLoginThrottle(deps.prisma, now).catch(() => undefined);

    const result = await deps.prisma.$transaction(
      async (transaction) => {
        // One creation at a time per browser key, so a repeated submission sees the first.
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtextextended(${`share-create:${visitorKey}`}, 0)) IS NULL AS "locked"
        `;

        const previous = await transaction.share.findFirst({
          where: {
            ownerKey: visitorKey,
            title,
            content,
            deletedAt: null,
            createdAt: { gt: new Date(now.getTime() - SHARE_REPEAT_WINDOW_MS) },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        if (previous) return { kind: "repeated" as const, id: previous.id };

        const attempt = await registerThrottledAttempt(transaction, throttleKey, now, SHARE_CREATE_POLICY);
        if (!attempt.allowed) return { kind: "throttled" as const, retryAfterSeconds: attempt.retryAfterSeconds };

        const share = await transaction.share.create({
          data: {
            name,
            title,
            content,
            ownerKey: visitorKey,
            createdAt: now,
            expiresAt: new Date(now.getTime() + SHARE_LIFETIME_MS),
          },
          select: { id: true },
        });
        return { kind: "created" as const, id: share.id };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5000, timeout: 10000 }
    );

    if (result.kind === "throttled") {
      return Response.json(
        { error: "发布太频繁，请稍后再试。" },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
      );
    }

    return Response.json({ ok: true, shareId: result.id, ...(result.kind === "repeated" ? { repeated: true } : {}) });
  } catch (error) {
    // Error name and code only: Prisma messages can echo the submitted text and key.
    const detail =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? `${error.name} ${error.code}`
        : error instanceof Error
          ? error.name
          : "unknown error";
    console.error("发布分享失败：", detail);
    return Response.json({ error: "发布分享失败，请稍后再试。" }, { status: 500 });
  }
}
