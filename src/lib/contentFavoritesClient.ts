const LEGACY_CONTENT_FAVORITES_KEY = "favoriteSermonIds";
const CONTENT_FAVORITES_LOCK_NAME = "faith-content-favorites";

type ContentFavoritesResponse = {
  favoriteContentIds?: unknown;
  savedContentIds?: unknown;
  limitReached?: unknown;
  error?: string;
};

export type ContentFavoritesLoadResult = {
  favoriteContentIds: string[];
  limitReached: boolean;
};

let fallbackFavoriteOperationQueue: Promise<void> = Promise.resolve();

function normalizeContentIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.filter((item): item is string => typeof item === "string" && Boolean(item))
    )
  );
}

export function readLegacyContentFavoriteIds() {
  try {
    const savedValue = localStorage.getItem(LEGACY_CONTENT_FAVORITES_KEY);

    if (!savedValue) return [];

    return normalizeContentIds(JSON.parse(savedValue));
  } catch {
    return [];
  }
}

function savePendingLegacyContentFavoriteIds(contentIds: string[]) {
  if (contentIds.length === 0) {
    localStorage.removeItem(LEGACY_CONTENT_FAVORITES_KEY);
    return;
  }

  localStorage.setItem(
    LEGACY_CONTENT_FAVORITES_KEY,
    JSON.stringify(contentIds)
  );
}

function withBrowserFavoriteLock<T>(operation: () => Promise<T>) {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(CONTENT_FAVORITES_LOCK_NAME, operation);
  }

  const queuedOperation = fallbackFavoriteOperationQueue.then(
    operation,
    operation
  );

  fallbackFavoriteOperationQueue = queuedOperation.then(
    () => undefined,
    () => undefined
  );

  return queuedOperation;
}

async function readResponse(response: Response, allowPartialLimit = false) {
  const data = (await response.json().catch(() => null)) as ContentFavoritesResponse | null;
  const isPartialLimitResponse =
    allowPartialLimit && response.status === 409 && Boolean(data);

  if ((!response.ok && !isPartialLimitResponse) || !data) {
    throw new Error(data?.error ?? "读取内容收藏失败，请稍后再试。");
  }

  return {
    favoriteContentIds: normalizeContentIds(data.favoriteContentIds),
    savedContentIds: normalizeContentIds(data.savedContentIds),
    limitReached: data.limitReached === true,
  };
}

export async function loadAndMigrateContentFavorites(visitorKey: string) {
  return withBrowserFavoriteLock<ContentFavoritesLoadResult>(async () => {
    const legacyContentIds = readLegacyContentFavoriteIds();
    const response = await fetch(
      legacyContentIds.length > 0
        ? "/api/contents/favorites"
        : `/api/contents/favorites?visitorKey=${encodeURIComponent(visitorKey)}`,
      legacyContentIds.length > 0
        ? {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              visitorKey,
              contentIds: legacyContentIds,
            }),
          }
        : undefined
    );
    const result = await readResponse(response, true);
    const savedContentIds = new Set(result.savedContentIds);
    const pendingLegacyContentIds = legacyContentIds.filter(
      (contentId) => !savedContentIds.has(contentId)
    );

    savePendingLegacyContentFavoriteIds(pendingLegacyContentIds);

    return {
      favoriteContentIds: Array.from(
        new Set([...result.favoriteContentIds, ...pendingLegacyContentIds])
      ),
      limitReached: result.limitReached,
    };
  });
}

export async function setContentFavorite(
  visitorKey: string,
  contentId: string,
  isFavorite: boolean
) {
  return withBrowserFavoriteLock(async () => {
    const response = await fetch("/api/contents/favorites", {
      method: isFavorite ? "POST" : "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        isFavorite
          ? {
              visitorKey,
              contentIds: [contentId],
            }
          : {
              visitorKey,
              contentId,
            }
      ),
    });
    const result = await readResponse(response);
    const pendingLegacyContentIds = readLegacyContentFavoriteIds().filter(
      (legacyContentId) => legacyContentId !== contentId
    );

    savePendingLegacyContentFavoriteIds(pendingLegacyContentIds);

    return Array.from(
      new Set([...result.favoriteContentIds, ...pendingLegacyContentIds])
    );
  });
}
