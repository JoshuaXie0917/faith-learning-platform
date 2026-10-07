import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeName } from "@/lib/auth";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  safeEqualStrings,
} from "@/lib/adminSession";
import {
  clearLoginAttempts,
  getClientAddress,
  getThrottleSecret,
  hashClientAddress,
  pruneLoginThrottle,
  registerLoginAttempt,
} from "@/lib/loginThrottle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: "管理员密码尚未配置。" },
        { status: 500 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "请输入管理员姓名。" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "请输入管理员密码。" },
        { status: 400 }
      );
    }

    // Throttle per client before the password is checked; the stored key is an
    // HMAC of the client address, never the address itself.
    const now = new Date();
    const throttleKey = hashClientAddress(getClientAddress(request.headers), getThrottleSecret());

    await pruneLoginThrottle(prisma, now).catch(() => undefined);

    const attempt = await registerLoginAttempt(prisma, throttleKey, now);

    if (!attempt.allowed) {
      return NextResponse.json(
        { error: "登录尝试次数过多，请稍后再试。" },
        { status: 429, headers: { "Retry-After": String(attempt.retryAfterSeconds) } }
      );
    }

    if (!safeEqualStrings(password, adminPassword)) {
      return NextResponse.json(
        { error: "管理员姓名或密码不正确。" },
        { status: 401 }
      );
    }

    await clearLoginAttempts(prisma, throttleKey);

    const nameKey = normalizeName(name);

    const user = await prisma.user.upsert({
      where: {
        nameKey,
      },
      update: {
        name,
        role: "admin",
        deletedAt: null,
        lastSeenAt: new Date(),
      },
      create: {
        name,
        nameKey,
        role: "admin",
        deletedAt: null,
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        role: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });

    const adminSessionToken = createAdminSessionToken();

    if (!adminSessionToken) {
      return NextResponse.json(
        { error: "管理员登录失败，请稍后再试。" },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ user });

    response.cookies.set(
      ADMIN_SESSION_COOKIE_NAME,
      adminSessionToken,
      getAdminSessionCookieOptions()
    );

    return response;
  } catch (error) {
    console.error("管理员登录失败：", error instanceof Error ? error.message : "unknown error");

    return NextResponse.json(
      { error: "管理员登录失败，请稍后再试。" },
      { status: 500 }
    );
  }
}
