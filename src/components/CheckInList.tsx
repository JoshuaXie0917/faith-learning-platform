import type { CheckIn } from "@/types";
import { mockUsers } from "@/data/users";

interface CheckInListProps {
  checkIns: CheckIn[];
}

export function CheckInList({ checkIns }: CheckInListProps) {
  if (checkIns.length === 0) {
    return <p className="text-sm text-stone-400">还没有成员完成听道接龙。</p>;
  }

  return (
    <ul className="divide-y divide-stone-100">
      {checkIns.map((checkIn) => {
        const user = mockUsers.find((item) => item.id === checkIn.userId);

        const date = new Date(checkIn.listenedAt).toLocaleDateString("zh-CN", {
          month: "long",
          day: "numeric",
        });

        return (
          <li key={checkIn.id} className="flex items-center gap-3 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-600">
              {user?.avatarInitials ?? "?"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-800">
                {user?.name ?? "未知成员"}
              </p>
              <p className="text-xs text-stone-400">{date}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${checkIn.progressPercent}%` }}
                />
              </div>

              <span className="w-8 text-right text-xs text-stone-400">
                {checkIn.progressPercent}%
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}