const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const users = [
  { name: "林姊妹", nameKey: "林姊妹", role: "member" },
  { name: "陈同工", nameKey: "陈同工", role: "member" },
  { name: "周弟兄", nameKey: "周弟兄", role: "member" },
  { name: "王弟兄", nameKey: "王弟兄", role: "member" },
  { name: "李长老", nameKey: "李长老", role: "member" },
];

const contents = [
  {
    id: "s1",
    title: "在安静中等候",
    contentType: "recording",
    status: "published",
    speaker: "陈牧师",
    series: "安静中的学习",
    description:
      "在不确定和忙碌之中，安静不是空白，而是重新聆听、重新整理内心的开始。本篇信息帮助我们学习在安静中等候，并在等候中重新建立信靠。",
    scripture: "诗篇 46:10",
    contentBody:
      "这是一篇关于在安静中等候的学习内容。后续可以在这里放完整讲道整理、音频说明和学习问题。",
    resourceUrl: "",
    date: "2026-06-03",
    duration: "42 分钟",
    tagsText: JSON.stringify(["安静", "等候", "信靠"]),
    searchKeywordsText: JSON.stringify([
      "录音",
      "讲道录音",
      "音频",
      "mp3",
      "audio",
      "安静",
      "等候",
    ]),
    coverColor: "#7c6f64",
    viewCount: 214,
    publishedAt: new Date("2026-06-03T00:00:00.000Z"),
  },
  {
    id: "s2",
    title: "恩典中的成长",
    contentType: "article",
    status: "published",
    speaker: "陈牧师",
    series: "安静中的学习",
    description:
      "真正持久的成长，不只是外在行为的改变，更是内心深处被恩典塑造。本篇信息思想生命成长的根基，以及如何在日常生活中结出真实的果子。",
    scripture: "耶利米书 17:7-8",
    contentBody:
      "这是一篇文章类型的学习内容。后续可以在这里放完整文章正文。",
    resourceUrl: "",
    date: "2026-06-10",
    duration: "38 分钟",
    tagsText: JSON.stringify(["恩典", "成长", "生命"]),
    searchKeywordsText: JSON.stringify([
      "文章",
      "阅读",
      "文稿",
      "文字",
      "article",
      "恩典",
      "成长",
    ]),
    coverColor: "#6b7c5c",
    viewCount: 189,
    publishedAt: new Date("2026-06-10T00:00:00.000Z"),
  },
  {
    id: "s3",
    title: "彼此相爱与同行",
    contentType: "recording",
    status: "published",
    speaker: "李长老",
    series: "群体与同行",
    description:
      "信仰从来不是孤立的旅程。我们被呼召在群体中彼此担当、彼此扶持。本篇信息帮助我们思想如何在真实关系中学习相爱与同行。",
    scripture: "加拉太书 6:2",
    contentBody:
      "这是一篇录音类型内容。后续可以加入音频链接和逐字稿。",
    resourceUrl: "",
    date: "2026-06-17",
    duration: "45 分钟",
    tagsText: JSON.stringify(["相爱", "群体", "同行"]),
    searchKeywordsText: JSON.stringify([
      "录音",
      "讲道录音",
      "音频",
      "mp3",
      "audio",
      "群体",
      "同行",
    ]),
    coverColor: "#7a6b8a",
    viewCount: 301,
    publishedAt: new Date("2026-06-17T00:00:00.000Z"),
  },
  {
    id: "s4",
    title: "在软弱中经历够用的恩典",
    contentType: "file",
    status: "published",
    speaker: "陈牧师",
    series: "群体与同行",
    description:
      "有些恩典不是在我们最强的时候显明，而是在我们承认有限、来到尽头的时候被看见。本篇信息思想软弱、倚靠与够用的恩典。",
    scripture: "哥林多后书 12:9",
    contentBody:
      "这是一份文件类型学习资料。后续可以上传 PDF、报告或附件。",
    resourceUrl: "/files/grace-in-weakness.pdf",
    date: "2026-06-24",
    duration: "40 分钟",
    tagsText: JSON.stringify(["软弱", "恩典", "倚靠"]),
    searchKeywordsText: JSON.stringify([
      "文件",
      "资料",
      "附件",
      "pdf",
      "文档",
      "报告",
      "软弱",
      "恩典",
    ]),
    coverColor: "#7a5c5c",
    viewCount: 267,
    publishedAt: new Date("2026-06-24T00:00:00.000Z"),
  },
  {
    id: "s5",
    title: "重新学习安息",
    contentType: "music",
    status: "draft",
    speaker: "王弟兄",
    series: "",
    description:
      "在一个强调效率和产出的时代，安息提醒我们：人的价值不是由忙碌定义的。本篇信息从安息的角度思想信靠、节奏与生命的恢复。",
    scripture: "出埃及记 20:8-11",
    contentBody:
      "这是一条音乐音频类型的草稿内容。当前还没有发布。",
    resourceUrl: "",
    date: "2026-06-28",
    duration: "36 分钟",
    tagsText: JSON.stringify(["安息", "恢复", "节奏"]),
    searchKeywordsText: JSON.stringify([
      "音乐",
      "诗歌",
      "敬拜",
      "歌曲",
      "music",
      "song",
      "安息",
    ]),
    coverColor: "#5c6b7a",
    viewCount: 178,
    publishedAt: null,
  },
  {
    id: "s6",
    title: "在盼望中持守信心",
    contentType: "link",
    status: "archived",
    speaker: "陈牧师",
    series: "盼望中的等候",
    description:
      "等候不是消极停留，而是在盼望中持续仰望。本篇信息帮助我们思想如何在漫长的过程里持守信心，并在每日生活中学习忠心。",
    scripture: "路加福音 1:45",
    contentBody:
      "这是一条链接类型内容，当前处于下架状态。",
    resourceUrl: "https://example.com/hope-study",
    date: "2026-06-30",
    duration: "44 分钟",
    tagsText: JSON.stringify(["盼望", "等候", "信心"]),
    searchKeywordsText: JSON.stringify([
      "链接",
      "网址",
      "外部链接",
      "url",
      "link",
      "盼望",
      "信心",
    ]),
    coverColor: "#6b5c4a",
    viewCount: 392,
    publishedAt: new Date("2026-06-30T00:00:00.000Z"),
    archivedAt: new Date("2026-07-01T00:00:00.000Z"),
  },
];

async function main() {
  console.log("开始导入用户...");

  const createdUsers = [];

  for (const user of users) {
    const savedUser = await prisma.user.upsert({
      where: { nameKey: user.nameKey },
      update: {
        name: user.name,
        role: user.role,
      },
      create: user,
    });

    createdUsers.push(savedUser);
  }

  console.log(`用户导入完成：${createdUsers.length} 个`);

  console.log("开始导入内容...");

  for (const content of contents) {
    await prisma.content.upsert({
      where: { id: content.id },
      update: content,
      create: content,
    });
  }

  console.log(`内容导入完成：${contents.length} 条`);

  console.log("开始导入已读记录...");

  const publishedContentIds = ["s1", "s2", "s3", "s4"];

  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];

    for (const contentId of publishedContentIds.slice(0, i + 1)) {
      await prisma.contentRead.upsert({
        where: {
          contentId_userId: {
            contentId,
            userId: user.id,
          },
        },
        update: {},
        create: {
          contentId,
          userId: user.id,
        },
      });
    }
  }

  console.log("已读记录导入完成");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });