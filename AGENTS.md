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

* 笔记页：中文「分类/标签」+ 时间排序（「最新」在前且默认选中）+ 搜索；**三级筛选**：点击分类后展开章节面板（grid-rows 0fr→1fr 过渡、真实占位挤开下方内容不重叠、章节行横滑可选可不清选，选分类=面板开/关），再叠加标签与排序；**列表为卡片式、一行一个**（按年分组 → 单列竖排，复用 explore-card：hover 上浮 + 红色角标 + 火花粒子）；卡片内容顺序——时间（标记点+日期）→ 标题 → 类别 chip → 标签 chips（全部显示）→ 摘要（有则显示，line-clamp-2）→ READ →（hover 箭头右移），无经纬度装饰；筛选按钮（分类/标签/章节/排序）hover 上移 + 橙色光晕 + 变色

* 文章页目录：桌面 xl+ 左侧固定；**移动端右侧固定滑轨**（毛玻璃面板悬浮于屏幕内侧 right-4、不贴边；等长短横线，**当前章节=橙色发光圆圈（进度指示）**，其余为灰色短线；滑动浮出章节文字、划到的变长橙色、当前章节常驻橙色；createPortal 到 body 避免被 transform 祖先破坏 fixed）

* 回到顶部：右下角毛玻璃圆钮，滚动超 480px 出现（全端）

* **桌面端滚动进度条**（xl+，电脑专用）：隐藏原生滚动条，改为屏幕右缘内侧细轨 + **橙色发光圆圈**（位置=阅读进度，滚过 80px 淡入，点击/拖动可跳转）；移动端保持原生滚动条

* 鼠标光效：深浅主题均可用，底部信息区有开关；RSS 订阅链接已删（feed.xml 仍生成）

**内容结构（大类/章节二级目录）**

* `content/notes/` 支持嵌套：`大类/章节/文章.md`——一级目录名推断大类（中文原样、纯 ASCII 做 Title Case，如 `02-web-basics`→`Web Basics`）、二级目录名推断章节（去前导编号，如 `01-环境配置`→`环境配置`）；frontmatter 的 category/chapter 优先于目录推断

* slug 由完整相对路径派生（目录名参与），文章 URL 随其所在目录变化

**后台（本地 localhost:3001）**

* 文章管理：notes/research/projects 增删改（Markdown 编辑器、图片上传、md 导入）；**标题可留空**——保存时自动取正文首个 H1（或文件名）兜底

* **批量导入**：多文件 + 大类/章节/标签三选（可任意组合；章节候选随大类联动，来自 taxonomy + 已有文章聚合）；弹窗用 createPortal 挂 body（此前 transform 祖先导致 fixed 失效显示虚影的 bug 已修）；**支持选文件夹/拖整个文件夹**——图片自动批量上传（进度条、8 张/批）并把 md 内相对路径（含 `<>` 空格路径、URL 编码路径）改写为 `/uploads/` 绝对地址；存量 md 的相对路径图片由构建时 `lib/content.ts` 重写（复制到 `public/content-images/`，md5 内容哈希命名）并需随 git 入库；编辑器正文支持拖入/粘贴图片直接上传插入

* **批量操作**（列表勾选）：checkbox 列 + 底部浮动操作条（portal 挂 body）；批量删除（confirm + 清空目录）；批量修改弹窗四项可选——大类（留空=移到根/未分类）、章节（留空=移出章节，按新大类或各文章现有大类落位）、追加标签、移除标签（含所选文章现有标签 chips 一键填入）；仅改标签时原地重写不动文件与 slug，改分类/章节则移动文件（slug 随目录变化，接口 POST /api/posts/batch）；**按住 Shift 点击复选框可连续选中区间**（锚点=上次普通点击行，列表顶部有提示）

* **列表筛选**（仿前端笔记页）：文章列表上方关键词搜索（标题/摘要/标签）+ 分类 chips + **选中分类后联动显示该分类的章节 chips**（仿前端章节面板）+ 标签 chips + 匹配计数（n / total）+ 清除筛选；切类型自动重置筛选；全选作用于筛选结果

