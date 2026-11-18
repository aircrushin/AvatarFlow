# AvatarFlow

企业品牌头像互动平台。基于 [DiceBear](https://github.com/dicebear/dicebear) 开源引擎构建，帮助企业和活动主办方快速创建品牌专属的头像互动 H5。

## 与仓库的关系

本目录是 DiceBear monorepo 中的一个新 workspace（`@avatarflow/app`）。DiceBear 官方仓库作为 baseline 保留在仓库根目录，未做任何修改：

- `src/js/core` — DiceBear 头像生成引擎（本地复用，不依赖官方公共 API）
- `apps/avatarflow` — 本应用
- `apps/docs`、`apps/editor` — DiceBear 原有应用，保持不动

引擎能力（Seed 确定性生成、动态参数、SVG 输出）直接复用 `@dicebear/core`；PNG 导出使用 `@resvg/resvg-js` 与 `sharp` 完成分层合成。

## 快速开始

### 1. 安装依赖（在仓库根目录）

```bash
npm install
# 构建本地 DiceBear 核心包（首次必需）
npm run build -w @dicebear/core
```

### 2. 配置环境变量

```bash
cp apps/avatarflow/.env.example apps/avatarflow/.env.local
```

至少填写：

- `ADMIN_PASSWORD_HASH` — 管理密码的 SHA-256 值
- `ADMIN_SESSION_SECRET` — 随机密钥

生成方式：

```bash
node -e "console.log(require('crypto').createHash('sha256').update('你的密码').digest('hex'))"
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

不配置 Supabase / R2 时，应用使用本地 JSON 文件（`.data/db.json`）与 `public/uploads` 目录，可完全离线运行。

### 3. 启动

```bash
cd apps/avatarflow
npm run dev        # http://localhost:3000
```

## 后端切换

### Supabase（PostgreSQL + Auth 数据层）

**一键绑定（需要你的 Supabase 个人访问令牌）：**

1. 打开 https://supabase.com/dashboard/account/tokens → Generate new token，名称填 `AvatarFlow`，授予 `projects:write` 与 `secrets:read`（经典令牌默认全权限）。
2. 在项目根目录的 `apps/avatarflow` 下执行：

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx npm run db:bootstrap -- --org <你的组织slug> --name avatarflow --region apac
```

脚本会自动：创建项目 → 等待服务健康 → 获取 publishable/secret 密钥 → 写入 `.env.local` → 通过直连 Postgres 执行全部迁移 → REST 验证表结构。数据库密码随机生成，仅保存在本地 `.supabase-setup.json`（已 gitignore）。令牌可来自环境变量，也可写入 `apps/avatarflow/.supabase-token`（同样已 gitignore）；脚本不把令牌写入任何文件。

已有项目可跳过创建：

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx npm run db:bootstrap -- --project-ref <ref> --db-password <数据库密码>
```

绑定后运行 `npm run db:verify` 可随时检查连通性。

**手动绑定：** 在 Supabase SQL Editor 执行 `supabase/migrations/0001_init.sql`，然后在 `.env.local` 填写 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`（新项目用 publishable key）、`SUPABASE_SERVICE_ROLE_KEY`（新项目用 secret key）。三者齐全后自动切换到 Supabase 后端。

安全：`SUPABASE_SERVICE_ROLE_KEY` 仅在服务端使用，绝不加 `NEXT_PUBLIC_` 前缀。数据库启用 RLS，匿名客户端只能读取 active 活动。`.env.local` 与 `.supabase-setup.json` 均已被 gitignore。

**网络注意：** Management API（`api.supabase.com`）和数据面（`<ref>.supabase.co`）是两个不同域名，部分本地网络/代理只放行前者。如果 `npm run db:verify` 显示 `REST data plane unreachable`，说明绑定与迁移有效、但当前网络无法读写应用数据；请换到能访问 `*.supabase.co` 的网络或部署环境。本地临时开发时，把 `.env.local` 中三个 Supabase 变量清空即可切回本地 JSON 后端。

### Cloudflare R2（素材存储）

填写 `R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`、`R2_PUBLIC_URL` 后自动切换到 R2。

## 核心流程

创建活动 → 配置品牌 → 预览 → 发布 → 扫码访问 → 生成头像 → 下载 PNG。

- 管理后台：`/admin/login` → `/admin`
- 活动 H5：`/e/[slug]` → `/e/[slug]/create` → `/e/[slug]/result`
- 演示列表：`/showcase`

## 头像风格与许可证

**只使用 CC0 1.0 风格。** 风格定义内嵌于 `src/lib/dicebear/styles/`（仅 20 个 CC0 风格），由 `registry.generated.ts` 登记作者、来源、许可证。注册表在模块加载时校验每个定义的 `meta.license`，非 CC0 会直接抛错，失败即关闭。

DiceBear 共 63 个风格，其中 44 个 CC0、14 个 CC BY 4.0（需署名）、4 个免费商用、1 个 MIT。**CC BY 等风格未被纳入**，避免商用授权风险。

## 合成分层

导出 PNG 严格按照四层：

1. Background Layer（品牌背景色）
2. Avatar Layer（DiceBear 透明底头像）
3. Brand Decoration Layer（边框 + 品牌贴纸，位于头像之上）
4. Export Layer（resvg + sharp 合成为 1024px 高清 PNG）

所有用户输入在拼入 SVG 前均做 XML 转义；Logo 上传校验 MIME 与魔数，SVG 会剥离脚本与事件处理器。

## 数据统计

记录四类事件：`page_view`、`avatar_generate`、`avatar_download`、`share_click`。按活动与时间聚合，30 秒窗口内同一访客的同类事件去重。不存储原始 Seed（仅存 SHA-256 哈希），不收集个人信息。

## 脚本

```bash
npm run type-check   # TypeScript 严格检查
npm test             # 单元测试（引擎确定性 / 许可证白名单 / 校验 / 限流）
npm run build        # 生产构建
npm run db:migrate     # 查看数据库迁移文件
npm run db:bootstrap   # 用 PAT 创建/绑定 Supabase 项目并自动迁移
npm run db:verify      # 验证 Supabase 绑定与 REST 连通性
```

## 验证状态

- 本地端到端：管理员登录鉴权、活动创建、公开访问、SVG/PNG 生成、相同 Seed 复现、不同 Seed 差异、非白名单风格拒绝、二维码、统计记录。
- 23 项单元测试通过，TypeScript 严格检查通过，生产构建通过（25 条路由）。
- 公网部署（Supabase 后端）已验证：页面与 API 可访问、沙箱可读到 Supabase 数据、SVG/PNG 生成成功、`resvg-js`/`sharp` 原生模块在沙箱可用、生成与统计数据写入 Supabase 成功。

## 公网部署

已用内置「发布为应用」能力上线，后端切换为 Supabase（数据落在 PostgreSQL，不再依赖本地文件）。为适配托管沙箱做了三处调整：

- `pg` 只在 bootstrap 的一次性降级路径按需动态加载，不进入运行时依赖清单（沙箱预检会把 `pg` 误判为外部数据库依赖）。
- 本地存储的 Logo 返回相对 `/uploads/...` URL，二维码从请求头 `X-Forwarded-Host` / `Host` 推导公网 origin，均不再依赖构建期 `NEXT_PUBLIC_APP_URL`。
- 沙箱启动命令：`npm run build && npm start`（`next start` 默认绑定 `0.0.0.0`，端口由沙箱以 `PORT` 注入）。

注意：Cloudflare R2 未配置时，上传的 Logo 存在沙箱本地文件系统，实例重建后会丢失；正式交付建议配置 R2。限流为单进程内存实现，多实例部署需换 Redis/Upstash。

## 已知边界

- 管理端为单管理员（环境变量密码），无 RBAC（符合第一版要求）。
- 在线支付、AI 生图、多租户计费等 P2 功能未实现（按规范禁止投入）。
- 公网链接由发布平台网关以 sharecode 保护；裸域名直连 API / 静态资源会返回 403，属预期行为（真实用户经带 sharecode 的链接访问时正常加载）。
- 微信内置浏览器：result 页在检测到微信/企微 UA 时，把 PNG 渲染为可长按保存的 `<img>`（微信忽略 `a.download`），分享改为引导右上角菜单；跨页预览改用 SVG data URL，避免 blob URL 导航后失效。真机验收仍需在微信内实际跑一遍。
