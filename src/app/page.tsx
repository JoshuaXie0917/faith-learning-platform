import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#faf5ef] text-stone-800">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-45"
        style={{ backgroundImage: "url('/images/shepherd-bg.png')" }}
      />

      <div className="absolute inset-0 bg-[#faf5ef]/75" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <header className="mb-24 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            四月花
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/about"
              className="rounded-full border border-stone-200 bg-white/70 px-5 py-2 text-sm text-stone-700 shadow-sm backdrop-blur transition hover:bg-white"
            >
              关于平台
            </Link>

            <Link
              href="/login"
              className="rounded-full bg-stone-950 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              管理员登录
            </Link>
          </nav>
        </header>

        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex rounded-full border border-amber-200 bg-white/70 px-4 py-1.5 text-sm text-amber-700 shadow-sm backdrop-blur">
            内部学习与分享空间
          </div>

          <h1 className="mb-5 text-5xl font-bold tracking-tight text-stone-950 sm:text-6xl">
            四月花
          </h1>

          <p className="mb-8 text-xl text-stone-700">
            你们必晓得真理，真理必叫你们得以自由。
          </p>

          <p className="mx-auto mb-10 max-w-2xl leading-8 text-stone-600">
            这里用于整理学习内容、记录分享，并帮助弟兄姊妹在学习中彼此同行。
            普通成员可以直接进入学习平台；管理员可以登录后台管理内容。
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-full bg-stone-950 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              进入学习平台
            </Link>

            <a
              href="#about"
              className="rounded-full border border-stone-200 bg-white/70 px-7 py-3 text-sm font-semibold text-stone-700 shadow-sm backdrop-blur transition hover:bg-white"
            >
              查看平台说明
            </a>
          </div>
        </section>

        <section id="about" className="mt-24 grid gap-5 md:grid-cols-3">
          {[
            {
              title: "整理内容",
              description:
                "集中整理录音、文章、文件、音乐音频、图片和链接，方便大家持续学习与回顾。",
            },
            {
              title: "记录分享",
              description:
                "成员可以写下自己的学习分享，彼此鼓励，也帮助自己沉淀所学。",
            },
            {
              title: "彼此同行",
              description:
                "通过学习、收藏、已读记录和分享，让大家知道彼此正在一起走这条学习的路。",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-stone-200 bg-white/75 p-6 shadow-sm backdrop-blur"
            >
              <h2 className="mb-4 text-lg font-bold text-stone-950">
                {item.title}
              </h2>
              <p className="text-sm leading-7 text-stone-600">
                {item.description}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}