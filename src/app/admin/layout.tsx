import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AuthGuard } from "@/components/AuthGuard";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-stone-50">
        <Navbar />

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <AdminSidebar />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}