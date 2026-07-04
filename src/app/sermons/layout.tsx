import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";

export default function SermonsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}