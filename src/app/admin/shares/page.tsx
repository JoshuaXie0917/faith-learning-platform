import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { deleteShare, normalizeShareId } from "@/lib/shareLifecycle";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIST_LIMIT = 100;
const EXCERPT_CHARACTERS = 160;

type Props = {
  searchParams: Promise<{ status?: string | string[] }>;
};

const statusMessages: Record<string, { text: string; tone: "ok" | "warn" }> = {
  removed: { text: "分享已删除，已不再公开显示，相关收藏也已移除。", tone: "ok" },
  missing: { text: "这条分享不存在或已经被删除。", tone: "warn" },
  error: { text: "删除分享失败，请稍后再试。", tone: "warn" },
};

const dateTimeFormat = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "America/Halifax",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function excerpt(text: string) {
  const characters = Array.from(text.replace(/\s+/g, " ").trim());
  return characters.length > EXCERPT_CHARACTERS
    ? `${characters.slice(0, EXCERPT_CHARACTERS).join("")}…`
    : characters.join("");
}

async function removeShare(formData: FormData) {
  "use server";

  await requireAdmin();

  const id = normalizeShareId(formData.get("id"));
  let status: "removed" | "missing" | "error";

  try {
    status = (await deleteShare(prisma, id)) === "deleted" ? "removed" : "missing";
  } catch (error) {
    console.error("管理员删除分享失败：", error instanceof Error ? error.name : "unknown error");
    status = "error";
  }

  revalidatePath("/admin/shares");
  revalidatePath("/sermons/shares");
  redirect(`/admin/shares?status=${status}`);
}

export default async function AdminSharesPage({ searchParams }: Props) {
  await requireAdmin();

  const params = await searchParams;
  const statusKey = typeof params.status === "string" ? params.status : "";
  const statusMessage = statusMessages[statusKey];
  const now = new Date();

  const [shares, storedCount] = await Promise.all([
    prisma.share.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
      select: {
        id: true,
        name: true,
        title: true,
        content: true,
        createdAt: true,
        expiresAt: true,
        _count: { select: { favorites: true } },
      },
    }),
    prisma.share.count({ where: { deletedAt: null } }),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="分享管理"
        subtitle="查看访客发布的分享。删除后立即不再公开显示，收藏也会一并移除，存储的文字会在下一次自动清理时永久删除。"
      />

      {statusMessage && (
        <p
          role="status"
          className={`mb-6 rounded-2xl px-4 py-3 text-sm leading-6 ${statusMessage.tone === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-amber-200 bg-amber-50 text-amber-900"
            }`}
        >
          {statusMessage.text}
        </p>
      )}

      <p className="mb-4 text-sm text-stone-600">
        当前存储的分享：{storedCount} 条
        {storedCount > shares.length ? `（显示最新 ${shares.length} 条）` : ""}
      </p>

      {shares.length === 0 ? (
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-center text-sm leading-7 text-stone-700 shadow-sm">
          目前没有存储的分享。
        </div>
      ) : (
        <ul className="space-y-4">
          {shares.map((share) => {
            const isPublic = share.expiresAt.getTime() > now.getTime();
            const favoriteCount = share._count.favorites;

            return (
              <li
                key={share.id}
                className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-base font-semibold text-stone-900">
                      {share.title}
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">
                      {share.name} · 发布于 {dateTimeFormat.format(share.createdAt)}
                    </p>
                    <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-stone-700">
                      {excerpt(share.content)}
                    </p>
                    <p className="mt-3 text-sm text-stone-600">
                      {isPublic
                        ? `公开展示至 ${dateTimeFormat.format(share.expiresAt)}`
                        : "已过公开展示时间，仅收藏者可见"}
                      {` · 收藏 ${favoriteCount} 次`}
                    </p>
                  </div>

                  <form action={removeShare} className="w-full sm:w-28 sm:shrink-0">
                    <input type="hidden" name="id" value={share.id} />
                    <ConfirmSubmitButton
                      label="删除"
                      title="删除分享"
                      message={
                        favoriteCount > 0
                          ? `确定要删除这条分享吗？删除后立即不再公开显示，${favoriteCount} 个收藏也会一并移除。`
                          : "确定要删除这条分享吗？删除后立即不再公开显示。"
                      }
                      detail={share.title}
                      confirmLabel="确认删除"
                      pendingLabel="正在删除..."
                      className="w-full rounded-lg border border-red-200 bg-white px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 max-lg:min-h-11"
                    />
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
