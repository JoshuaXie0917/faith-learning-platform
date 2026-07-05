import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadButton } from "./ReadButton";
import { prisma } from "@/lib/prisma";
import {
  formatContentDate,
  getContentTypeLabel,
  parseJsonTextArray,
} from "@/lib/contentFormat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function getResourceLabel(contentType: string) {
  const labels: Record<string, string> = {
    recording: "打开录音资源",
    article: "查看文章资源",
    file: "查看文件资料",
    music: "打开音乐音频",
    image: "查看图片",
    link: "打开链接",
  };

  return labels[contentType] ?? "打开资源";
}

function isAudioResource(resourceUrl: string, contentType: string) {
  if (contentType === "recording" || contentType === "music") {
    return true;
  }

  try {
    const url = new URL(resourceUrl);
    return /\.(mp3|m4a|wav|ogg|aac)(\?.*)?$/i.test(url.pathname);
  } catch {
    return /\.(mp3|m4a|wav|ogg|aac)(\?.*)?$/i.test(resourceUrl);
  }
}

export default async function SermonDetailPage({ params }: Props) {
  const { id } = await params;

  const content = await prisma.content.findFirst({
    where: {
      id,
      status: "published",
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      contentType: true,
      speaker: true,
      series: true,
      scripture: true,
      contentBody: true,
      resourceUrl: true,
      date: true,
      duration: true,
      tagsText: true,
      viewCount: true,
      publishedAt: true,
    },
  });

  if (!content) {
    notFound();
  }

  const tags = parseJsonTextArray(content.tagsText);
  const resourceUrl = content.resourceUrl?.trim() ?? "";
  const hasAudioResource = resourceUrl
    ? isAudioResource(resourceUrl, content.contentType)
    : false;

  const allContents = await prisma.content.findMany({
    where: {
      status: "published",
      deletedAt: null,
    },
    orderBy: {
      date: "desc",
    },
    select: {
      id: true,
      title: true,
    },
  });

  const currentIndex = allContents.findIndex((item) => item.id === content.id);
  const previousContent = allContents[currentIndex - 1];
  const nextContent = allContents[currentIndex + 1];

  return (
    <div className="mx-auto w-full max-w-5xl pb-10">
      <Link
        href="/sermons"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-stone-500 transition hover:text-stone-800 sm:mb-6"
      >
        ← 返回真理集录
      </Link>

      <article className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-8">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
            {getContentTypeLabel(content.contentType)}
          </span>

          <span className="text-xs text-stone-400">
            {formatContentDate(content.date)}
          </span>

          {content.duration && (
            <span className="text-xs text-stone-400">{content.duration}</span>
          )}
        </div>

        {content.series && (
          <p className="mb-3 text-sm font-medium text-amber-700">
            {content.series}
          </p>
        )}

        <h1 className="mb-5 break-words text-2xl font-semibold leading-tight text-stone-900 sm:text-4xl">
          {content.title}
        </h1>

        <p className="mb-6 text-sm leading-8 text-stone-600 sm:mb-8 sm:text-base">
          {content.description}
        </p>

        <dl className="mb-6 grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm sm:mb-8 sm:grid-cols-2 sm:p-5">
          <div>
            <dt className="text-stone-400">作者 / 讲员</dt>
            <dd className="mt-1 break-words font-medium text-stone-800">
              {content.speaker ?? "未填写"}
            </dd>
          </div>

          <div>
            <dt className="text-stone-400">日期</dt>
            <dd className="mt-1 font-medium text-stone-800">
              {formatContentDate(content.date)}
            </dd>
          </div>

          <div>
            <dt className="text-stone-400">类型</dt>
            <dd className="mt-1 font-medium text-stone-800">
              {getContentTypeLabel(content.contentType)}
            </dd>
          </div>

          <div>
            <dt className="text-stone-400">经文 / 来源</dt>
            <dd className="mt-1 break-words font-medium text-stone-800">
              {content.scripture ?? "未填写"}
            </dd>
          </div>
        </dl>

        {tags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2 sm:mb-8">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {resourceUrl && (
          <section className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 sm:mb-8 sm:p-5">
            <h2 className="mb-3 text-lg font-semibold text-stone-900">
              资源内容
            </h2>

            {hasAudioResource && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-white p-4">
                <p className="mb-3 text-sm font-medium text-stone-700">
                  音频播放
                </p>

                <audio controls preload="metadata" className="w-full">
                  <source src={resourceUrl} />
                  你的浏览器不支持音频播放。
                </audio>
              </div>
            )}

            <p className="mb-4 break-all text-sm leading-7 text-stone-600">
              {resourceUrl}
            </p>

            <a
              href={resourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 sm:w-auto"
            >
              {hasAudioResource ? "在新页面打开音频" : getResourceLabel(content.contentType)}
            </a>
          </section>
        )}

        <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-stone-900 sm:text-xl">
            学习内容
          </h2>

          {content.contentBody ? (
            <div className="whitespace-pre-wrap break-words text-sm leading-8 text-stone-700">
              {content.contentBody}
            </div>
          ) : (
            <div className="space-y-5 text-sm leading-8 text-stone-700">
              <p>
                这是关于「{content.title}」的学习内容。当前先展示内容简介和基本信息。
              </p>

              <p>
                后续可以在管理员后台继续补充正文、音频链接、文件资料、图片资源或学习问题。
              </p>
            </div>
          )}
        </section>

        <div className="mt-6">
          <ReadButton contentId={content.id} />
        </div>
      </article>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-stone-900 sm:text-xl">
          继续学习
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {previousContent && (
            <Link
              href={`/sermons/${previousContent.id}`}
              className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md"
            >
              <p className="mb-2 text-xs text-stone-400">上一篇</p>
              <h3 className="line-clamp-2 font-semibold leading-6 text-stone-900">
                {previousContent.title}
              </h3>
            </Link>
          )}

          {nextContent && (
            <Link
              href={`/sermons/${nextContent.id}`}
              className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md"
            >
              <p className="mb-2 text-xs text-stone-400">下一篇</p>
              <h3 className="line-clamp-2 font-semibold leading-6 text-stone-900">
                {nextContent.title}
              </h3>
            </Link>
          )}

          <Link
            href="/sermons"
            className="block rounded-2xl border border-stone-200 bg-stone-900 p-5 text-white shadow-sm transition hover:bg-stone-800"
          >
            返回全部内容 →
          </Link>
        </div>
      </section>
    </div>
  );
}