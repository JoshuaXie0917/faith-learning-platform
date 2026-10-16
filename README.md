# 四月花 Faith Learning Platform

四月花是一个面向小型教会和学习小组的中文学习与分享平台：管理员整理录音、文章、文件、音乐、图片和链接，弟兄姊妹可以公开浏览、收藏、标记已读，并发布学习分享。

This is a full-stack faith learning platform built with Next.js, TypeScript, Tailwind CSS, Prisma and PostgreSQL, deployed on Vercel.

---

## 功能

- **公开浏览**：无需注册。学习中心、真理集录、系列和信仰立场页面对所有访客开放。
- **收藏与已读**：每个浏览器有一个匿名访客标识，用于收藏（正式内容和分享合计最多 30 个）和已读标记。后台只统计数量。
- **学习分享**：访客可以发布分享，公开展示 7 天；未被收藏的分享到期后由定时任务清理，收藏者可继续查看。发布者可删除自己的分享。
- **管理员后台**（密码登录）：内容的新增、编辑和删除，系列管理（名称、简介、封面），分享管理（移除不当分享）。
- **文件上传**：通过 Vercel Blob 上传，类型限于音频、常见图片、PDF、Word、PowerPoint 和纯文本，单个文件最大 100 MB。
- **数据保留**：内容和分享的清理规则见 `docs/`。

## 技术栈

- Next.js 16（App Router、Server Actions）、React 19、TypeScript
- Tailwind CSS 3
- Prisma 6 + PostgreSQL（生产环境为 Neon）
- Vercel（部署、定时任务、Blob 存储）

## 本地开发

1. 安装依赖：`npm install`
2. 复制 `.env.example` 为 `.env`，把 `DATABASE_URL` 指向**本机或一次性的 PostgreSQL 数据库**，不要指向生产数据库。
3. 应用数据库迁移：`npx prisma migrate deploy`
4. 启动开发服务器：`npm run dev`，然后打开 http://localhost:3000

示例数据（可选）：`prisma/seed.js` 会写入示例成员、内容和已读记录。它只在设置了 `SEED_SAMPLE_DATA=local-only` 且数据库位于本机时运行，否则直接退出。

## 环境变量

| 变量 | 用途 |
|---|---|
| `DATABASE_URL` | PostgreSQL 连接地址 |
| `ADMIN_PASSWORD` | 管理员密码，同时用于签名管理员会话 |
| `CRON_SECRET` | 定时任务的访问密钥（生产环境） |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 上传凭据（生产环境） |
| `SHARE_RETENTION_DELETE_ENABLED` | 是否允许定时任务真正清理过期分享 |

密钥只配置在 Vercel 的 Production 环境；Preview 部署不接收任何密钥。

## 安全与运维说明

- 管理员会话有效期 8 小时；登录有频率限制，只保存地址的 HMAC，不保存原始 IP。
- 请勿对生产数据库运行 `prisma db push`、`prisma migrate reset` 或示例数据脚本。
- 详细说明：`docs/admin-security.md`、`docs/share-retention.md`、`docs/content-retention.md`。
