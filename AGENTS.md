# AGENTS.md — 未完成的地图（EZNINE GIS 空间站）项目档案

> 本文件是给 AI 助手（及未来的自己）看的项目说明书：项目是什么、有什么功能、
> 我们一起做了什么、用户（张鹏）的习惯偏好。每次大改动后应更新。

## 一、项目是什么

**未完成的地图**（曾用名：EZNINE 的 GIS 空间站）——一个地理信息科学（GIS）方向研究生的个人博客。

* 站长：张鹏，地理信息科学方向硕士生

* 方向：生态安全格局、InSAR 形变监测、WebGIS 可视化

* 视觉主题：「未完成的地图」——全站以地形图/等高线为核心隐喻，米白 + 墨色 + 橙红（accent #ff4b33 / #d3381c）配色，制图注记式小字（mono-label），大量制图术语装饰（图幅、坐标、经纬网）

## 二、技术栈与架构

| 层  | 技术                                                                  |
| -- | ------------------------------------------------------------------- |
| 框架 | Next.js 15（App Router，`output: 'export'` 静态导出）                      |
| 样式 | Tailwind CSS v4 + CSS 变量（主题色/字号可调）                                  |
| 背景 | WebGL2 shader 等高线全站固定层（`topo-shader-field.tsx`），支持鼠标扰动              |
| 部署 | GitHub Pages（静态导出，`npm run build` 产物在 `out/`，没有 `next start`）       |
| 后台 | 本地 Node API（`scripts/admin-server.mjs`，端口 3001，`x-admin-token` 头认证） |

**开发命令**：`npm run dev`（`scripts/dev.mjs` 同时启动 Next.js 和后台服务，无需手动分开跑；3001 被占用会优雅退出）。

## 三、目录结构要点

```
app/                 页面（首页/notes/research/projects/archive/about/search/admin）
components/          组件（含 admin/ 后台组件）
content/
  copy/              ★ 全部页面文案（见下）
  notes/             笔记 md（含子目录，中文文件名自动转 ASCII slug）
  research/ projects/
  appearance.json    ★ 外观配置（字号/颜色，后台可调）
  taxonomy.json      后台分类/标签候选
  pages/about.md     关于页长文
lib/site.ts          读取 content/copy/
lib/appearance.ts    读取 appearance.json 生成 CSS 变量
scripts/             dev.mjs / admin-server.mjs / feed.mjs
public/uploads/      后台上传的图片
```

**文案系统（用户明确要求的结构）**：`content/copy/` 按页面拆分、按编号排序，文件内字段顺序 = 页面从上到下顺序：

* `00-站点信息.json`：全站共用数据（姓名/坐标/邮箱/简介/浏览器标题/导航栏/底部信息栏）——**不是页面文案**，是跨页引用源

* `01-首页.json`：开场大屏（titleLines 大字、bio）、方向卡、三个内容区块、结束语

* `02-笔记页.json` \~ `08-404页.json`：各页标题区及页内文字

**重要**：首页大字（hero.titleLines）和简介（hero.bio）在 01-首页.json 里独立可改，不影响关于页/页脚。用户对「文案必须逐页独立、好找、按顺序」非常在意。

## 四、功能清单

**前台**

* 首页开场（用户称「**封面**」）：滚动驱动 260vh 舞台——等高线背景缩放 + 文字分层浮现（统一进度变量 p，双向可逆）；三行大字米白→红渐变流光（12s 无缝循环）；十字丝跟随鼠标显示经纬度（基准 37.74, 112.66）；底部提示（箭头→向下滑动→SCROLL TO EXPLORE→经纬度橙色）

* 导航栏：桌面端常驻；**仅移动端**下滑收起/上滑出现；首页开场阶段隐藏、滚动约 15% 后出现；磁吸 hover（含搜索/主题按钮）；EZNINE logo（线框地球+红点+电路字母）

* 全站文字背景光晕（radial 暗色纱罩）保证可读性；代码块/图片 text-shadow: none

* 笔记页：中文「分类/标签」+ 时间排序（「最新」在前且默认选中）+ 搜索

* 文章页目录：桌面 xl+ 左侧固定；**移动端右侧固定滑轨**（等长短横线，滑动浮出章节文字、划到的变长橙色、当前章节常驻橙色；createPortal 到 body 避免被 transform 祖先破坏 fixed）

* 回到顶部：右下角毛玻璃圆钮，滚动超 480px 出现（全端）

* 鼠标光效：深浅主题均可用，底部信息区有开关；RSS 订阅链接已删（feed.xml 仍生成）

**后台（本地 localhost:3001）**

* 文章管理：notes/research/projects 增删改（Markdown 编辑器、图片上传、md 导入）

* **批量导入**：多文件 + 统一分类 + 追加标签

* **外观设置**：5 个字号滑块（正文/列表标题/列表摘要/页面大标题/导航）+ 深浅主题文字颜色，写入 appearance.json

