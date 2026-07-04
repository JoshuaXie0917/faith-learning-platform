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

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nameKey: true,
        role: true,
        passwordHash: true,
        passwordSalt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "用户不存在，请重新登录。" },
        { status: 404 },
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("读取用户信息失败：", error);

    return NextResponse.json(
      { message: "读取用户信息失败。" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { message: "用户不存在，请重新登录。" },
        { status: 404 },
      );
    }

    const updateData: {
      name?: string;
      nameKey?: string;
      role?: string;
      passwordHash?: string;
      passwordSalt?: string;
    } = {};

    if (name && name !== user.name) {
      const nextNameKey = normalizeName(name);

      const existingName = await prisma.user.findUnique({
        where: { nameKey: nextNameKey },
      });

      if (existingName && existingName.id !== user.id) {
        return NextResponse.json(
          { message: "这个姓名已经被使用，请换一个姓名。" },
          { status: 409 },
        );
      }

      updateData.name = name;
      updateData.nameKey = nextNameKey;
    }

    if (newPassword) {
      const nextRole = getRoleByPassword(newPassword);

      if (!nextRole) {
        return NextResponse.json(
          { message: "新密码只能是成员密码或管理员密码。" },
          { status: 400 },
        );
      }

      const hasPersonalPassword = user.passwordHash && user.passwordSalt;

      const isCurrentPasswordValid = hasPersonalPassword
        ? verifyPassword(currentPassword, user.passwordHash, user.passwordSalt)
        : currentPassword === getExpectedPasswordByRole(user.role);

      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { message: "当前密码不正确。" },
          { status: 401 },
        );
      }

      const { passwordHash, passwordSalt } = createPasswordHash(newPassword);

      updateData.passwordHash = passwordHash;
      updateData.passwordSalt = passwordSalt;
      updateData.role = nextRole;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("更新用户信息失败：", error);

    return NextResponse.json(
      { message: "更新失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
