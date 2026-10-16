"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { AudioBlobUploadField } from "@/components/AudioBlobUploadField";
import {
  CONTENT_TYPE_OPTIONS,
  INITIAL_CONTENT_FORM_STATE,
  KEEP_LEGACY_SERIES,
  type ContentFormState,
  type ContentFormValues,
} from "@/lib/contentForm";

type SeriesOption = { id: string; title: string };

type ContentEditorFormProps = {
  action: (state: ContentFormState, formData: FormData) => Promise<ContentFormState>;
  mode: "create" | "edit";
  contentId?: string;
  initial: ContentFormValues;
  seriesOptions: SeriesOption[];
  // Edit only: the current Series when it has been disabled since.
  disabledSeries?: SeriesOption | null;
  // Edit only: an older free-text series name with no linked Series.
  legacySeriesTitle?: string | null;
  isDraft?: boolean;
};

const inputClass =
  "w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-600 max-md:text-base";
const dateInputClass =
  "w-[190px] max-w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-600 [color-scheme:light] max-md:text-base";
const textareaClass =
  "w-full resize-none rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-600 max-md:text-base";

// Create and edit form for Content.
// - The save button is disabled while saving (and while a file is uploading), and a
//   second submit is ignored until the first one has finished.
// - A refused save shows its reason and keeps everything already typed: the
//   submission runs in a transition instead of the form's default action, so React
//   does not reset the fields. Without JavaScript the form still posts normally and
//   the page renders the message with the submitted values.
export function ContentEditorForm({
  action,
  mode,
  contentId,
  initial,
  seriesOptions,
  disabledSeries = null,
  legacySeriesTitle = null,
  isDraft = false,
}: ContentEditorFormProps) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_CONTENT_FORM_STATE);
  const [, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const submittingRef = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const values = state.values ?? initial;
  const isBusy = isPending || isUploading;

  useEffect(() => {
    submittingRef.current = false;
    if (state.error) errorRef.current?.focus();
  }, [state]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || isBusy) return;
    submittingRef.current = true;
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  // An older Content's free-text series name is kept unless the admin picks something else.
  const defaultSeries = state.values === null && !initial.seriesId && legacySeriesTitle ? KEEP_LEGACY_SERIES : values.seriesId;

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      aria-busy={isPending}
      className="space-y-8 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6"
    >
      {contentId && <input type="hidden" name="id" value={contentId} />}

      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
        请填写标题、内容类型、日期和主要内容。其他信息可以根据需要补充。
      </div>

      {isDraft && (
        <p className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-7 text-stone-700">
          这条内容目前是草稿，不会公开显示；保存修改后仍为草稿。
        </p>
      )}

      <section>
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-stone-900">必填信息</h2>
          <p className="mt-1 text-sm leading-6 text-stone-500">这些信息用于展示和整理内容。</p>
        </div>

        <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="content-title" className="mb-2 block text-sm font-medium text-stone-700">
              内容标题 <span className="text-red-600">*</span>
            </label>
            <input
              id="content-title"
              suppressHydrationWarning
              name="title"
              type="text"
              required
              defaultValue={values.title}
              placeholder="例如：在安静中等候"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="content-type" className="mb-2 block text-sm font-medium text-stone-700">
              内容类型 <span className="text-red-600">*</span>
            </label>
            <select
              id="content-type"
              suppressHydrationWarning
              name="contentType"
              defaultValue={values.contentType || "recording"}
              className={inputClass}
            >
              {CONTENT_TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="content-date" className="mb-2 block text-sm font-medium text-stone-700">
              日期 <span className="text-red-600">*</span>
            </label>
            <input
              id="content-date"
              suppressHydrationWarning
              name="date"
              type="date"
              required
              defaultValue={values.date}
              className={dateInputClass}
            />
          </div>
        </div>

        <div className="mt-5 sm:mt-6">
          <label htmlFor="content-body" className="mb-2 block text-sm font-medium text-stone-700">
            主要内容 <span className="text-red-600">*</span>
          </label>
          <textarea
            id="content-body"
            suppressHydrationWarning
            name="contentBody"
            rows={10}
            required
            aria-describedby="content-body-help"
            defaultValue={values.contentBody}
            placeholder="填写文章正文、讲道整理、学习内容、资料说明或相关文字。"
            className={textareaClass}
          />
          <p id="content-body-help" className="mt-2 text-xs leading-6 text-stone-500">
            主要内容是必填项目，也会用于自动生成内容摘要。
          </p>
        </div>
      </section>

      <section className="border-t border-stone-100 pt-8">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-stone-900">选填信息</h2>
          <p className="mt-1 text-sm leading-6 text-stone-500">这些信息可以帮助分类、搜索和补充内容。</p>
        </div>

        <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="content-speaker" className="mb-2 block text-sm font-medium text-stone-700">
              作者 / 讲员
            </label>
            <input
              id="content-speaker"
              suppressHydrationWarning
              name="speaker"
              type="text"
              defaultValue={values.speaker}
              placeholder="例如：陈牧师"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="content-series" className="mb-2 block text-sm font-medium text-stone-700">
              系列
            </label>
            <select
              id="content-series"
              suppressHydrationWarning
              name="seriesId"
              defaultValue={defaultSeries}
              className={inputClass}
            >
              <option value="">不属于系列</option>
              {legacySeriesTitle && (
                <option value={KEEP_LEGACY_SERIES}>{legacySeriesTitle}（保留原系列名称）</option>
              )}
              {disabledSeries && (
                <option value={disabledSeries.id}>{disabledSeries.title}（当前已停用）</option>
              )}
              {seriesOptions.map((series) => (
                <option key={series.id} value={series.id}>
                  {series.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AudioBlobUploadField
          inputClass={inputClass}
          initialResourceUrl={values.resourceUrl}
          onUploadingChange={setIsUploading}
        />

        <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
          <div>
            <label htmlFor="content-tags" className="mb-2 block text-sm font-medium text-stone-700">
              标签
            </label>
            <input
              id="content-tags"
              suppressHydrationWarning
              name="tags"
              type="text"
              defaultValue={values.tags}
              placeholder="用逗号分隔，例如：安静，等候，信靠"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {state.error && (
        <p
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 outline-none"
        >
          {state.error}
        </p>
      )}

      <div
        className={`flex flex-col gap-4 border-t border-stone-100 pt-6 sm:flex-row sm:items-center ${
          mode === "create" ? "sm:justify-between" : "sm:justify-end"
        }`}
      >
        {mode === "create" && <p className="text-sm leading-6 text-stone-500">保存后会进入内容列表。</p>}

        <div className="grid gap-3 sm:flex sm:flex-wrap sm:justify-end">
          <Link
            href="/admin/sermons"
            className="inline-flex w-full justify-center rounded-full border border-stone-300 px-5 py-2.5 max-lg:py-3 text-sm text-stone-600 transition hover:bg-stone-50 hover:text-stone-900 sm:w-auto"
          >
            取消
          </Link>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full rounded-full bg-stone-900 px-5 py-2.5 max-lg:py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500 sm:w-auto"
          >
            {isPending ? "正在保存…" : isUploading ? "文件上传中…" : mode === "create" ? "保存内容" : "保存修改"}
          </button>
        </div>
      </div>
    </form>
  );
}