* 分类/标签候选管理

* 入口在首页底部信息区（SiteUtilities 组件，含光效开关）

## 五、已完成的演进历程（与用户协作记录）

1. **初始 Demo**（commit 9f48dec）：基础站点 + 8 笔记/4 项目/3 研究 + GitHub Pages 工作流
2. **视觉大改**：去导航栏编号、卡片粒子动效（参考豆包风格）、目录左移、配色调整、字号加大
3. **品牌与可读性**：EZNINE logo 替换 GEO·NOTES、全站文字光晕、导航磁吸 hover、移动端目录下拉
4. **Git 初始化 + 后台系统**：首个 commit；本地 admin server（编辑/上传/分类标签）；「首页」导航直达内容区；浅色主题光效 + 开关
5. **第二批功能**：笔记页中文标签 + 时间排序、列表文字加深加大、外观设置系统（appearance.json + CSS 变量注入）、批量导入、favicon 换地球 logo、去 CTA 发光、（粒子大字动效后因卡顿回退为静态渐变）
6. **细节打磨**：进页闪现修复（禁滚动恢复 + 导航初始隐藏）、流光循环无缝化、页脚删 RSS/SHEET NO. 001、坐标统一 37.74,112.66（十字丝以此为基准）、底部提示纵排
7. **文案系统重构**：site.json 大文件 → content/copy/ 按页面拆分独立可编辑（用户两次纠正才到位：①不要全局页 ②首页大字/简介必须独立于站名，改名字不影响其他页）
8. **交互升级**：方向卡复用探索卡动效并分缝；三内容卡上移加动效；移动端导航收起逻辑（桌面不收）；回到顶部按钮；移动端目录改为右侧固定滑轨（经历 portal 修复 transform 定位 bug、扇形→等长、文字位置/字号多轮微调）
9. **commit 582d96a**「第一次双端调试，页面独立修改」
10. 封面底部经纬度改橙色
11. **部署上线**：推送到 github.com/eznine/my-blog（强推覆盖旧版 HTML 小站），GitHub Actions 自动构建发布到 https://eznine.github.io/my-blog；后台密码已更换为随机强密码（不再用 eznine）；README.md 已写
12. **移动端/低窗口视口适配 + 一次重大排障教训**：vh→svh 全站替换 + 安全区抬升；封面 sticky 容器从「定高+overflow-hidden 裁切」改为「min-height:100svh + overflow-x:clip，内容超高时容器生长」（此结构用户验证 OK）。**教训（浪费了两轮修复）：commit ed75c50 在 html 上加了 `overflow-x:hidden` 与 body 的叠加，导致 body 变成真实滚动容器，全站 `position:sticky` 失效**——封面跟着滚走，症状是「第一页显示不全/有缝隙/往下滑内容消失」，与封面结构无关。062bce9→ed75c50 的 diff 定位到根因。**铁律：横向裁切只放 body（overflow-x:hidden 会传播到视口、不产生滚动容器），html 绝不设 overflow-x**；`overscroll-behavior-x:none`（html）禁安卓横向过滚指示条；`.hero-hint` 移动端锚点留空 11rem（≥提示高 108px+夸克悬浮底栏 56px），否则末行经纬度被底栏盖住。修复后用浏览器实测：sticky 钉顶、内容完整、下一区块间隙 1px、无横向滚动 ✓

## 六、用户的偏好与协作习惯（重要！）

* **快速**：不要无谓操作，小改动不用浏览器调试，大改动才确认；表述直接，不喜欢反复确认

* **术语习惯**：把首页开场大屏叫「**封面**」；「橙/红色」均指主题 accent 色

* **文案洁癖**：所有文字必须能独立修改、位置好找、按页面顺序排列；中文为主，讨厌生硬直译（如「最新优先」→ 最终定为「最新/最早」）

* **性能敏感**：粒子大字动效因卡顿被撤下；移动端动画在意流畅度

* **双端思维**：手机和电脑分别验证，移动端体验优先级高（目录滑轨、导航收起都是移动端专属）

* **安全提醒**：site.config.json 含 adminPassword，已加入 .gitignore 不入库；密码绝不写进文档/README/提交信息

## 七、已知问题 / 待办

* [x] 部署到 GitHub：已推送 github.com/eznine/my-blog（覆盖旧版），Actions 自动发布到 https://eznine.github.io/my-blog；后台密码已更换为随机强密码，且 site.config.json 已加入 .gitignore 不入库（密码只在本地文件，勿写进任何文档）
* [ ] 首次部署需在仓库 Settings → Pages → Source 选 GitHub Actions（网页操作）
* [ ] 用户提过「右侧有点空」的方案（图幅注记面板/陕西轮廓+西安脉冲点/研究方向速览）尚未选定实施
* [ ] feed.xml 生成脚本若确认不要 RSS 可删

