import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVE_MEMBER_DAYS = 90;
const MAX_NAME_LENGTH = 9;
const MEMBER_ACCESS_CODE = process.env.MEMBER_ACCESS_CODE;
function normalizeVisitorKey(value: string) {
  return value.trim().slice(0, 120);
}

function normalizeName(value: string) {
  return value.trim();
}

function getCharacterCount(value: string) {
  return Array.from(value).length;
}

function getInactiveCutoffDate() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACTIVE_MEMBER_DAYS);
  return cutoff;
}

async function markInactiveMembersAsDeleted() {
  const cutoff = getInactiveCutoffDate();

  await prisma.user.updateMany({
    where: {
      role: "member",
      nameKey: {
        startsWith: "member-",
      },
      deletedAt: null,
      lastSeenAt: {
        lt: cutoff,
      },
    },
    data: {
      deletedAt: new Date(),
    },
  });
}

export async function POST(request: Request) {
  try {
    await markInactiveMembersAsDeleted();

    const body = (await request.json()) as {
      visitorKey?: string;
      name?: string;
      accessCode?: string;
    };

    const visitorKey = normalizeVisitorKey(String(body.visitorKey ?? ""));
    const name = normalizeName(String(body.name ?? ""));
    const accessCode = String(body.accessCode ?? "").trim();

    if (!MEMBER_ACCESS_CODE) {
      return Response.json(
        { error: "成员进入密码尚未配置。" },
        { status: 500 },
      );
    }

    if (!visitorKey) {
      return Response.json(
        { error: "缺少浏览器标识，无法进入平台。" },
        { status: 400 },
      );
    }

    if (!name) {
      return Response.json({ error: "请填写姓名。" }, { status: 400 });
    }

    if (getCharacterCount(name) > MAX_NAME_LENGTH) {
      return Response.json(
        { error: "姓名必须小于 10 个字符。" },
        { status: 400 },
      );
    }

    const now = new Date();
    const nameKey = `member-${visitorKey}`;

    const currentUser = await prisma.user.findUnique({
      where: {
        nameKey,
      },
      select: {
        id: true,
        name: true,
        deletedAt: true,
      },
    });

    const existingMemberWithSameName = await prisma.user.findFirst({
      where: {
        role: "member",
        name,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (currentUser && !currentUser.deletedAt) {
      if (
        existingMemberWithSameName &&
        existingMemberWithSameName.id !== currentUser.id
      ) {
        if (!accessCode) {
          return Response.json(
            { error: "切换到已有成员身份需要填写进入密码。" },
            { status: 400 },
          );
        }

        if (accessCode !== MEMBER_ACCESS_CODE) {
          return Response.json({ error: "进入密码不正确。" }, { status: 401 });
        }

        const switchedUser = await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: {
              id: currentUser.id,
            },
            data: {
              nameKey: `released-${currentUser.id}-${Date.now()}`,
              lastSeenAt: now,
            },
          });

          return tx.user.update({
            where: {
              id: existingMemberWithSameName.id,
            },
            data: {
              nameKey,
              lastSeenAt: now,
              deletedAt: null,
            },
            select: {
              id: true,
              name: true,
              role: true,
              createdAt: true,
              lastSeenAt: true,
            },
          });
        });

        return Response.json({
          ok: true,
          user: switchedUser,
        });
      }

      const user = await prisma.user.update({
        where: {
          id: currentUser.id,
        },
        data: {
          name,
          role: "member",
          lastSeenAt: now,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          role: true,
          createdAt: true,
          lastSeenAt: true,
        },
      });

      return Response.json({
        ok: true,
        user,
      });
    }

    if (!accessCode) {
      return Response.json({ error: "请填写进入密码。" }, { status: 400 });
    }

    if (accessCode !== MEMBER_ACCESS_CODE) {
      return Response.json({ error: "进入密码不正确。" }, { status: 401 });
    }

    if (existingMemberWithSameName) {
      const user = await prisma.user.update({
        where: {
          id: existingMemberWithSameName.id,
        },
        data: {
          nameKey,
          lastSeenAt: now,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          role: true,
          createdAt: true,
          lastSeenAt: true,
        },
      });

      return Response.json({
        ok: true,
        user,
      });
    }

    const user = await prisma.user.create({
      data: {
        name,
        nameKey,
        role: "member",
        lastSeenAt: now,
      },
      select: {
        id: true,
        name: true,
        role: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });

    return Response.json({
      ok: true,
      user,
    });
  } catch (error) {
    console.error("保存成员身份失败：", error);

    return Response.json(
      { error: "保存成员身份失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    await markInactiveMembersAsDeleted();

    const { searchParams } = new URL(request.url);
    const visitorKey = normalizeVisitorKey(
      searchParams.get("visitorKey") ?? "",
    );

    if (!visitorKey) {
      return Response.json({ error: "缺少浏览器标识。" }, { status: 400 });
    }

    const nameKey = `member-${visitorKey}`;

    const existingUser = await prisma.user.findUnique({
      where: {
        nameKey,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!existingUser || existingUser.deletedAt) {
      return Response.json({
        user: null,
      });
    }

    const user = await prisma.user.update({
      where: {
        nameKey,
      },
      data: {
        lastSeenAt: new Date(),
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        role: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });

    return Response.json({
      user,
    });
  } catch (error) {
    console.error("读取成员身份失败：", error);

    return Response.json(
      { error: "读取成员身份失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
