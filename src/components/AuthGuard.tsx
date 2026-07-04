"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const adminSession = localStorage.getItem("adminSession");

    if (adminSession !== "true") {
      router.replace("/login");
      return;
    }

    setIsAllowed(true);
    setIsChecking(false);
  }, [router]);

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-stone-500">正在检查管理员状态……</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}