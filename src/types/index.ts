import type { ContentType } from "@/data/contentTypes";
export type UserRole = "guest" | "member" | "editor" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
  joinedAt: string;
  bio?: string;
}

export type Sermon = {
  id: string;
  title: string;
  speaker: string;
  series?: string;
  description: string;
  scripture: string;
  date: string;
  duration: string;
  tags: string[];
  coverColor: string;
  viewCount: number;
  featured: boolean;

  contentType: ContentType;
  resourceUrl?: string;
  searchKeywords?: string[];
};

export interface Reflection {
  id: string;
  userId: string;
  sermonId: string;
  content: string;
  createdAt: string;
  isPrivate: boolean;
}

export interface CheckIn {
  id: string;
  userId: string;
  sermonId: string;
  listenedAt: string;
  progressPercent: number;
  notes?: string;
}
