import Link from "next/link";

const confessionItems = [
  {
    title: "威斯敏斯特信仰告白",
    subtitle: "Westminster Confession of Faith",
    description: "内容待补充",
  },
  {
    title: "威斯敏斯特大要理问答",
    subtitle: "Westminster Larger Catechism",
    description: "内容待补充",
  },
  {
    title: "威斯敏斯特小要理问答",
    subtitle: "Westminster Shorter Catechism",
    description: "内容待补充",
  },
];

const churchItems = [
  {
    title: "教会治理",
    subtitle: "Presbyterian Church Government",
    description: "内容待补充",
  },
  {
    title: "公共敬拜",
    subtitle: "Directory for Public Worship",
    description: "内容待补充",
  },
];

const doctrineItems = [
  "圣经",
  "三一上帝",
  "上帝的预旨",
  "创造与护理",
  "人的堕落与罪",
  "圣约",
  "基督与中保",
  "有效恩召",
  "称义",
  "成圣",
  "得救的信心",
  "圣徒坚忍",
  "上帝的律法",
  "基督徒自由",
  "敬拜与主日",
  "教会",
  "圣礼",
  "洗礼",
  "圣餐",
  "复活与最后审判",
];

const historyItems = [
  {
    title: "苏格兰信条",
    subtitle: "Scots Confession",
  },
  {
    title: "苏格兰国家圣约",
    subtitle: "National Covenant",
  },
  {
    title: "庄严同盟与圣约",
    subtitle: "Solemn League and Covenant",
  },
];

export default function AboutPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#faf5ef] text-stone-800">
      {/* 牧羊背景 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-55"
        style={{ backgroundImage: "url('/images/shepherd-bg.png')" }}
      />

      {/* 柔和遮罩 */}
      <div className="absolute inset-0 bg-[#faf5ef]/65" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        {/* 顶部导航 */}
        <header className="mb-20 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-full border border-stone-200 bg-white/75 px-5 py-2 text-sm text-stone-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-stone-950"
          >
            返回首页
          </Link>

          <Link
            href="/dashboard"
            className="rounded-full bg-stone-950 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
          >
            进入学习中心
          </Link>
        </header>

        {/* 页面标题 */}
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex rounded-full border border-amber-200 bg-white/75 px-4 py-1.5 text-sm text-amber-700 shadow-sm backdrop-blur">
            Statement of Faith
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight text-stone-950 sm:text-5xl">
            信仰立场
          </h1>

          <p className="mx-auto max-w-2xl text-base leading-8 text-stone-700">
            本页面用于整理本平台所持守的信仰标准、要理问答、教会治理、
            敬拜原则与相关历史文献。
          </p>
        </section>

        {/* 信仰标准 */}
        <section className="mt-20">
          <div className="mb-7">
            <p className="mb-2 text-sm font-medium tracking-wider text-amber-700">
              CONFESSIONAL STANDARDS
            </p>

            <h2 className="text-2xl font-bold text-stone-950 sm:text-3xl">
              信仰标准
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
              这里将整理主要信仰告白与要理问答。
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {confessionItems.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur"
              >
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-amber-700">
                  {item.subtitle}
                </p>

                <h3 className="text-xl font-bold text-stone-950">
                  {item.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-stone-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 教会治理与敬拜 */}
        <section className="mt-16">
          <div className="mb-7">
            <p className="mb-2 text-sm font-medium tracking-wider text-amber-700">
              CHURCH & WORSHIP
            </p>

            <h2 className="text-2xl font-bold text-stone-950 sm:text-3xl">
              教会治理与敬拜
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {churchItems.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur"
              >
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-amber-700">
                  {item.subtitle}
                </p>

                <h3 className="text-xl font-bold text-stone-950">
                  {item.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-stone-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 教义主题 */}
        <section className="mt-16 rounded-3xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="mb-7">
            <p className="mb-2 text-sm font-medium tracking-wider text-amber-700">
              DOCTRINE
            </p>

            <h2 className="text-2xl font-bold text-stone-950 sm:text-3xl">
              教义主题
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
              后续可以按照教义主题逐步整理对应的信条章节、要理问答和学习资料。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {doctrineItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-stone-200 bg-[#faf7f2] px-4 py-3 text-sm font-medium text-stone-700"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* 历史文献 */}
        <section className="mt-16">
          <div className="mb-7">
            <p className="mb-2 text-sm font-medium tracking-wider text-amber-700">
              HISTORICAL DOCUMENTS
            </p>

            <h2 className="text-2xl font-bold text-stone-950 sm:text-3xl">
              历史文献
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
              这里可以逐步整理苏格兰改革宗与长老会传统中的重要历史文献。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {historyItems.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-stone-200 bg-white/75 p-5 shadow-sm backdrop-blur"
              >
                <h3 className="font-semibold text-stone-950">
                  {item.title}
                </h3>

                <p className="mt-2 text-xs leading-6 text-stone-500">
                  {item.subtitle}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 后续内容区域 */}
        <section className="mx-auto mt-16 max-w-4xl rounded-3xl border border-dashed border-stone-300 bg-white/55 p-8 text-center backdrop-blur">
          <h2 className="text-xl font-bold text-stone-950">
            信仰立场内容将持续整理
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-stone-600">
            后续可在以上分类中逐步加入正式文本、问答、解释与相关学习资料。
          </p>
        </section>
      </div>
    </main>
  );
}