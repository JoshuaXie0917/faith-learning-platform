"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  label: string;
  pendingLabel: string;
  className?: string;
};

// Submit button for a plain server-action form: disabled while the form is being
// submitted, so a double click or a slow connection cannot send it twice.
export function PendingSubmitButton({ label, pendingLabel, className }: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}