* **选择器替换**（TaxonomySelect 组件，`components/admin/taxonomy-select.tsx`）：分类/章节/状态全部弃用原生 datalist——原生行为「输入框有值后被过滤得只剩匹配一项、想换必须删光」，且样式丑。组件两种形态：`chips` 候选常驻输入框下方（始终全部可见、点选即替换、当前值高亮、带清除 ×，用于批量弹窗）；`dropdown` 点开面板全列候选（未输入不按 value 过滤、键盘输入才过滤、点外关闭，用于编辑器紧凑表单元信息）

* **分类/章节排序**：「分类与标签」页分类卡片与章节竖排列表均可**拖拽排序**（⠿ 手柄，拖过目标位橙色高亮+上移）；顺序存 taxonomy.json；后台 GET /api/taxonomy 不再强制对章节重排序（聚合只追加缺失项）；前台笔记页分类/章节展示顺序遵循 taxonomy 数组顺序（未收录的分类/章节按文章数/名称垫后，改自 notes-browser.tsx 的 countBy 排序）

* **落盘位置**：新建/编辑/导入均按大类/章节放入对应文件夹，且**优先复用已存在的分类文件夹**（'Web Basics'→已有的 `02-web-basics/`），章节文件夹同理；删除文章后自动清理变空的章节/大类目录；编辑保存 slug 不漂移

* **外观设置**：5 个字号滑块（正文/列表标题/列表摘要/页面大标题/导航）+ 深浅主题文字颜色，写入 appearance.json

* 分类/标签/章节管理：GET /api/taxonomy 会聚合文章实际使用的大类与章节（frontmatter 优先、目录推断兜底）合并进候选；大类/章节重命名走 /api/taxonomy/rename 按生效值级联更新所有相关文章 frontmatter（目录与 slug 不动，前后台显示一致）

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
13. **横滑「时有时无」+ 回顶按钮跳动 + 经纬度换行（三连修）**：① 横滑真凶 = Reveal 入场动画 `.rv-right/.rv-left` 初始位移 ±44px 把未入场的元素推出视口（动画完成后位移消失 → 时有时无）；scrollWidth(410)>clientWidth(390) 实锤。修复：布局容器（layout.tsx 的 `div.relative.flex.min-h-svh.flex-col`）加 `overflow-x-clip`——clip 真正裁掉溢出（scrollWidth==clientWidth）且**不产生滚动容器、不破坏 sticky**（已实测钉顶正常），注意 clip 与 hidden 的区别：body 的 hidden 只是传播到视口，溢出区域仍存在，安卓浏览器照样显示横滑指示条。② 回顶按钮跳动 = fixed+bottom 元件随浏览器工具栏显隐（视口高度变化）移动，浏览器各异 → 修复：按钮挂进 `.back-top-anchor`（fixed 容器，高 100lvh 恒定 + 底部 padding 抬高躲悬浮工具栏，桌面 1.5rem/移动 4.75rem），位置永久稳定。③ 经纬度换行 = mono-label 0.18em 字距下该行 ~165-185px，提示容器 left-1/2 的可用宽只有 50vw，窄屏+字体差异下偶尔换行 → 容器加 `whitespace-nowrap`（居中 translate 下不会溢出视口）。

14. **笔记「大类/章节」二级内容体系**：① 内容结构——`content/notes/` 支持 `大类/章节/文章.md` 嵌套，目录名推断分类层级（frontmatter 优先）；② 前台——笔记页点分类展开章节面板（挤开不重叠、横滑选择、可再叠加标签/排序）；③ 后台——批量导入弹窗 portal 修虚影 bug + 大类/章节/标签三选联动、编辑器标题可空（H1 兜底）、taxonomy 页章节增删改 + 重命名级联、新建/导入落盘按大类/章节进文件夹且复用已有分类文件夹（'Web Basics'→`02-web-basics/`）、删除清理空目录。**教训**：a) `Array.sort(collator)` 不能直接传 Collator 对象（需 `(a,b)=>collator.compare(a,b)`），报「comparison function must be a function」且经 500 冒泡到页面；b) placeFile 的 taken 去重必须排除文章自身，否则原地重复保存 slug 会漂移加后缀；c) 后台读 category 只看 frontmatter 会与前台目录推断不一致——统一用 effectiveTaxonomy（frontmatter ?? 目录推断）。

