import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <section className="mb-6 pt-4 sm:mb-8 sm:pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words font-serif text-2xl tracking-tight text-stone-900 sm:text-3xl">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-500 sm:text-base">
              {subtitle}
            </p>
          )}
        </div>

        {action && (
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            {action}
          </div>
        )}
      </div>
    </section>
  );
}