import type { User } from "@/types";

export const mockUsers: User[] = [
  {
    id: "u1",
    name: "陈同工",
    email: "chen@example.com",
    role: "admin",
    avatarInitials: "陈",
    joinedAt: "2023-01-15",
    bio: "负责平台内容整理与成员管理。",
  },
  {
    id: "u2",
    name: "李姊妹",
    email: "li@example.com",
    role: "editor",
    avatarInitials: "李",
    joinedAt: "2023-06-03",
    bio: "协助整理讲道资料和学习内容。",
  },
  {
    id: "u3",
    name: "周弟兄",
    email: "zhou@example.com",
    role: "member",
    avatarInitials: "周",
    joinedAt: "2024-03-20",
    bio: "愿意在学习中记录和分享所得。",
  },
  {
    id: "u4",
    name: "林姊妹",
    email: "lin@example.com",
    role: "member",
    avatarInitials: "林",
    joinedAt: "2024-09-11",
    bio: "参与听道学习与小组分享。",
  },
  {
    id: "u5",
    name: "王弟兄",
    email: "wang@example.com",
    role: "guest",
    avatarInitials: "王",
    joinedAt: "2025-01-05",
    bio: "正在了解平台内容。",
  },
];

export const currentUser = mockUsers[0];