import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

// Used inside layouts that already provide the page <main> and phone gutters,
// so it adds its own padding only from the sm breakpoint up.
export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-6xl sm:px-6 sm:py-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}
