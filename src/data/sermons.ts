import type { Sermon } from "@/types";

export const mockSermons: Sermon[] = [
  {
    id: "s1",
    title: "在安静中等候",
    speaker: "陈牧师",
    series: "安静中的学习",
    description:
      "在不确定和忙碌之中，安静不是空白，而是重新聆听、重新整理内心的开始。本篇信息帮助我们学习在安静中等候，并在等候中重新建立信靠。",
    scripture: "诗篇 46:10",
    date: "2024-11-03",
    duration: "42 分钟",
    tags: ["安静", "等候", "信靠"],
    coverColor: "#7c6f64",
    viewCount: 214,
    featured: false,

    contentType: "recording",
    searchKeywords: ["录音", "讲道录音", "音频", "mp3", "audio", "安静", "等候"],
  },
  {
    id: "s2",
    title: "恩典中的成长",
    speaker: "陈牧师",
    series: "安静中的学习",
    description:
      "真正持久的成长，不只是外在行为的改变，更是内心深处被恩典塑造。本篇信息思想生命成长的根基，以及如何在日常生活中结出真实的果子。",
    scripture: "耶利米书 17:7-8",
    date: "2024-11-10",
    duration: "38 分钟",
    tags: ["恩典", "成长", "生命"],
    coverColor: "#6b7c5c",
    viewCount: 189,
    featured: false,

    contentType: "article",
    searchKeywords: ["文章", "阅读", "文稿", "文字", "article", "恩典", "成长"],
  },
  {
    id: "s3",
    title: "彼此相爱与同行",
    speaker: "李长老",
    series: "群体与同行",
    description:
      "信仰从来不是孤立的旅程。我们被呼召在群体中彼此担当、彼此扶持。本篇信息帮助我们思想如何在真实关系中学习相爱与同行。",
    scripture: "加拉太书 6:2",
    date: "2024-11-17",
    duration: "45 分钟",
    tags: ["相爱", "群体", "同行"],
    coverColor: "#7a6b8a",
    viewCount: 301,
    featured: false,

    contentType: "recording",
    searchKeywords: ["录音", "讲道录音", "音频", "mp3", "audio", "群体", "同行"],
  },
  {
    id: "s4",
    title: "在软弱中经历够用的恩典",
    speaker: "陈牧师",
    series: "群体与同行",
    description:
      "有些恩典不是在我们最强的时候显明，而是在我们承认有限、来到尽头的时候被看见。本篇信息思想软弱、倚靠与够用的恩典。",
    scripture: "哥林多后书 12:9",
    date: "2024-11-24",
    duration: "40 分钟",
    tags: ["软弱", "恩典", "倚靠"],
    coverColor: "#7a5c5c",
    viewCount: 267,
    featured: false,

    contentType: "file",
    resourceUrl: "/files/grace-in-weakness.pdf",
    searchKeywords: ["文件", "资料", "附件", "pdf", "文档", "报告", "软弱", "恩典"],
  },
  {
    id: "s5",
    title: "重新学习安息",
    speaker: "王弟兄",
    description:
      "在一个强调效率和产出的时代，安息提醒我们：人的价值不是由忙碌定义的。本篇信息从安息的角度思想信靠、节奏与生命的恢复。",
    scripture: "出埃及记 20:8-11",
    date: "2024-12-01",
    duration: "36 分钟",
    tags: ["安息", "恢复", "节奏"],
    coverColor: "#5c6b7a",
    viewCount: 178,
    featured: false,

    contentType: "music",
    searchKeywords: ["音乐", "诗歌", "敬拜", "歌曲", "music", "song", "安息", "恢复"],
  },
  {
    id: "s6",
    title: "在盼望中持守信心",
    speaker: "陈牧师",
    series: "盼望中的等候",
    description:
      "等候不是消极停留，而是在盼望中持续仰望。本篇信息帮助我们思想如何在漫长的过程里持守信心，并在每日生活中学习忠心。",
    scripture: "路加福音 1:45",
    date: "2024-12-08",
    duration: "44 分钟",
    tags: ["盼望", "等候", "信心"],
    coverColor: "#6b5c4a",
    viewCount: 392,
    featured: false,

    contentType: "link",
    resourceUrl: "https://example.com/hope-study",
    searchKeywords: ["链接", "网址", "外部链接", "url", "link", "盼望", "信心"],
  },
];