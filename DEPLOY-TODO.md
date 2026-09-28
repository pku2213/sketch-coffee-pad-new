# 上线待办：把 v7.1 部署到店里平板

> 一共约 30 分钟。按顺序做，每完成一步打个勾 ☑️。
> 出了问题随时可以退回旧网址 `sketch-coffee.vercel.app`，旧的网址和平板上的数据都不会动。

---

## 第 0 步：出门前准备（今晚 / 明早）

- [ ] **确认代码已经全部推到 GitHub**
  ```powershell
  cd E:\sketch-coffee-v7.1
  git status      # 显示 "nothing to commit, working tree clean" 就说明都提交了
  git push        # 连不上就先打开 VPN
  ```
- [ ] **拿到 8 个环境变量**：私聊找 baobao-big 要，她在 Vercel 项目的 Settings → Environment Variables 里能看到。**拿不到这些，飞书就同步不了。**
  - [ ] `FEISHU_APP_ID`
  - [ ] `FEISHU_APP_SECRET`
  - [ ] `FEISHU_APP_TOKEN`
  - [ ] `FEISHU_TABLE_ID_MENU`
  - [ ] `FEISHU_TABLE_ID_DUTY`
  - [ ] `FEISHU_TABLE_ID_ORDERS`
  - [ ] `API_SECRET_KEY`
  - [ ] `NEXT_PUBLIC_API_KEY`（必须和上一个一样）
  - ⚠️ 这些是密钥，只存在自己电脑上，**不要发群、不要提交到 GitHub**。

---

## 第 1 步：在 Vercel 建项目（电脑上，约 10 分钟）

- [ ] 挂上 VPN，打开 <https://vercel.com>，点 **Continue with GitHub**，用 **pku2213** 登录
- [ ] 点 **Add New… → Project**，找到 `sketch-coffee-pad-new`，点 **Import**
  - 列表里没有的话：点 "Adjust GitHub App Permissions"，给 Vercel 授权这个仓库
- [ ] Framework Preset 会自动识别为 **Next.js**，其他设置不用改
- [ ] 展开 **Environment Variables**，把 8 个变量填进去
  - 小技巧：把整段 `KEY=VALUE` 文本直接粘贴进第一个输入框，Vercel 会自动拆成 8 条
- [ ] 点 **Deploy**，等 1–2 分钟
  - ❌ 失败了：点进 Deployment → **Build Logs**，把红字复制下来发给 Claude
- [ ] 记下新网址：`https://________________.vercel.app`
  - （可选）想改个好记的名字：Settings → **Domains**，比如改成 `sketch-coffee-shop.vercel.app`
- [ ] 进 Settings → **Environment Variables**，确认 8 个变量都勾选了 **Production** 和 **Preview**

---

## 第 2 步：在电脑上验证（约 5 分钟）

用电脑浏览器打开新网址：

- [ ] **菜单能从飞书拉下来**：点单页右上角点 ↻，提示"菜单已从飞书更新"
- [ ] **设置值班**：左下角 **设置 → 值班**，随便填个名字
- [ ] **订单能同步**：
  1. 点一单任意饮品 → 确认下单
  2. 去 **账本** → 点亮"付款""制作" → 点 **完成**
  3. 等 10 秒左右，看侧边栏底部是否显示 **已同步**
  4. 打开飞书订单表，确认多了这条记录
- [ ] **删掉测试记录**：把飞书表里这条测试订单删掉
  - ❌ 显示"待重试"：点一下那个图标，看报错文字，再检查环境变量有没有填错

---

## 第 3 步：到店里切换平板（约 10 分钟）

> ⚠️ 新网址和旧网址在平板上的数据是**分开存的**。旧网址上没完成、没同步的订单，不会自动搬到新网址。
> 建议挑一个没客人的空档来切换。

**先收尾旧网址**

- [ ] 平板上打开旧网址 `sketch-coffee.vercel.app`
- [ ] 把"制作中"的订单全部 **完成**
- [ ] 在账本的历史里点 **待同步**，确认所有订单都已经传到飞书
- [ ] 打开飞书订单表，记下**总共有多少单**：______ 单

**再切到新网址**

- [ ] 平板挂上 VPN，打开新网址
- [ ] 添加到桌面：华为浏览器菜单 → **添加到桌面**（以后从桌面图标打开，就是全屏的 App 样式）
- [ ] 左下角 **设置**：
  - [ ] **值班**：填当前值班的咖啡师
  - [ ] **订单号**：把"下一单序号"改成上面记下的总单数 **+ 1**
  - [ ] **皮肤**：选一套喜欢的
- [ ] **实际验证一单**：正常点一单 → 完成 → 飞书表里能看到
- [ ] 横屏、竖屏各转一下，看看显示是否正常

---

## 第 4 步：跟店员交代（2 分钟）

- [ ] **换班**：到 **账本** 顶部，点"当前值班"就能换人，之后完成订单默认用这个人签名
- [ ] **批量完成**：勾选多单 → **批量完成**；点错了，在弹出的提示里点 **撤销**
- [ ] **缺货**：去 **补货** → 点缺的原料 → **@舒舒** → **复制消息**，粘贴到群里发出去
- [ ] **东西到了**：在补货页点 **已到货**
- [ ] **侧边栏"待同步 / 待重试"**：一般会自动补传，点一下可以立即重试

---

## 以后改代码怎么上线

```powershell
cd E:\sketch-coffee-v7.1
npm run dev          # 本地改完先看效果
npm run build        # 确认能正常编译
git add -A
git commit -m "说明这次改了什么"
git push             # Vercel 会自动重新部署，平板刷新页面就是新版本
```

---

## 备忘

| 项目 | 内容 |
|---|---|
| GitHub 仓库 | `https://github.com/pku2213/sketch-coffee-pad-new` |
| 新网址 | `https://________________.vercel.app` |
| 旧网址（备用） | `https://sketch-coffee.vercel.app` |
| 管理密码 | `8888`（在 `app/ledger/page.tsx` 里可以改） |
| 以后可以做 | 在 Vercel 绑定自己的域名，平板不用挂 VPN 就能打开 |
