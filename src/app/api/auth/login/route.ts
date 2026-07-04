import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getExpectedPasswordByRole, normalizeName } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name) {
      return NextResponse.json(
        { message: "请输入已注册的姓名。" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        nameKey: normalizeName(name),
      },
      select: {
        id: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "这个姓名还没有注册，请先注册。" },
        { status: 404 }
      );
    }

    const expectedPassword = getExpectedPasswordByRole(user.role);

    if (password !== expectedPassword) {
      return NextResponse.json(
        { message: "访问密码不正确。" },
        { status: 401 }
      );
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { message: "登录失败，请稍后再试。" },
      { status: 500 }
    );
  }
}