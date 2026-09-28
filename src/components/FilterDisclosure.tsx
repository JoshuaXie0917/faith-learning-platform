"use client";

import Link from "next/link";
import { useId, useState } from "react";

type FilterOption = {
  value: string;
  label: string;
  href: string;
};

type FilterDisclosureProps = {
  label: string;
  activeValue: string;
  activeLabel: string;
  options: FilterOption[];
};

export function FilterDisclosure({
  label,
  activeValue,
  activeLabel,
  options,
}: FilterDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="min-w-0">
      <button
        type="button"
        aria-controls={panelId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3 text-left transition hover:border-stone-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-700"
      >
        <span className="min-w-0">
          <span className="block text-xs text-stone-500">{label}</span>
          <span className="mt-0.5 block truncate text-sm font-medium text-stone-900">
            {activeLabel}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-lg leading-none text-stone-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </button>

      {isOpen && (
        <div
          id={panelId}
          aria-label={`${label}筛选选项`}
          className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 p-2 shadow-sm"
        >
          <div className="grid gap-1">
            {options.map((option) => {
              const isActive = option.value === activeValue;

              return (
                <Link
                  key={option.value}
                  href={option.href}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => setIsOpen(false)}
                  className={`min-w-0 rounded-lg px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-stone-700 ${isActive
                    ? "bg-stone-900 font-medium text-white"
                    : "bg-white text-stone-700 hover:bg-stone-100"
                    }`}
                >
                  <span className="block break-words">{option.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
