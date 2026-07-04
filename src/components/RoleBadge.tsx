import type { UserRole } from "@/types";

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  admin: {
    label: "管理员",
    className: "border-amber-200 bg-amber-100 text-amber-800",
  },
  editor: {
    label: "同工",
    className: "border-stone-300 bg-stone-100 text-stone-700",
  },
  member: {
    label: "成员",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  guest: {
    label: "游客",
    className: "border-blue-200 bg-blue-50 text-blue-600",
  },
};

export function RoleBadge({ role }: { role: UserRole }) {
  const config = roleConfig[role];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}