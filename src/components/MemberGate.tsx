"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MemberUser = {
  id: string;
  name: string;
  role: string;
  createdAt: string;
  lastSeenAt: string;
};

type MemberGateProps = {
  children: React.ReactNode;
  returnTo: string;
};

function getOrCreateVisitorKey() {
  const savedKey = localStorage.getItem("readVisitorKey");

  if (savedKey) {
    return savedKey;
  }

  const newKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem("readVisitorKey", newKey);

  return newKey;
}

export function MemberGate({ children, returnTo }: MemberGateProps) {
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);
  const [member, setMember] = useState<MemberUser | null>(null);

  useEffect(() => {
    async function checkMember() {
      try {
        const visitorKey = getOrCreateVisitorKey();

        const response = await fetch(`/api/members?visitorKey=${visitorKey}`);
        const data = (await response.json()) as {
          user?: MemberUser | null;
        };

        if (!response.ok || !data.user) {
          router.replace(`/member?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        setMember(data.user);
        localStorage.setItem("memberUserId", data.user.id);
        localStorage.setItem("memberName", data.user.name);
      } catch {
        router.replace(`/member?returnTo=${encodeURIComponent(returnTo)}`);
      } finally {
        setIsChecking(false);
      }
    }

    checkMember();
  }, [returnTo, router]);

  if (isChecking || !member) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm leading-7 text-stone-500">
            正在检查成员身份……
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}