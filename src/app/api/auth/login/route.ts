import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeName } from "@/lib/auth";

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

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "管理员密码不正确。" },
        { status: 401 }
      );
    }

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

    return NextResponse.json({ user });
  } catch (error) {
    console.error("管理员登录失败：", error);

    return NextResponse.json(
      { error: "管理员登录失败，请稍后再试。" },
      { status: 500 }
    );
  }
}