# Sketch Coffee · 平板点单系统

草图咖啡店内使用的平板管理系统，包含点单、配方、账本、缺货补货和打卡打扫。主要在华为平板的浏览器里使用，订单同步到飞书多维表格，部署在 Vercel。

> 本项目基于 [@Baobao-Big](https://github.com/Baobao-Big) 开发的 `sketch-coffee-huaweipad` 继续开发，感谢原作者。

---

## 功能

| 页面 | 能做什么 |
|---|---|
| **点单** | 按分类浏览菜单，每行 5 个；全局搜索支持中文、英文名和拼音首字母（`nt` = 拿铁）；可选温度、换奶、低因、加浓缩，以及自带杯、咖啡师折扣、值班免单等优惠，价格自动计算 |
| **配方** | 查看每款饮品的冷/热做法和制作要点，也可以搜索 |
| **账本** | 制作清单（付款 / 制作 / 洗杯 / 签名）；设置"当前值班咖啡师"后，完成订单时默认用他签名；支持批量标记和批量完成，完成后可以撤销；历史订单按天折叠，可以导出 Excel |
| **补货** | 原料按饮品 / 食品 / 用品 / 其他分类列出，可以自己添加。点一下选中、再点一下确认：有货 → 缺货 → 到货；每次缺货和到货都会记下时间和值班人，可以查补货记录 |
| **打卡** | 早班、晚班、每周大扫除清单，余货清点，签名确认；日常打卡每天自动清空 |
| **设置** | 6 套皮肤（拿铁 / 抹茶 / 海盐 / 焦糖 / 石墨 / 深夜浓缩）、换班、订单号校准、手动同步 |

**数据与同步**
- **订单**：完成后约 10 秒自动上传飞书。离线时先存在平板上，联网后自动补传。服务端按"订单号 + 下单时间"去重，重复上传不会重复记账。
- **订单号**：格式为 `YYYYMMDD-NNNNN`，后面的序号从开店起一直累计。
- **菜单和打卡清单**：以飞书为准，超过 6 小时会自动刷新。
- **补货记录、打卡勾选、设置**：只存在平板本地，不上传。

---

## 技术栈

- [Next.js 16](https://nextjs.org)（App Router）+ React 19 + TypeScript
- Tailwind CSS v4。皮肤通过 CSS 变量切换，定义在 `app/globals.css`
- [Dexie](https://dexie.org)（IndexedDB）：平板本地数据库
- [飞书开放平台 Node SDK](https://github.com/larksuite/node-sdk)：读写多维表格
- 部署：Vercel

## 目录结构

```
app/
  order/       点单页
  process/     配方页
  ledger/      账本页
  restock/     缺货补货页
  duty/        打卡打扫页
  api/
    menu/          GET  从飞书读菜单
    duty/          GET  从飞书读打卡清单
    orders/sync/   POST 把订单写入飞书（按订单号 + 时间去重）
  globals.css  颜色变量、6 套皮肤、自适应缩放
components/    外壳、侧边栏、设置、菜单浏览、配方弹窗、Logo 等
lib/
  db.ts        本地数据库结构（订单 / 菜单 / 打卡 / 补货）
  sync.ts      自动同步
  orders.ts    订单号、完成与撤销
  pricing.ts   价格计算
  restock.ts   缺货 / 到货、原料清单
  search.ts    搜索（含拼音首字母）
  settings.ts  皮肤、值班咖啡师
  feishu.ts    飞书客户端
constants/     默认菜单、打卡清单、默认原料清单（离线兜底用）
```

---

## 本地运行

需要 Node.js 20 或以上。

```bash
npm install
npm run dev        # 开发模式，打开 http://localhost:3000
npm run build      # 检查能否正常编译（推送前建议跑一次）
```

- **不配飞书也能跑**：没有 `.env.local` 时，菜单用代码里的默认数据，订单存在本机，只是同步到飞书会失败。适合调界面。
- **看平板效果**：用 Chrome 按 F12，切到设备模式，尺寸设成 1280×800（横屏）或 800×1280（竖屏）。

### 环境变量

在项目根目录新建 `.env.local`（已经加进 `.gitignore`，**不要提交**）：

```
FEISHU_APP_ID=            # 飞书应用 App ID
FEISHU_APP_SECRET=        # 飞书应用 App Secret
FEISHU_APP_TOKEN=         # 多维表格 token（网址 /base/ 后面那段）
FEISHU_TABLE_ID_MENU=     # 菜单表 ID（网址 table= 后面，tbl 开头）
FEISHU_TABLE_ID_DUTY=     # 打卡清单表 ID
FEISHU_TABLE_ID_ORDERS=   # 订单表 ID
API_SECRET_KEY=           # 自定义一串字符
NEXT_PUBLIC_API_KEY=      # 必须和 API_SECRET_KEY 一样
```

飞书订单表需要有这些列（列名必须完全一致）：`订单号`、`下单时间`（日期）、`饮品明细`、`原价`、`优惠明细`、`实付金额`、`签名`。

---

## 部署

1. 推送到 GitHub 的 `main` 分支
2. 在 Vercel 导入这个仓库，框架会自动识别为 Next.js
3. 在 Vercel 项目的 **Settings → Environment Variables** 里填上面 8 个变量（Production 和 Preview 都要勾上）
4. 之后每次 `git push` 到 `main`，Vercel 都会自动重新部署

> 平板上的本地数据（没同步的订单、补货记录、设置）是跟着**网址**存的。换了部署网址就相当于一台新设备，切换前要先把旧网址上的订单同步完。

---

## 常见问题

- **打不开网址**：国内访问 `*.vercel.app` 需要 VPN。在 Vercel 绑定自己的域名后，一般不挂 VPN 也能打开。
- **侧边栏显示"待重试"**：说明订单还没同步上去，检查网络和环境变量；点一下那个图标可以立即重试。
- **订单号和飞书对不上**：在"设置 → 订单号"里手动校准下一单的序号。
- **飞书里改了菜单，平板上没变**：点单页右上角的 ↻ 可以立即刷新。
- **管理密码**：查看营业额的密码在 `app/ledger/page.tsx` 顶部的 `FINANCE_PASSWORD`。
- **`lib/syncToFeishu.ts` / `lib/syncDutyToFeishu.ts`**：这两个脚本会**清空**飞书表，再用代码里的默认数据重写，必须加环境变量 `CONFIRM_WIPE=yes` 才会执行，平时不要运行。

更新记录见 [CHANGELOG-v7.md](./CHANGELOG-v7.md)。
