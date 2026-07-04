import type { CheckIn } from "@/types";

export const mockCheckIns: CheckIn[] = [
  {
    id: "c1",
    userId: "u1",
    sermonId: "s6",
    listenedAt: "2024-12-08T18:00:00Z",
    progressPercent: 100,
    notes: "晚上散步时听完，觉得很受提醒。",
  },
  {
    id: "c2",
    userId: "u3",
    sermonId: "s6",
    listenedAt: "2024-12-09T07:30:00Z",
    progressPercent: 100,
  },
  {
    id: "c3",
    userId: "u4",
    sermonId: "s6",
    listenedAt: "2024-12-09T12:15:00Z",
    progressPercent: 78,
  },
  {
    id: "c4",
    userId: "u1",
    sermonId: "s1",
    listenedAt: "2024-11-03T17:45:00Z",
    progressPercent: 100,
    notes: "这篇信息很深，后来又重新听了一遍。",
  },
  {
    id: "c5",
    userId: "u3",
    sermonId: "s1",
    listenedAt: "2024-11-04T08:00:00Z",
    progressPercent: 100,
  },
  {
    id: "c6",
    userId: "u2",
    sermonId: "s3",
    listenedAt: "2024-11-17T20:00:00Z",
    progressPercent: 100,
  },
  {
    id: "c7",
    userId: "u4",
    sermonId: "s3",
    listenedAt: "2024-11-18T09:00:00Z",
    progressPercent: 100,
  },
  {
    id: "c8",
    userId: "u5",
    sermonId: "s5",
    listenedAt: "2024-12-01T11:00:00Z",
    progressPercent: 55,
  },
];