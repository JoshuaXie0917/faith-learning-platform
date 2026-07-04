import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#faf5ef] text-stone-800">
      {/* 牧羊背景 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
        style={{ backgroundImage: "url('/images/shepherd-bg.png')" }}
      />

      {/* 柔和遮罩 */}
      <div className="absolute inset-0 bg-[#faf5ef]/45" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        <header className="mb-20 flex items-center justify-between">
          <Link
            href="/"
            className="rounded-full border border-stone-200 bg-white/70 px-5 py-2 text-sm text-stone-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-stone-950"
          >
            返回首页
          </Link>

          <Link
            href="/login"
            className="rounded-full bg-stone-950 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
          >
            进入平台
          </Link>
        </header>

        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex rounded-full border border-amber-200 bg-white/70 px-4 py-1.5 text-sm text-amber-700 shadow-sm backdrop-blur">
            关于四月花
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight text-stone-950 sm:text-5xl">
            为了更认真地学习，也为了更安静地追求真理
          </h1>

          <p className="mx-auto max-w-2xl text-base leading-8 text-stone-700">
            四月花不是一个热闹的平台，而是一个安静的内部学习空间。它帮助成员整理内容、记录思考、回顾所得，并在长期学习中彼此提醒、彼此同行。
          </p>
        </section>

        <section className="mt-20 grid gap-5 md:grid-cols-3">
          {[
            {
              title: "整理知识",
              description:
                "零散的内容如果不被整理，很容易随着时间淡去。把主题、日期、讲员和学习资料集中保存，是为了让每一次学习都能被重新查找、再次思考。",
            },
            {
              title: "记录思考",
              description:
                "学习不只是听见信息，也包括分辨、消化和回应。写下心得，是把外在内容转化为内在理解的过程。",
            },
            {
              title: "彼此同行",
              description:
                "一个人学习容易松散，彼此提醒则更容易坚持。记录和分享不是为了表现自己，而是为了让大家知道，我们正在一起走这条追求真理的路。",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-stone-200 bg-white/75 p-6 shadow-sm backdrop-blur"
            >
              <h2 className="mb-4 text-lg font-bold text-stone-950">
                {item.title}
              </h2>
              <p className="text-sm leading-7 text-stone-700">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        <section className="mx-auto mt-16 max-w-4xl rounded-3xl border border-stone-200 bg-white/75 p-8 shadow-sm backdrop-blur">
          <h2 className="mb-5 text-2xl font-bold text-stone-950">
            学习的目的
          </h2>

          <div className="space-y-5 text-sm leading-8 text-stone-700">
            <p>
              学习不是为了堆积信息，也不是为了让人显得懂得更多。真正有价值的学习，会让人更清醒、更谦卑，也更有分辨力。知识若只是停在头脑里，很容易变成负担；但经过反复思想、认真记录和实际操练，它就会慢慢成为生命中的光。
            </p>

            <p>
              古人说：“学而不思则罔，思而不学则殆。”学习和思想不能分开。只听不想，容易流于表面；只想不学，又容易陷入自己的有限。四月花希望帮助成员在听、读、想、记之间建立一种稳定的节奏。
            </p>

            <p>
              《礼记》中说：“博学之，审问之，慎思之，明辨之，笃行之。”这句话很适合描述这个平台的方向：广泛学习，认真提问，安静思考，清楚分辨，最后落实在真实生活中。
            </p>
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-4xl rounded-3xl border border-stone-200 bg-white/75 p-8 shadow-sm backdrop-blur">
          <h2 className="mb-5 text-2xl font-bold text-stone-950">
            为什么要记录
          </h2>

          <div className="space-y-5 text-sm leading-8 text-stone-700">
            <p>
              人很容易忘记自己曾经被什么提醒，也容易忘记自己曾经明白过什么。记录不是形式，而是一种对学习的尊重。它帮助我们把短暂的感动沉淀下来，把模糊的想法写清楚，把零散的收获整理成可以回看的路径。
            </p>

            <p>
              陆游有句诗：“纸上得来终觉浅，绝知此事要躬行。”知识如果只是停在纸面，就仍然浅；但如果能被思想、记录、讨论，并在生活中慢慢实践，它才会真正进入人心。
            </p>

            <p>
              因此，四月花中的听道接龙、学习记录和心得分享，都不是为了增加负担，而是为了帮助成员看见自己的学习轨迹，也看见大家正在一同前行。
            </p>
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-4xl rounded-3xl border border-stone-200 bg-white/75 p-8 shadow-sm backdrop-blur">
          <h2 className="mb-5 text-2xl font-bold text-stone-950">
            平台会继续做什么
          </h2>

          <div className="space-y-5 text-sm leading-8 text-stone-700">
            <p>
              第一版主要完成内容浏览、学习记录、心得分享和后台管理。之后可以继续加入真实账号、数据库、内容上传、权限管理、搜索筛选和学习统计。
            </p>

            <p>
              它的目标不是复杂，而是清楚；不是热闹，而是持久。像朱熹所说：“问渠那得清如许？为有源头活水来。”学习也需要活水，需要不断回到源头，不断更新理解。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}