15. **图片体系 + 后台批量操作**：① 存量图片——构建时 `lib/content.ts` rewriteImagePaths 把 md 相对路径图片复制到 `public/content-images/`（md5 命名）并改写为绝对 URL（Notion 的 `?width=` 查询串已剥）；② 批量导入支持选/拖整个文件夹（webkitdirectory + DataTransfer entries 递归展开），图片先批量上传（映射「原相对路径→/uploads/URL」，提交时统一改写 md，覆盖普通/`<>`/URL 编码三种路径写法）；③ 编辑器拖入/粘贴图片直接上传插入；④ 后台列表勾选批量删除/批量修改（大类/章节/加标签/移标签，POST /api/posts/batch；仅标签原地重写不动 slug，改分类/章节则移动文件）。**教训**：admin-server 手写 frontmatter 解析器对无引号 YAML 流式数组（`tags: [GIS, 遥感]`）JSON.parse 失败会降级成字符串→标签被静默丢掉，需按逗号拆分兜底（前台 gray-matter 无此问题）；批量操作后移动过的文章 slug 随目录变化，二次操作前必须重新解析 slug。

16. **三 bug 连修（批量操作报「无效的内容类型」+ 颜色设置全失效 + 预览不动）**：① admin-server 所有接口的 type 都从 URL query 读，前端调用 `/api/posts/batch` 漏带 `?type=` → 服务端 type=undefined 报 400「无效的内容类型」，**API 测试通过但 UI 失败**（测试脚本带了 query）——教训：前后端联调 bug 测试要与 UI 走完全相同的数据流；② `appearanceCssFrom` 模板字符串漏闭合 `}`：颜色全空时靠 EOF 自动闭合侥幸正常，一旦设置颜色，后续 `:root{--ink:...}` 被当坏声明吞掉 → **所有颜色静默失效**（字号碰巧在坏声明之前所以幸存）——教训：拼接 CSS 必须单元验证括号配对；③ 实时预览失效：layout 注入的 `<style>`（React 19 无 precedence 原地渲染）在 **body 开头**，预览 style 挂 head 末尾——同特异性 CSS 后出现者赢，body 里的保存值永远覆盖 head 里的预览值 → 拖滑块没反应——修复：预览 style `document.body.appendChild` 挂 body 末尾。另：rg 的 `-rn` 不是「递归+行号」而是 `-r n`（替换为字母 n），会污染搜索结果显示 `var(--n)` 假象，排查 CSS 变量时差点被带偏。④ 后续排查「深色主题文字层级全乱」：修好颜色功能后，**测试期间写进 appearance.json 的脏颜色值开始真实生效**（inkSoft/inkFaint 被残留成近白色，弱化文字比标题还亮）——教训：功能修复上线后必须清查测试期写进配置文件的脏数据，appearance.json 颜色全空 = 用 globals.css 原始默认色。

17. **选择器 + 排序 + 后台筛选（用户第 5 轮「后台选大类只剩那一个、选择框丑、要拖拽排序」+ 追加「后台加筛选、Shift 连选」）**：① 弃用全部原生 datalist（`<input list>` 有值会被过滤只剩匹配项、想换必须删光、样式不可控）→ 新建 `components/admin/taxonomy-select.tsx`：`chips` 形态候选常驻全部可见点选即替换（批量弹窗 4 处）；`dropdown` 形态点开全列、键盘输入才过滤、点外关闭（编辑器分类/章节/状态 3 处）；② 「分类与标签」页加**拖拽排序**（HTML5 draggable：分类卡片整卡拖、章节改竖排列表拖，⠿ 手柄、目标位橙框+上移反馈），顺序写回 taxonomy.json；③ admin-server GET /api/taxonomy **删掉原先的章节 zhNumeric 强制排序**（会覆盖后台调好的顺序），聚合仅追加缺失项；④ 前台 `notes-browser.tsx` 分类/章节顺序改为**优先遵循 taxonomy 数组顺序**（未收录项按文章数/名称垫后），notes/page.tsx JSON import taxonomy.json 传入。**教训**：a) TS 对 const 函数表达式内前向引用块级变量（filteredPosts）报错——把派生 memo 移到引用它的函数前即可；b) `posts.map(...).filter(Boolean)` 传给 string[] 要写类型守卫 `filter((c): c is string => Boolean(c))`，否则 TS2322；c) dev 残留进程占 3000 会让 Next.js 自动挪到 3001 与后台服务打架——重启 dev 前先清 3000/3001 端口监听；d) 常规登录流程的 checkbox 勾选加 Shift 连选用 `onClick`（带 native shiftKey）而非 onChange。

