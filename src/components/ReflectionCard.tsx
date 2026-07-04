import type { Reflection, User } from "@/types";
import { mockUsers } from "@/data/users";

interface ReflectionCardProps {
  reflection: Reflection;
  showSermon?: boolean;
}

export function ReflectionCard({ reflection }: ReflectionCardProps) {
  const author = mockUsers.find((user) => user.id === reflection.userId) as
    | User
    | undefined;

  const date = new Date(reflection.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
      <p className="text-sm leading-relaxed text-stone-700">
        “{reflection.content}”
      </p>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-stone-800">
          {author?.avatarInitials ?? "?"}
        </div>

        <span className="text-xs text-stone-500">
          {author?.name ?? "匿名成员"} · {date}
        </span>

        {reflection.isPrivate && (
          <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-400">
            仅自己可见
          </span>
        )}
      </div>
    </div>
  );
}