"use client";

import { useId, useRef } from "react";

type ConfirmActionButtonProps = {
  label: string;
  title: string;
  message: string;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onConfirm: () => void;
  className?: string;
};

// Like ConfirmSubmitButton, but for an action run in the browser instead of a form submission. The
// in-page dialog keeps every word Chinese (the browser's own confirm() dialog shows "OK"/"Cancel" in the
// browser's language). Cancel (button or Escape) only closes the dialog.
export function ConfirmActionButton({
  label,
  title,
  message,
  confirmLabel,
  pendingLabel,
  isPending,
  onConfirm,
  className,
}: ConfirmActionButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        disabled={isPending}
        onClick={() => dialogRef.current?.showModal()}
        className={className}
      >
        {isPending ? pendingLabel : label}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-stone-200 bg-white p-5 text-left text-stone-900 shadow-xl backdrop:bg-stone-900/40"
      >
        <h2 id={titleId} className="text-base font-semibold text-stone-900">
          {title}
        </h2>
        <p id={messageId} className="mt-2 text-sm leading-6 text-stone-600">
          {message}
        </p>

        {/* Cancel comes first so it receives focus when the dialog opens. */}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-11 rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
          >
            取消
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              dialogRef.current?.close();
              onConfirm();
            }}
            className="min-h-11 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