18. **卡片化 + hover 动效（「后台选分类后把章节放出来」「筛选按钮鼠标移上去会变化」「笔记/研究每条都加首页那种卡片」）**：① 后台列表筛选加 `listChapter`——选中分类后联动显示该分类的章节 chips（仿前端章节面板，切分类/切类型/清除筛选均重置）；② 前台 FilterButton（分类/标签/章节/排序共用）hover 动效：上移 2px + 橙色光晕（shadow）+ 边框/文字变橙，active 按压回弹（`transition-all duration-200`）；③ 笔记页列表从「按年分组的横条 li」改为「按年分组 → 网格（sm:2 列 / lg:3 列）+ NoteCard」——`note-card.tsx` props 改瘦类型 `Pick<Note,'slug'|'title'|'date'|'summary'|'category'>` 以兼容前台 NoteMeta（原只服务首页全量 Note）并删掉 notes-browser 里不再用的 Link import；④ 研究页 `research-item.tsx` 从 hover 变底色横条改为 explore-card 卡片（corner 角标 + SparkField 火花 + READ/DETAIL 箭头 + 状态/分类/标签），research/page.tsx 列表改 `grid md:grid-cols-2` + Reveal h-full 等高。项目页早已是 ProjectCard 卡片，三列表页风格至此统一。**教训**：卡片网格中 Reveal（client 组件）作为 grid item 要传 `className="h-full"` 让内部 `h-full` 卡片等高对齐。

19. **笔记卡片化最终形态（多轮澄清收敛：「太高了」「我是说卡片竖着排不是内容，一行一个」「总之就是在原先没有动效的基础上加个卡片而已」）**：内容布局**最终按原列表结构还原**——行一横排：日期（MM-DD）| 标题（flex-1 截断）| 类别 chip | 标签 chips（前 3 个，sm+ 显示）| READ →；行二：摘要（有则显示，单行截断）；只在外层套 explore-card（hover 上浮 + 角标 + 火花粒子）。后追加微调：类别 chip 加橙色描边+文字+光晕（先后加 bg-accent/10 背景因「像报错」被撤），标签移到类别之后，年标题 13→16px、卡内文字整体放大一档（标题 18px、摘要 15px 等）。笔记页列表 = 按年分组 + 单列竖排（一行一个）。**教训（重要）**：做「加卡片」类需求时先问/先还原原布局再套壳，别自作主张重排内容（期间排过竖堆六行 → 被嫌太高 → 又横排 → 仍被纠正）；用户说得最清楚的一次是「在原先没有动效的基础上加个卡片而已」——锚定原样式，改动只做加法。

20. **桌面端滚动条个性化（「右侧滑动的条个性化、别贴屏幕、橙色圆圈代表当前进度」——曾误改移动端目录滑轨被纠正「我指的不是目录，是最右侧的滑轨，手机版不用做」）**：① 移动端目录滑轨 `mobile-toc-rail.tsx` 保持原版不动（等长横线、贴边 right-3）；② 桌面端（xl+）**隐藏原生滚动条**（globals.css @media 1280px：webkit width:0 + Firefox scrollbar-width:none）；③ 新建 `components/scroll-progress-dot.tsx` 全站挂 layout——屏幕右缘内侧细轨（right-3、top/bottom 22vh 不贴边不贴底）上悬浮**橙色发光圆圈**，位置 = scrollTop/可滚高度（随滚动移动=进度），滚过 80px 淡入，点击轨道/拖动圆点可跳转；④ 移动端保持原生滚动条。**教训**：用户说「右侧滑动的条」默认指**浏览器滚动条**而非自定义目录组件——先看截图/红框再动手，别凭第一印象改错对象（这是本会话第二次「改错范围、先还原再说」）。

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

