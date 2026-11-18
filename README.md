# AvatarFlow

企业品牌头像互动平台。

让每一次扫码，都成为一次品牌曝光。AvatarFlow 帮活动策划公司、品牌营销团队和企业 HR 快速搭建专属头像互动 H5：配置 Logo、品牌色和头像风格，发布一个链接，参与者用微信扫码即可创作、下载并分享自己的品牌头像。

## 适合谁

- 活动策划公司：为单场活动做出可扫码参与的头像互动
- 品牌营销团队：把品牌色、Logo 和装饰做进参与者愿意转发的图片
- 企业 HR：年会、入职、内宣等场景的轻量互动页

## 核心能力

| 能力 | 做什么 |
| --- | --- |
| 品牌视觉定制 | 上传 Logo、设定品牌色，头像带上这场活动自己的识别，而不是套一套通用模板 |
| 活动 H5 | 一个独立链接，扫码即用。无需下载 App，微信内置浏览器可直接打开 |
| 参与者互动 | 选风格、随机生成、微调参数、实时预览，几秒得到一张自己的头像 |
| 传播素材 | 导出 1024px PNG。品牌背景、头像、边框和贴纸合成在一张图里 |
| 活动数据 | 记录访问、生成、下载、分享，按活动和时间聚合，可导出 CSV |

一次活动的路径：创建活动 → 配置品牌 → 预览 → 发布 → 扫码访问 → 生成头像 → 下载 PNG。

- 管理后台：`/admin`
- 活动页：`/e/[slug]`
- 演示列表：`/showcase`

## 服务方式

| 方式 | 报价 | 包含 |
| --- | --- | --- |
| 试点 | ¥699 | 首批试点，用来验证真实活动场景 |
| 标准服务 | ¥1,999 | 品牌配置、活动搭建与上线支持 |
| 企业定制 | ¥4,999 起 | 深度品牌定制与专属装饰元素 |

以上为服务报价参考，非已验证市场价格。具体以实际沟通为准。

## 这个仓库

本仓库 fork 自 [DiceBear](https://github.com/dicebear/dicebear)。AvatarFlow 是其中的应用 `apps/avatarflow`（workspace 名 `@avatarflow/app`），在本地复用 DiceBear 引擎，不调用官方公共 API。

- `apps/avatarflow` — 产品应用：管理后台、活动 H5、生成与统计 API
- `src/js/core` — DiceBear 头像引擎，保持上游 baseline
- `apps/docs`、`apps/editor` — DiceBear 原有站点与编辑器，未改作产品入口

产品只内置 **CC0 1.0** 风格（20 个），定义在 `apps/avatarflow/src/lib/dicebear/styles/`。注册表在加载时校验许可证，非 CC0 会直接失败。DiceBear 其余需要署名或另有商用条款的风格没有纳入。

上游项目与文档：

- 仓库：[dicebear/dicebear](https://github.com/dicebear/dicebear)
- 文档：[dicebear.com](https://www.dicebear.com)
- 编辑器：[editor.dicebear.com](https://editor.dicebear.com)

## 本地运行

需要 Node.js 22 或更高版本。在仓库根目录：

```bash
npm install
npm run build -w @dicebear/core
cp apps/avatarflow/.env.example apps/avatarflow/.env.local
cd apps/avatarflow
npm run dev
```

开发服务器默认在 http://localhost:3000 。未配置 Supabase / R2 时，数据写在本地 JSON，上传文件放在 `public/uploads`，可以离线运行。

环境变量、Supabase 绑定、R2、微信内置浏览器和公网部署见 [apps/avatarflow/README.md](./apps/avatarflow/README.md)。

## 许可

仓库代码沿用 [MIT 许可](./LICENSE)，包含商业使用。AvatarFlow 选用的头像风格另行为 CC0 1.0，作者与来源登记在 `apps/avatarflow/src/lib/dicebear/registry.generated.ts`。
