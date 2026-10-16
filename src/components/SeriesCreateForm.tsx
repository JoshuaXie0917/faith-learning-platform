"use client";

import { useActionState, useEffect, useRef, useTransition, type FormEvent } from "react";

export type SeriesCreateState = {
  error: string | null;
  message: string | null;
  attempt: number;
};

const INITIAL_STATE: SeriesCreateState = { error: null, message: null, attempt: 0 };

type SeriesCreateFormProps = {
  action: (state: SeriesCreateState, formData: FormData) => Promise<SeriesCreateState>;
};

// "新增系列": a duplicate or empty name is explained instead of silently ignored,
// the typed name stays in place after a refusal, and the button is disabled while saving.
export function SeriesCreateForm({ action }: SeriesCreateFormProps) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    submittingRef.current = false;
    if (state.message) formRef.current?.reset();
    if (state.error) inputRef.current?.focus();
  }, [state]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || isPending) return;
    submittingRef.current = true;
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          name="title"
          type="text"
          required
          aria-label="新系列名称"
          aria-invalid={state.error ? true : undefined}
          aria-describedby="series-create-feedback"
          placeholder="输入系列名称"
          className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-400 focus:bg-white max-md:text-base max-lg:min-h-11"
        />

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-stone-900 px-5 py-2.5 max-lg:py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500"
        >
          {isPending ? "正在新增…" : "新增系列"}
        </button>
      </div>

      <div id="series-create-feedback" role="status" aria-live="polite">
        {state.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
        {state.message && <p className="mt-3 text-sm text-emerald-700">{state.message}</p>}
      </div>
    </form>
  );
}
