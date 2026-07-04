import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRoleByPassword, normalizeName } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name) {
      return NextResponse.json(
        { message: "请输入要注册的姓名。" },
        { status: 400 }
      );
    }

    const role = getRoleByPassword(password);

    if (!role) {
      return NextResponse.json(
        { message: "访问密码不正确。" },
        { status: 401 }
      );
    }

    const nameKey = normalizeName(name);

    const existingUser = await prisma.user.findUnique({
      where: { nameKey },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "这个姓名已经注册，请直接登录。" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        nameKey,
        role,
      },
      select: {
        id: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "注册失败，请稍后再试。" },
      { status: 500 }
    );
  }
}