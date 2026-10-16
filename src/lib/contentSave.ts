import { Prisma, type PrismaClient } from "@prisma/client";
import {
  CONTENT_MESSAGES,
  KEEP_LEGACY_SERIES,
  normalizeKey,
  searchKeywordsText,
  type ValidContent,
} from "./contentForm";

// Admin writes for Content and Series. Relative imports only, so the rules can be
// tested against a disposable database without HTTP (tests/content-save.test.cjs).
//
// - Every refused save returns a message instead of silently doing nothing.
// - Creates and edits run one at a time (transaction-scoped advisory lock), and
//   the same Content submitted again within CONTENT_REPEAT_WINDOW_MS is not stored
//   twice (double clicks, slow connections, retries).
// - An edit keeps the Content's status (a draft stays a draft) and, when asked,
//   an older free-text series name that has no linked Series.
// - search keywords always follow the current title, speaker and Series name.

export const CONTENT_REPEAT_WINDOW_MS = 2 * 60 * 1000;

type Db = PrismaClient | Prisma.TransactionClient;
type Failure = { ok: false; error: string };

async function lockContentSaves(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"content-save"}, 0)) IS NULL AS "locked"`;
}

async function resolveSpeaker(
  tx: Prisma.TransactionClient,
  name: string
): Promise<{ ok: true; speaker: { id: string; name: string } | null } | Failure> {
  if (!name) return { ok: true, speaker: null };
  const nameKey = normalizeKey(name);
  const existing = await tx.speaker.findUnique({ where: { nameKey }, select: { id: true, name: true, deletedAt: true } });
  if (existing?.deletedAt) return { ok: false, error: CONTENT_MESSAGES.speakerDisabled(existing.name) };
  if (existing) return { ok: true, speaker: { id: existing.id, name: existing.name } };
  const created = await tx.speaker.create({ data: { name, nameKey }, select: { id: true, name: true } });
  return { ok: true, speaker: created };
}

async function resolveActiveSeries(
  tx: Prisma.TransactionClient,
  seriesId: string
): Promise<{ ok: true; series: { id: string; title: string } | null } | Failure> {
  if (!seriesId) return { ok: true, series: null };
  const series = await tx.series.findUnique({ where: { id: seriesId }, select: { id: true, title: true, deletedAt: true } });
  if (!series || series.deletedAt) return { ok: false, error: CONTENT_MESSAGES.seriesInvalid };
  return { ok: true, series: { id: series.id, title: series.title } };
}

export async function createContentRecord(
  db: PrismaClient,
  input: ValidContent,
  now: Date = new Date()
): Promise<{ ok: true; id: string; repeated: boolean } | Failure> {
  return db.$transaction(async (tx) => {
    await lockContentSaves(tx);

    if (input.seriesId === KEEP_LEGACY_SERIES) return { ok: false as const, error: CONTENT_MESSAGES.seriesInvalid };
    const series = await resolveActiveSeries(tx, input.seriesId);
    if (!series.ok) return series;

    if (input.speaker) {
      const existing = await tx.speaker.findUnique({ where: { nameKey: normalizeKey(input.speaker) }, select: { name: true, deletedAt: true } });
      if (existing?.deletedAt) return { ok: false as const, error: CONTENT_MESSAGES.speakerDisabled(existing.name) };
    }

    const previous = await tx.content.findFirst({
      where: {
        title: input.title,
        contentType: input.contentType,
        date: input.date,
        contentBody: input.contentBody,
        seriesId: series.series?.id ?? null,
        resourceUrl: input.resourceUrl,
        deletedAt: null,
        createdAt: { gt: new Date(now.getTime() - CONTENT_REPEAT_WINDOW_MS) },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (previous) return { ok: true as const, id: previous.id, repeated: true };

    const speaker = await resolveSpeaker(tx, input.speaker);
    if (!speaker.ok) return speaker;

    const seriesTitle = series.series?.title ?? null;
    const created = await tx.content.create({
      data: {
        title: input.title,
        contentType: input.contentType,
        status: "published",
        date: input.date,
        description: input.description,
        speaker: speaker.speaker?.name ?? null,
        series: seriesTitle,
        speakerId: speaker.speaker?.id ?? null,
        seriesId: series.series?.id ?? null,
        scripture: null,
        duration: null,
        resourceUrl: input.resourceUrl,
        contentBody: input.contentBody,
        tagsText: input.tagsText,
        searchKeywordsText: searchKeywordsText(input.title, speaker.speaker?.name ?? null, seriesTitle),
        publishedAt: now,
        archivedAt: null,
        deletedAt: null,
        createdAt: now,
      },
      select: { id: true },
    });
    return { ok: true as const, id: created.id, repeated: false };
  });
}

export async function updateContentRecord(
  db: PrismaClient,
  id: string,
  input: ValidContent,
  now: Date = new Date()
): Promise<{ ok: true } | Failure> {
  if (!id) return { ok: false, error: CONTENT_MESSAGES.contentMissing };

  return db.$transaction(async (tx) => {
    await lockContentSaves(tx);

    const existing = await tx.content.findUnique({
      where: { id },
      select: { status: true, publishedAt: true, speakerId: true, speaker: true, seriesId: true, series: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt) return { ok: false as const, error: CONTENT_MESSAGES.contentMissing };

    let series: { id: string | null; title: string | null } | null = null;
    if (input.seriesId === KEEP_LEGACY_SERIES) {
      // Only an older Content with a series name but no linked Series can keep it.
      if (existing.seriesId || !existing.series?.trim()) return { ok: false as const, error: CONTENT_MESSAGES.seriesInvalid };
      series = { id: null, title: existing.series };
    } else if (input.seriesId && input.seriesId === existing.seriesId) {
      // Unchanged, even if that Series has since been disabled.
      series = { id: existing.seriesId, title: existing.series };
    } else if (input.seriesId) {
      const resolved = await resolveActiveSeries(tx, input.seriesId);
      if (!resolved.ok) return resolved;
      series = resolved.series;
    }

    let speaker: { id: string; name: string } | null = null;
    if (input.speaker) {
      if (existing.speakerId && existing.speaker && normalizeKey(input.speaker) === normalizeKey(existing.speaker)) {
        speaker = { id: existing.speakerId, name: existing.speaker };
      } else {
        const resolved = await resolveSpeaker(tx, input.speaker);
        if (!resolved.ok) return resolved;
        speaker = resolved.speaker;
      }
    }

    const updated = await tx.content.updateMany({
      where: { id, deletedAt: null },
      data: {
        title: input.title,
        contentType: input.contentType,
        // Kept as it is: editing a draft must not publish it.
        status: existing.status,
        date: input.date,
        description: input.description,
        speaker: speaker?.name ?? null,
        series: series?.title ?? null,
        speakerId: speaker?.id ?? null,
        seriesId: series?.id ?? null,
        resourceUrl: input.resourceUrl,
        contentBody: input.contentBody,
        tagsText: input.tagsText,
        searchKeywordsText: searchKeywordsText(input.title, speaker?.name ?? null, series?.title ?? null),
        publishedAt: existing.publishedAt ?? (existing.status === "published" ? now : null),
        archivedAt: null,
      },
    });
    if (updated.count !== 1) return { ok: false as const, error: CONTENT_MESSAGES.contentMissing };
    return { ok: true as const };
  });
}

// Deleting an already deleted Content keeps its first deletedAt, so the grace
// period before permanent cleanup is never restarted.
export async function softDeleteContent(db: Db, id: string, now: Date = new Date()): Promise<"deleted" | "already-deleted" | "not-found"> {
  if (!id) return "not-found";
  const result = await db.content.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: now } });
  if (result.count === 1) return "deleted";
  const row = await db.content.findUnique({ where: { id }, select: { id: true } });
  return row ? "already-deleted" : "not-found";
}

export async function createSeriesRecord(db: PrismaClient, rawTitle: string): Promise<{ ok: true; id: string; title: string } | Failure> {
  const title = rawTitle.trim();
  if (!title) return { ok: false, error: CONTENT_MESSAGES.seriesTitleRequired };
  const titleKey = normalizeKey(title);

  const existing = await db.series.findUnique({ where: { titleKey }, select: { title: true, deletedAt: true } });
  if (existing) {
    return {
      ok: false,
      error: existing.deletedAt ? CONTENT_MESSAGES.seriesDuplicateDisabled(existing.title) : CONTENT_MESSAGES.seriesDuplicate(existing.title),
    };
  }

  try {
    const created = await db.series.create({ data: { title, titleKey }, select: { id: true, title: true } });
    return { ok: true, id: created.id, title: created.title };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: CONTENT_MESSAGES.seriesDuplicate(title) };
    }
    throw error;
  }
}

// After a Series rename: the stored series name and the search keywords of its
// Content follow the new name.
export async function refreshSeriesContent(tx: Db, seriesId: string, seriesTitle: string) {
  const rows = await tx.content.findMany({ where: { seriesId }, select: { id: true, title: true, speaker: true } });
  for (const row of rows) {
    await tx.content.update({
      where: { id: row.id },
      data: { series: seriesTitle, searchKeywordsText: searchKeywordsText(row.title, row.speaker, seriesTitle) },
    });
  }
  return rows.length;
}

export async function assignContentToSeriesRecord(db: PrismaClient, seriesId: string, contentId: string): Promise<boolean> {
  if (!seriesId || !contentId) return false;
  return db.$transaction(async (tx) => {
    await lockContentSaves(tx);
    const [series, content] = await Promise.all([
      tx.series.findUnique({ where: { id: seriesId }, select: { id: true, title: true, deletedAt: true } }),
      tx.content.findUnique({ where: { id: contentId }, select: { id: true, title: true, speaker: true, deletedAt: true } }),
    ]);
    if (!series || series.deletedAt || !content || content.deletedAt) return false;
    await tx.content.update({
      where: { id: content.id },
      data: {
        seriesId: series.id,
        series: series.title,
        searchKeywordsText: searchKeywordsText(content.title, content.speaker, series.title),
      },
    });
    return true;
  });
}
