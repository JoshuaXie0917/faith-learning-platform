import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createPasswordHash,
  getExpectedPasswordByRole,
  getRoleByPassword,
  normalizeName,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name) {
      return NextResponse.json({ message: "请输入姓名。" }, { status: 400 });
    }

    const nameKey = normalizeName(name);

    const existingUser = await prisma.user.findUnique({
      where: { nameKey },
      select: {
        id: true,
        name: true,
        role: true,
        passwordHash: true,
        passwordSalt: true,
        createdAt: true,
      },
    });

    if (existingUser) {
      const hasPersonalPassword =
        existingUser.passwordHash && existingUser.passwordSalt;

      const isPasswordValid = hasPersonalPassword
        ? verifyPassword(
            password,
            existingUser.passwordHash,
            existingUser.passwordSalt
          )
        : password === getExpectedPasswordByRole(existingUser.role);

      if (!isPasswordValid) {
        return NextResponse.json(
          { message: "访问密码不正确。" },
          { status: 401 }
        );
      }

      return NextResponse.json({
        user: {
          id: existingUser.id,
          name: existingUser.name,
          role: existingUser.role,
          createdAt: existingUser.createdAt,
        },
        mode: "login",
      });
    }

    const role = getRoleByPassword(password);

    if (!role) {
      return NextResponse.json(
        { message: "访问密码不正确。" },
        { status: 401 }
      );
    }

    const { passwordHash, passwordSalt } = createPasswordHash(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        nameKey,
        role,
        passwordHash,
        passwordSalt,
      },
      select: {
        id: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        user: newUser,
        mode: "register",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("进入平台失败：", error);

    return NextResponse.json(
      { message: "进入失败，请稍后再试。" },
      { status: 500 }
    );
  }
}