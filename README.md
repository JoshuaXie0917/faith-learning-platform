# 四月花 Faith Learning Platform

四月花是一个面向小型教会、学习小组或内部社群的学习与分享平台。项目支持成员登录、内容学习、讲道/资料管理、学习分享、已读统计、管理员后台等功能，目标是让一个小型群体可以集中整理学习材料，并进行持续回顾和分享。

This project is a full-stack faith learning platform built with Next.js, TypeScript, Tailwind CSS, Prisma, and a relational database. It is designed for small communities that need a simple but structured place to publish learning materials, manage content, and allow members to share reflections.

---

## 项目状态

当前项目已经完成了主要 MVP 功能，包括：

- 普通成员登录
- 管理员后台
- 内容发布与管理
- 内容下架与软删除
- 成员分享系统
- 分享详情页
- 分享删除
- 已读统计
- 成员列表统计
- 页面访问保护
- 响应式页面设计

项目仍在继续完善中，后续重点包括生产数据库部署、文件存储方案、README 截图补充和权限细节加强。

---

## 技术栈

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Prisma ORM
- SQLite for local development
- PostgreSQL planned for production
- Server Actions
- API Routes

---

## 核心功能

### 1. 成员系统

普通成员进入平台前需要输入姓名和成员进入密码。

当前规则：

- 姓名不能为空
- 姓名不能超过 9 个字符
- 姓名在系统中保持唯一
- 成员信息写入数据库
- 每个成员拥有唯一 ID
- 系统记录成员最后访问时间
- 90 天未访问的成员可以被标记为非活跃

成员登录后可以访问：

- 学习中心
- 真理集录
- 发布分享
- 分享详情
- 我的主页

---

### 2. 我的主页

成员可以在个人主页中修改自己的姓名。

当前设计：

- 用户主页路径：`/profile`
- 主要功能：修改姓名
- 修改后的姓名会同步到数据库
- 学习中心和真理集录页面会显示当前成员信息

---

### 3. 学习中心

路径：

```text
/dashboard