"use client";

import { useId, useRef } from "react";
import { useFormStatus } from "react-dom";

type ConfirmSubmitButtonProps = {
  label: string;
  title: string;
  message: string;
  detail?: string;
  confirmLabel: string;
  pendingLabel: string;
  className?: string;
};

// Submit button for a server-action form that asks for confirmation first.
// The form is only submitted by the dialog's confirm button; cancelling (button,
// Escape) just closes the dialog, so no request is sent.
export function ConfirmSubmitButton({
  label,
  title,
  message,
  detail,
  confirmLabel,
  pendingLabel,
  className,
}: ConfirmSubmitButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();
  const { pending } = useFormStatus();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        disabled={pending}
        onClick={() => dialogRef.current?.showModal()}
        className={className}
      >
        {label}
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
        {detail && (
          <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-sm font-medium leading-6 text-stone-800">
            {detail}
          </p>
        )}

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
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
