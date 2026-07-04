import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <main className={`mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </main>
  );
}