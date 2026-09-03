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

* **笔记 Demo 演示面板（2026-09-02）**：笔记 frontmatter 加 `demo`（路径/外链）+ `demoLabel`（面板标题，默认文章标题）+ `demoHeight`（iframe 高度 px，默认 440）。**桌面端（xl+）是「演示模式」**：标题右侧「运行 DEMO」按钮（accent 实底 CTA + 白色强呼吸圆点，`demo-ping` 1.1s 扩散 2.8 倍）点击后给最外层容器挂 `data-demo="open"`——**左右各半屏**：左侧目录隐藏、正文留出右半（`.demo-panel-row` padding-right 50%）、右侧面板 `position:fixed` 占满右半边屏幕（宽 50% 全高，iframe flex 填满），左边文章独立滚动，可边读边玩；再点「关闭 DEMO」还原。**窄屏（<xl）**按钮在正文上方展开面板、收起即销毁。iframe 首见才挂载 src（隐藏容器不下载）。面板经 `createPortal` 挂两个锚点：`#note-demo-sidebar`（正文行尾部，display 由 CSS 控制）与 `#note-demo-inline`（头部下方，`xl:hidden`）。站内路径自动补 basePath 前缀（GitHub Pages 子路径）**且以 / 结尾自动补 index.html**（Next 静态服务不做目录解析，`/demos/x/` 会 404；GH Pages/Nginx 才自动解析）；外链（https/协议相对/data:）原样。

**Demo 代码编辑（练习模式，2026-09-03）**：控制栏新增「编辑代码」按钮（同源 demo 才显示，外链/跨域无此按钮）→ 控制栏下方展开暗色编辑区（`demo-code-editor`，底色跟随 `--code-bg` 代码块暗底，按钮在暗底上重配色）。首次展开 `fetch(demo.src)` 读源码进 **CodeMirror 6**（`@uiw/react-codemirror` 懒加载 dynamic + `@codemirror/lang-html`，VSCode 式语法高亮：`demoTheme`/`demoHighlight` 全部复用 `--hl-*`/`--code-*` CSS 变量，深浅主题即时变色；行号、Tab 缩进（`indentWithTab`）、Ctrl/⌘+Enter 运行）；点「运行 ▸」把编辑后的源码 `withBase` 注入 `<base href="<demo目录>/">`（srcdoc 无真实 URL，相对 `lib/...` 路径靠它解析）后经 `srcDoc` 当场刷新 iframe，地图/瓦片即时生效；「重置」还原原始源码并重新渲染。**编辑区与下方 iframe 之间是拖动分隔条**（`.demo-code-resizer`，pointer 事件 + window 监听，范围 90px ~ 留足 iframe 120px，高度存 `edHRef` 会话内收起/展开后保持）；**左侧文章与右侧演示面板也有竖向拖动条**（`.demo-colsplit-resizer`，贴面板左缘 16px 宽、hover/拖拽橙线，`--demo-split` 打 `<html>` 上同源驱动 `#note-demo-sidebar` 宽度与 `.demo-panel-row` padding-right，320px ~ 视口宽-360px（文章最小留白）、`setPointerCapture` + 拖拽中 iframe `pointer-events:none`，移动端 <768px 整屏隐藏；比例存 `splitWRef` 会话内保持）；**全程只改内存、不写文件**，关掉「关闭 DEMO」即彻底丢弃。

**后台上传 Demo（2026-09-02）**：编辑器笔记类型 Demo 字段区有「⬆ 上传 .zip / .html」按钮——`POST /api/demo-upload`（admin-server，依赖 adm-zip）：单 html 直接写 `public/demos/<名>/index.html`；zip 解压（过滤 `../` 路径穿越、zip 外层包一级目录自动上移、无 index.html 取首个 html 当入口），目录名取 query `name` 或文件名主干（仅小写字母数字连字符，重名自动加 `-n` 后缀），返回 `/demos/<名>/` 并自动填入 demo 输入框、demoLabel 填文件名。**部署注意（TODO）**：eznine.xyz standalone 运行时上传的 demo 不会出现在构建期复制进 standalone 的 `public/` 里——需仿照 uploads 把 `public/demos` 加进部署脚本符号链接（或 Nginx alias），否则后台上传的 demo 前台 404。

现有 8 个示例（`F:\learn_webgis\05-leaflet\examples` 的 01~08 全部接入）：`leaflet-hello-map`(01 第一张地图)、`leaflet-basemap-switch`(02 底图与瓦片源，依赖 leaflet-providers)、`leaflet-marker-icons`(03 标记与图标)、`leaflet-geojson`(05 GeoJSON 图层)、`leaflet-events`(06 事件与交互，替换了原 04 popup)、`leaflet-layer-controls`(07 图层组织与控件)、`leaflet-plugins`(08 常用插件，依赖 markercluster/heat/minimap/fullscreen 四插件)、`leaflet-popup-click`(04 点击查看详情，已不在笔记挂载但文件保留)。每个 demo 目录只拷依赖的 lib（`lib/leaflet/dist/{leaflet.css,leaflet.js,images/}` + 各插件 dist），不拷整库。

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

11. **部署上线**：推送到 github.com/eznine/my-blog（强推覆盖旧版 HTML 小站），GitHub Actions 自动构建发布到 <https://eznine.github.io/my-blog；后台密码已更换为随机强密码（不再用> eznine）；README.md 已写

12. **移动端/低窗口视口适配 + 一次重大排障教训**：vh→svh 全站替换 + 安全区抬升；封面 sticky 容器从「定高+overflow-hidden 裁切」改为「min-height:100svh + overflow-x:clip，内容超高时容器生长」（此结构用户验证 OK）。**教训（浪费了两轮修复）：commit ed75c50 在 html 上加了** **`overflow-x:hidden`** **与 body 的叠加，导致 body 变成真实滚动容器，全站** **`position:sticky`** **失效**——封面跟着滚走，症状是「第一页显示不全/有缝隙/往下滑内容消失」，与封面结构无关。062bce9→ed75c50 的 diff 定位到根因。**铁律：横向裁切只放 body（overflow-x:hidden 会传播到视口、不产生滚动容器），html 绝不设 overflow-x**；`overscroll-behavior-x:none`（html）禁安卓横向过滚指示条；`.hero-hint` 移动端锚点留空 11rem（≥提示高 108px+夸克悬浮底栏 56px），否则末行经纬度被底栏盖住。修复后用浏览器实测：sticky 钉顶、内容完整、下一区块间隙 1px、无横向滚动 ✓

13. **横滑「时有时无」+ 回顶按钮跳动 + 经纬度换行（三连修）**：① 横滑真凶 = Reveal 入场动画 `.rv-right/.rv-left` 初始位移 ±44px 把未入场的元素推出视口（动画完成后位移消失 → 时有时无）；scrollWidth(410)>clientWidth(390) 实锤。修复：布局容器（layout.tsx 的 `div.relative.flex.min-h-svh.flex-col`）加 `overflow-x-clip`——clip 真正裁掉溢出（scrollWidth==clientWidth）且**不产生滚动容器、不破坏 sticky**（已实测钉顶正常），注意 clip 与 hidden 的区别：body 的 hidden 只是传播到视口，溢出区域仍存在，安卓浏览器照样显示横滑指示条。② 回顶按钮跳动 = fixed+bottom 元件随浏览器工具栏显隐（视口高度变化）移动，浏览器各异 → 修复：按钮挂进 `.back-top-anchor`（fixed 容器，高 100lvh 恒定 + 底部 padding 抬高躲悬浮工具栏，桌面 1.5rem/移动 4.75rem），位置永久稳定。③ 经纬度换行 = mono-label 0.18em 字距下该行 \~165-185px，提示容器 left-1/2 的可用宽只有 50vw，窄屏+字体差异下偶尔换行 → 容器加 `whitespace-nowrap`（居中 translate 下不会溢出视口）。

14. **笔记「大类/章节」二级内容体系**：① 内容结构——`content/notes/` 支持 `大类/章节/文章.md` 嵌套，目录名推断分类层级（frontmatter 优先）；② 前台——笔记页点分类展开章节面板（挤开不重叠、横滑选择、可再叠加标签/排序）；③ 后台——批量导入弹窗 portal 修虚影 bug + 大类/章节/标签三选联动、编辑器标题可空（H1 兜底）、taxonomy 页章节增删改 + 重命名级联、新建/导入落盘按大类/章节进文件夹且复用已有分类文件夹（'Web Basics'→`02-web-basics/`）、删除清理空目录。**教训**：a) `Array.sort(collator)` 不能直接传 Collator 对象（需 `(a,b)=>collator.compare(a,b)`），报「comparison function must be a function」且经 500 冒泡到页面；b) placeFile 的 taken 去重必须排除文章自身，否则原地重复保存 slug 会漂移加后缀；c) 后台读 category 只看 frontmatter 会与前台目录推断不一致——统一用 effectiveTaxonomy（frontmatter ?? 目录推断）。

15. **图片体系 + 后台批量操作**：① 存量图片——构建时 `lib/content.ts` rewriteImagePaths 把 md 相对路径图片复制到 `public/content-images/`（md5 命名）并改写为绝对 URL（Notion 的 `?width=` 查询串已剥）；② 批量导入支持选/拖整个文件夹（webkitdirectory + DataTransfer entries 递归展开），图片先批量上传（映射「原相对路径→/uploads/URL」，提交时统一改写 md，覆盖普通/`<>`/URL 编码三种路径写法）；③ 编辑器拖入/粘贴图片直接上传插入；④ 后台列表勾选批量删除/批量修改（大类/章节/加标签/移标签，POST /api/posts/batch；仅标签原地重写不动 slug，改分类/章节则移动文件）。**教训**：admin-server 手写 frontmatter 解析器对无引号 YAML 流式数组（`tags: [GIS, 遥感]`）JSON.parse 失败会降级成字符串→标签被静默丢掉，需按逗号拆分兜底（前台 gray-matter 无此问题）；批量操作后移动过的文章 slug 随目录变化，二次操作前必须重新解析 slug。

16. **三 bug 连修（批量操作报「无效的内容类型」+ 颜色设置全失效 + 预览不动）**：① admin-server 所有接口的 type 都从 URL query 读，前端调用 `/api/posts/batch` 漏带 `?type=` → 服务端 type=undefined 报 400「无效的内容类型」，**API 测试通过但 UI 失败**（测试脚本带了 query）——教训：前后端联调 bug 测试要与 UI 走完全相同的数据流；② `appearanceCssFrom` 模板字符串漏闭合 `}`：颜色全空时靠 EOF 自动闭合侥幸正常，一旦设置颜色，后续 `:root{--ink:...}` 被当坏声明吞掉 → **所有颜色静默失效**（字号碰巧在坏声明之前所以幸存）——教训：拼接 CSS 必须单元验证括号配对；③ 实时预览失效：layout 注入的 `<style>`（React 19 无 precedence 原地渲染）在 **body 开头**，预览 style 挂 head 末尾——同特异性 CSS 后出现者赢，body 里的保存值永远覆盖 head 里的预览值 → 拖滑块没反应——修复：预览 style `document.body.appendChild` 挂 body 末尾。另：rg 的 `-rn` 不是「递归+行号」而是 `-r n`（替换为字母 n），会污染搜索结果显示 `var(--n)` 假象，排查 CSS 变量时差点被带偏。④ 后续排查「深色主题文字层级全乱」：修好颜色功能后，**测试期间写进 appearance.json 的脏颜色值开始真实生效**（inkSoft/inkFaint 被残留成近白色，弱化文字比标题还亮）——教训：功能修复上线后必须清查测试期写进配置文件的脏数据，appearance.json 颜色全空 = 用 globals.css 原始默认色。

17. **选择器 + 排序 + 后台筛选（用户第 5 轮「后台选大类只剩那一个、选择框丑、要拖拽排序」+ 追加「后台加筛选、Shift 连选」）**：① 弃用全部原生 datalist（`<input list>` 有值会被过滤只剩匹配项、想换必须删光、样式不可控）→ 新建 `components/admin/taxonomy-select.tsx`：`chips` 形态候选常驻全部可见点选即替换（批量弹窗 4 处）；`dropdown` 形态点开全列、键盘输入才过滤、点外关闭（编辑器分类/章节/状态 3 处）；② 「分类与标签」页加**拖拽排序**（HTML5 draggable：分类卡片整卡拖、章节改竖排列表拖，⠿ 手柄、目标位橙框+上移反馈），顺序写回 taxonomy.json；③ admin-server GET /api/taxonomy **删掉原先的章节 zhNumeric 强制排序**（会覆盖后台调好的顺序），聚合仅追加缺失项；④ 前台 `notes-browser.tsx` 分类/章节顺序改为**优先遵循 taxonomy 数组顺序**（未收录项按文章数/名称垫后），notes/page.tsx JSON import taxonomy.json 传入。**教训**：a) TS 对 const 函数表达式内前向引用块级变量（filteredPosts）报错——把派生 memo 移到引用它的函数前即可；b) `posts.map(...).filter(Boolean)` 传给 string\[] 要写类型守卫 `filter((c): c is string => Boolean(c))`，否则 TS2322；c) dev 残留进程占 3000 会让 Next.js 自动挪到 3001 与后台服务打架——重启 dev 前先清 3000/3001 端口监听；d) 常规登录流程的 checkbox 勾选加 Shift 连选用 `onClick`（带 native shiftKey）而非 onChange。

18. **卡片化 + hover 动效（「后台选分类后把章节放出来」「筛选按钮鼠标移上去会变化」「笔记/研究每条都加首页那种卡片」）**：① 后台列表筛选加 `listChapter`——选中分类后联动显示该分类的章节 chips（仿前端章节面板，切分类/切类型/清除筛选均重置）；② 前台 FilterButton（分类/标签/章节/排序共用）hover 动效：上移 2px + 橙色光晕（shadow）+ 边框/文字变橙，active 按压回弹（`transition-all duration-200`）；③ 笔记页列表从「按年分组的横条 li」改为「按年分组 → 网格（sm:2 列 / lg:3 列）+ NoteCard」——`note-card.tsx` props 改瘦类型 `Pick<Note,'slug'|'title'|'date'|'summary'|'category'>` 以兼容前台 NoteMeta（原只服务首页全量 Note）并删掉 notes-browser 里不再用的 Link import；④ 研究页 `research-item.tsx` 从 hover 变底色横条改为 explore-card 卡片（corner 角标 + SparkField 火花 + READ/DETAIL 箭头 + 状态/分类/标签），research/page.tsx 列表改 `grid md:grid-cols-2` + Reveal h-full 等高。项目页早已是 ProjectCard 卡片，三列表页风格至此统一。**教训**：卡片网格中 Reveal（client 组件）作为 grid item 要传 `className="h-full"` 让内部 `h-full` 卡片等高对齐。

19. **笔记卡片化最终形态（多轮澄清收敛：「太高了」「我是说卡片竖着排不是内容，一行一个」「总之就是在原先没有动效的基础上加个卡片而已」）**：内容布局**最终按原列表结构还原**——行一横排：日期（MM-DD）| 标题（flex-1 截断）| 类别 chip | 标签 chips（前 3 个，sm+ 显示）| READ →；行二：摘要（有则显示，单行截断）；只在外层套 explore-card（hover 上浮 + 角标 + 火花粒子）。后追加微调：类别 chip 加橙色描边+文字+光晕（先后加 bg-accent/10 背景因「像报错」被撤），标签移到类别之后，年标题 13→16px、卡内文字整体放大一档（标题 18px、摘要 15px 等）。笔记页列表 = 按年分组 + 单列竖排（一行一个）。**教训（重要）**：做「加卡片」类需求时先问/先还原原布局再套壳，别自作主张重排内容（期间排过竖堆六行 → 被嫌太高 → 又横排 → 仍被纠正）；用户说得最清楚的一次是「在原先没有动效的基础上加个卡片而已」——锚定原样式，改动只做加法。

20. **桌面端滚动条个性化（「右侧滑动的条个性化、别贴屏幕、橙色圆圈代表当前进度」——曾误改移动端目录滑轨被纠正「我指的不是目录，是最右侧的滑轨，手机版不用做」）**：① 移动端目录滑轨 `mobile-toc-rail.tsx` 保持原版不动（等长横线、贴边 right-3）；② 桌面端（xl+）**隐藏原生滚动条**（globals.css @media 1280px：webkit width:0 + Firefox scrollbar-width:none）；③ 新建 `components/scroll-progress-dot.tsx` 全站挂 layout——屏幕右缘内侧细轨（right-3、top/bottom 22vh 不贴边不贴底）上悬浮**橙色发光圆圈**，位置 = scrollTop/可滚高度（随滚动移动=进度），滚过 80px 淡入，点击轨道/拖动圆点可跳转；④ 移动端保持原生滚动条。**教训**：用户说「右侧滑动的条」默认指**浏览器滚动条**而非自定义目录组件——先看截图/红框再动手，别凭第一印象改错对象（这是本会话第二次「改错范围、先还原再说」）。

21. **图片断链 + 全站提速（2026-09-02，eznine.xyz 动态分支）**：① 研究页图片 404 双重根因：a) Next standalone 的静态服务**只认服务启动时刻已存在于 `public/` 的文件**——运行时由图片重写机制新复制进 `content-images/` 的图永远 404（实测同一目录里启动前的图 200、启动后的 404）→ 解决：**`/uploads/` 与 `/content-images/` 交给 Nginx `alias` 直连仓库真实目录**（部署脚本以声明式整文件写入 `/etc/nginx/sites-available/my-blog`，含 `nginx -t` + reload，不再手工改）；b) 后台批量修改把文章移进「大类/章节」子目录后，md 里的 `images/...` 相对路径断链 → `copyImageAndRewrite` 改为**从 md 所在目录逐级向上回溯到 `content/` 根**找源图，且文件命名从「路径 md5」改为「**内容 md5**」（构建期/运行期任何 cwd 下文件名一致，预渲染引用与运行时复制永远对得上）。② 卡顿根治：`lib/content.ts` 拆成**列表只解析 frontmatter（html:''）+ 文章页 `getNoteFull/getResearchFull/getProjectFull` 懒渲染**（按「文件 mtime + 3s TTL」缓存），搜索索引改从 md 源码正则提纯文本（`markdownToPlainText`，不再先渲染 HTML）——首页/列表每次访问都全量渲染所有文章的旧行为是 1-2 秒卡顿主因，且列表对象带全文 html 传给客户端组件会把 RSC 载荷撑大。③ 部署脚本新增：`[0/8]` admin 服务 systemd drop-in 强制 `User=eznine`（曾以 root 跑、写出的文件归 root 埋雷）+ chown `site.config.json`；`[6/8]` 写 Nginx 配置；`[8/8]` 部署后预热全部主要页面（消灭首次访问冷启动 1.7s）。**教训**：a) PowerShell 5 `Set-Content -Encoding UTF8` **带 BOM**，会毁掉 bash 脚本首行 shebang——改完脚本必须检查 `ef bb bf`；b) 部署脚本执行到一半会被自己的 `git pull` 更新，**整个脚本体要包进 `{ }` 复合命令**让 bash 先整体解析；c) curl 验证动态页面必须 `-L`（Next 会 308 补尾斜杠）+ `--compressed`（gzip 下 grep 会空）。

22. **笔记 Demo 演示面板定稿 + 浏览器双端实测（2026-09-02）**：① 面板右半屏固定（左侧文章独立滚动、可边读边玩）的实现要点——Demo 栏经 `createPortal` 挂到 `document.body`（避开 page-enter 的 transform 祖先，fixed 才生效）；外层 `#demo-page` 挂 `data-demo="open"`，CSS 据此隐藏目录/正文留右半（`.demo-panel-row` padding-right 50%）；面板 `#note-demo-sidebar` `position:fixed` 桌面右半屏 50%（min-width:768px）/**<768px 全屏**，左侧有自己的标题条（label + 新窗口打开 + 关闭）与 iframe，iframe 首见才挂 src（隐藏不下载）。② 实测验证 ✓：窄窗口 710px——面板宽 \~700px 全屏、fixed、滚动 scrollTo(500) 后 getBoundingClientRect().top 仍为 0；桌面视口 820px——面板 rect {left:405, width:405} 正好右半屏 \~49.4%，左侧文章独立可读，滚动后 top 仍 0，控制台无业务报错。③ 部署注意（待办）：standalone 运行时上传的 demo 不在构建期复制的 `public/demos`——需仿 uploads 把 `public/demos` 加进部署脚本符号链接（或 Nginx alias），否则后台上传的 demo 前台 404。

23. **部署脚本自动保护后台内容改动（2026-09-03，含用户担忧的长期问题）**：**背景**——用户在后台（网站）改内容（重写文章/改日期/类型/删文章）直接写服务器本地文件且**从不 commit**，部署 `git pull` 遇到本地改动冲突会中止（实测 89 个笔记 md 有 hidden 标记改动 → pull 失败）。**用户的担忧是对的：网站在线编辑会被下次代码部署覆盖。** 修复（`scripts/deploy-c2.sh` [1/8]）：拉代码前先把 `content/` 与 `public/` 的未提交改动 `git stash push`（不带 `-u`，避免把 public/uploads 图片也 stash 进去），拉完 `git stash pop` 恢复——后台内容自动保护、自动还原，绝不静默覆盖，pop 冲突则停下提示人工处理。部署脚本 [0/8] 自愈升级：`chown -R eznine:eznine .` 覆盖**全仓**（含 package*.json / node_modules——历史 sudo 装依赖留 root 属主，npm install 以 eznine 写 package-lock.json 时报 EACCES）。**仍待办（治本）**：服务器 git remote 是 HTTPS 且无 push 凭据（`git push --dry-run` 报 fatal: could not read Username）——后台改动仍只存服务器不进 GitHub；若要内容也有 GitHub 备份，需服务器配置 PAT/SSH key 再做「后台保存后自动 commit+push」，用户已知晓未要求立即做。

24. **工具页 + DEM 下载器嵌入 + DEM 前端换主题色（2026-09-03）**：① 新增 `/tools` 工具页（导航「项目」后加「工具」，文案 `content/copy/09-工具页.json`——注意**新增 copy 页面必须同步改 `lib/site-server.ts` 的 COPY_FILES 数组与 `lib/site.ts` 的 import + SiteConfig.pages 类型**，两处漏一处会崩）；页面风格复用 PageHeader/explore-card/Reveal：DEM 下载器大卡片（`components/tools/dem-downloader.tsx`，client）探测 `127.0.0.1:8080/api/health`（`mode:'no-cors'`，只关心网络可达否）→ 在线显示「运行 DEM DOWNLOADER」+ 展开 iframe（72vh，DEM 前端自己响应式 900px 断点），离线显示提示 + 重试；新窗口打开外链常驻。② 占位工具区 4 张卡（矢量数据格式转换/坐标系转换/栅格裁剪合并/瓦片下载），文案在 future.items，「规划中」标记。③ **DEM 下载器前端换色**（`F:\TOOLS\DEM_DOWN\web_app\static\app.css`）：蓝 #2563eb 系 → 博客主题：bg #f3efe3 / panel #faf7ee / text #1c1710 / muted #57503f / primary #d3381c（深 #b52c12），顶栏改墨色渐变（#231c12→#1c1710）、日志框改代码块同款 #211c13、状态色 lg-* 用博客代码高亮色、地图浮层 rgba(250,247,238,.94)。④ 实测 ✓ 桌面（1440px）：导航「工具」/tools、h1、badge「可用 · 本地服务」、4 占位卡、iframe {w:1046,h:648} 内嵌 200、DEM 顶栏/卡片 h2/body RGB 全对、无控制台错误；移动端（390px）：菜单有「工具」、无横向滚动、iframe 292px 不爆屏。**待办**：工具页在 GitHub Pages 静态站 /tools 也能正常出（无本地服务则显示离线提示，属预期）。

25. **DEM 下载器上线 eznine.xyz（2026-09-03）**：把用户本地的 DEM 下载器（`F:\TOOLS\DEM_DOWN\web_app`，Python 标准库 http.server + GDAL/numpy 后端）部署到服务器，让工具页在线上直接可跑。**关键改造：DEM 前端相对路径化**——`app.js` 26 处 `/api/x`→`api/x`、`index.html` 6 处 `/static/x`→`static/x`（相对路径在站点根解析与绝对一致 → 本地零影响，实测验证过）；页面在 `/dem/` 下时自动解析为 `/dem/api/x`。**架构**：博客后台已占 `/api/`（→3001），故 DEM 服务挂独立前缀 `/dem/`（systemd `my-blog-dem`，127.0.0.1:8081 仅本机，`User=eznine`），Nginx `location /dem/ { proxy_pass http://127.0.0.1:8081/; }` 剥前缀转发；`location = /dem { return 308 /dem/; }` 补尾斜杠防相对路径错乱。**博客组件 `dem-downloader.tsx` 环境自适应**：`demBase()` 判断 hostname——本地（localhost/127.0.0.1/192.168/10.）/ → `http://127.0.0.1:8080`（用户开 bat），线上 → `/dem/`（同源反代）。**部署**：`scripts/deploy-dem.sh`（装 python3-gdal/numpy/requests/dotenv/geopandas → 解压 dem-app.tar.gz 到 /srv/dem-down → systemd → 验证）；`deploy-c2.sh` 的声明式 Nginx 配置已内置 `/dem/` 反代（每次部署重写自动保留）。**待验证**：服务器端首次实际部署跑通（内存仅 891Mi+4G swap，GDAL 大栅格合并可能吃力；OpenTopography 境外延迟服务器侧更优）。

26. **Demo 代码编辑（2026-09-03）**：用户要「demo 除了展示还能练习——改改某处看变化、不保存」。`note-demo.tsx` 控制栏加「编辑代码」（同源才显示）→ 展开 `demo-code-editor` 暗底编辑区：首次 `fetch(demo.src)` 读源码，Tab 缩进 + Ctrl/⌘+Enter 运行，「运行 ▸」把源码注入 `<base href=...>` 转 `srcDoc` 刷 iframe，「重置」还原；全程内存态不落盘。globals.css 加 `demo-code-editor*` / `demo-code-input` 系列（暗底按钮重配色）。**实测 ✓**：871px 视口下 zoom 10→16 运行后 srcdoc 含新值、瓦片加载；重置双还原。**教训**：浏览器调试里改受控 textarea 必须用 `HTMLTextAreaElement.prototype` 的 value setter + `new Event('input',{bubbles:true})`，直接 `.value=` 会被 React 值追踪器还原（第一轮改进了 srcdoc 但代码还是旧的）；本会话浏览器 evaluate 沙箱不认 IIFE 包裹（返回 undefined），改写普通表达式即可。另：dev 残留进程占 3000/3001 再次出现（AGENTS.md 17c 已知问题），已 Stop-Process 清端口后正常。

27. **Demo 编辑器升级：CodeMirror 高亮 + 拖动调比例（2026-09-03）**：用户追加「代码要像 VSCode 一样分颜色」「上下拉动调代码区/展示区比例」。① 编辑器 textarea → **CodeMirror 6**（新依赖 `@uiw/react-codemirror @codemirror/{lang-html,language,view,state,commands} @lezer/highlight`，next/dynamic `ssr:false` 懒加载只在点开编辑时下载）；`demoTheme`（EditorView.theme，`--code-bg`/`--code-ink`/`--accent` 变量）与 `demoHighlight`（HighlightStyle，`--hl-keyword/string/comment/number/attr/func`）全部引用 CSS 变量 → 深浅主题即时生效；`syntaxHighlighting()` 包着才可作 Extension（HighlightStyle 本身不是）。Ctrl/⌘+Enter 用 `runRef.current` 稳定引用 + `keymap.of`；Tab 用 `indentWithTab`。② `.demo-code-resizer` 分隔条（pointerdown + window pointermove/up，`touch-action:none`，行高 10px、hover/拖拽橙晕、双横线抓手）：拖拽实时改 `.demo-code-editor` inline height（clamp 90px ~ 容器高-栏高-120px 保 iframe 可见），高度存 `edHRef` 会话内保留，编辑器 flex column（bar + `.demo-code-cm` 内 `height:100%` 的 `.cm-editor`）。**实测 ✓**（872px 视口）：高亮 5 色全命中（橙红关键词 141 / 米金字符串 20 / 灰注释 7 / 浅橙数字 22 / 浅米属性 14 + 37 行行号）；模拟拖拽 +120px → 编辑区 240→360、iframe 467→347 精确联动；CodeMirror 输入 MARKER → 运行 → srcdoc 含标记与 base；重置后 DOCTYPE 复原、Leaflet 瓦片正常；控制台无错误。**新坑（环境）**：本机终端 env `HTTP_PROXY/HTTPS_PROXY=http://127.0.0.1:8668` 但 8668 无进程监听 → `npm install` 直接挂死无输出（npm ping 报 proxy error），**临时 `Remove-Item Env:HTTP_PROXY,Env:HTTPS_PROXY` 绕代理直连 npmmirror 秒装**——今后 npm 装包卡住先看代理端口是否活着。

28. **Demo 编辑器三修（2026-09-03，用户实测反馈）**：① **拖动不流畅/鼠标移进地图就停**——根因：拖动时鼠标一旦越过分隔条进入 iframe 区域，`pointermove` 被 iframe 文档吞掉（父页面 window 收不到），旧实现监听挂在 window 上 → 拖到 iframe 上就卡住。「不是按下去拉动松开停」即此症状。修复：`el.setPointerCapture(e.pointerId)` 把指针锁在分隔条上（捕获后事件跨 iframe 也回传），监听改挂分隔条元素 + `pointercancel` 兜底，拖拽期间 `.demo-dragging` 类让 `iframe { pointer-events:none }` 双保险；`barH` 在 pointerdown 时算一次（不再每帧 query）。② 删掉编辑栏「改动当场生效 · 不保存」提示文案（`.demo-code-editor-hint` 及 media query 一并清）。③ **代码区滚不动**——根因：`.cm-editor` 高度没被约束（@uiw `height="100%"` 只给外层），内容超高后被 `.demo-code-editor` 的 `overflow:hidden` 直接裁掉，没有可滚动容器 → 滚轮没反应。修复：`.demo-code-cm` 改 `position:relative`，`.cm-theme/.cm-editor` 绝对定位 `inset:0` 填满，`.cm-scroller { overflow:auto; overscroll-behavior:contain }`——绝对定位保证编辑区高度确定，滚动发生在内部 scroller。**实测 ✓**：拖拽高度 240→330→440 精确跟随、拖拽中 iframe `pointer-events:none` 生效、松开类名还原；`scroller scrollHeight 1246 > clientHeight 185`、scrollTop 可设 400；提示文案消失；tsc 通过。**教训**：a) iframe 会吞父页面指针事件——跨 iframe 的拖拽必须 `setPointerCapture` 且监听挂在捕获元素上，光改监听目标没用；b) CodeMirror 在 flex/overflow 容器里必须显式给 `.cm-editor` 定高（absolute 填满最稳），否则内容被裁但无法滚动。

29. **文章 | 演示面板左右分栏拖动（2026-09-03）**：用户要「左侧文章和右侧 demo 也能拖比例」。实现：把两处固定 50% 统一成 **`--demo-split` CSS 变量打在 `<html>` 上**（面板 portal 到 body，`#demo-page` 不是共同祖先所以必须 html）——`#note-demo-sidebar` 宽度与 `.demo-panel-row` padding-right 同时读它，一处改动全站联动；`.demo-colsplit-resizer` 竖向拖动条贴面板左缘（absolute left:-8px 宽 16px、`col-resize`、hover/拖拽橙色竖线、移动端 <768px `display:none`）；拖动逻辑 `setPointerCapture` + 监听挂元素、发丝级写法与横向一致，但**直改 `document.documentElement.style.setProperty('--demo-split', ...)` + `splitWRef` 内存态，拖拽全程零 React 重渲染**（横向拖高度也是直写 inline style，两条都避开 setState 高频渲染）。clamp：320px ~ 视口宽-360px（文章最小留白 360px）。**实测 ✓**（872px 视口）：默认 436px=50%、文章 padding-right 同值联动；向右拖 512→412 精确 −100、向左拖到 512 即触顶（872-360=512 上限正确，此前「拖不动」是测试预期忽略了钳制）；`setPointerCapture` + iframe `pointer-events:none` 复用 `.demo-dragging` 状态。**教训**：a) 合成 PointerEvent 验证拖拽时，结果被 clamp 吞掉会被误判成「没反应」——先算一遍 maxW 再定测试断言；b) 竖向拖与横向拖共用一个 `dragging` 状态和 `.demo-dragging` 类（都是给 iframe 关 pointer-events），别再引入第二套。

30. **封面右侧「勘测路线」（2026-09-03，用户「首页第一页太空、右边没东西」）**：全站内容（笔记全量+研究+项目+工具页共 114+ 点）按时间自上而下画成一条河流式蜿蜒路线，随开场文字一起浮现（p 0.06→0.20）、随滚动向下延伸（p 0.12→0.86，双向可逆）、线画到哪点与月份就地浮现；点形：笔记=圆（分类着色：WebGIS=accent/GIS=绿/遥感=金/Python=蓝）/研究=三角/工具=菱形/项目=方；每点微弱呼吸（3.2s，scale 1→1.38、opacity 0.6→1，delay i%7 错峰）；月份变化才标一个 YYYY-MM（同月不重复）；末端虚线+「未完待续」。文案在 01-首页.json hero.route。组件 `hero-route-map.tsx`。进度驱动走过两版：初版「模块级 routeState + 子组件 rAF 读取」在真实浏览器正常、但会神秘失效（原因见下）→ 终版 **`applyRouteProgress(root, p)` 导出函数，hero-scroll 的 update() 同帧直调**（与 data-hs 文字同一条管道，无模块状态无子组件 rAF）。**两轮返工**：①第一版带框面板+进场动画被否——用户要无框、直接画在等高线背景上、尽量填满右侧；②手排锚点（等距左右摆）被判「太规则」——用户要「乱画出来的自然感」，改为 **mulberry32 固定种子的随机游走生成器**（方向保持几步后突变+步长随机+段中点垂直抖动，seed=12），SSR/客户端/任意窗口形状一致。**血泪（SVG+CSS transform）**：station 的 CSS `transform: scale()` 会**完全覆盖 SVG 的 transform 属性**——属性 translate 定位被吃掉，114 个点全部堆到 SVG 原点；修复=外层 `<g transform="translate(x,y)">` 只做属性定位、内层 g 只做 CSS scale，且 SVG 元素上 CSS 变换原点默认是 viewBox 原点，必须 `transform-box: fill-box; transform-origin: center` 才绕自身缩放。**其他要点**：viewBox 跟随 SVG 真实像素包围盒（ResizeObserver 量→相对锚点×包围盒），任意窗口比例填满右侧且点不变形；路径 `pathLength=1000` 归一化 dashoffset 与布点同一坐标系；站点浮现用 class 切换（.is-on）+CSS transition 实现双向可逆；点带 r=11 隐形命中圆、点击 router.push 跳文章；dev 模式下程序化 scrollTo 会与水合抢跑（监听未挂载→样式没写），真实用户滚动不受影响。**环境坑（排障半小时的教训）**：ZCode 内置预览页被其他窗口完全遮挡时，Chrome 冻结该页 requestAnimationFrame（visibilityState 仍报 visible！）——整个 hero 动画（含官方 data-hs 文字）全部冻结在旧状态，极易误判成代码回归。判别法：① `requestAnimationFrame` 探针（600ms 竞速不触发=环境冻结）；② 用**网站原有**的 data-hs 元素（如数据卡）做金丝雀——它和路线同管道，一起冻=环境、只有路线冻=代码。此时别改代码，把预览窗口露出来或让用户在自己浏览器里验证即可。**编辑模式**：网址带 `?route-edit` 进入——33 个 accent 手柄拖动捏形状（pointer capture 换算回相对坐标）、强制全画全现（绕过滚动驱动）、拖动自动暂存 localStorage（key `route-anchors`）、「复制 JSON」导出给 AI 固化进 `REL_ANCHORS`（重置删暂存恢复生成形状）；**工具条必须 createPortal 挂 body**——page-enter 的 transform 祖先劫持 position:fixed，工具条曾被定位到文档最底端「找不到」（Demo 面板同款坑再踩一次）；随机游走种子（12→679 两轮）只作为编辑模式的初始形状；**最终形状 = 用户在编辑模式手捏的 33 点，已固化为静态 REL_ANCHORS 数组**（从 localStorage 读出写死，2026-09-03），头部「SHEET·勘测路线/SURVEY ROUTE」标注按用户要求删除（route 文案只剩 hint/tail/legend）。

31. **GEE Playground · 地球引擎代码台（2026-09-03，用户「工具页加一个 GEE 工具，能认证 earthengine 账号、输代码、像 Code Editor 一样地图+console+导出，AI 生成后面再说」）**：自营 `public/demos/gee-playground/` 纯静态工具页（`index.html` + `app.css` + `app.js`），第三方库全部落本地 `lib/`（**自托管**）：`lib/ee/browser.js`（`@google/earthengine` 1.7.42 构建，1.6MB）+ `lib/leaflet/`（复用既有 demo 的 leaflet.js + images）+ `lib/codemirror/`（CodeMirror 5.65.21 core + javascript mode + closebrackets/matchbrackets/active-line/show-hint）。**架构**：左侧暗色 CodeMirror 编辑器（cm-s-gee 主题，全用 `--code-*` 暗底变量）| 竖向分割条 | 右侧上 Leaflet 地图（CARTO/Esri/OSM 三底图切换 + L.control.layers 图层面板）下控制台（控制台/任务/帮助三 Tab）。认证：顶栏「登录 Google」→ `ee.data.authenticateViaOauth(clientId, success, error, ['https://www.googleapis.com/auth/drive'])`，内置 Google Identity Services popup；Client ID 与 project 存 localStorage（`gee_playground_*`），`ee.data.setProject(project)` + `ee.initialize(null,null,cb,err,null,project)` 同步初始化。**运行**：`new Function('ee','Map','print','Export','toast','saveAs','console','return (async()=>{...})()')` 包装用户代码（IIFE 包裹便于 await），每次运行 `rebuildLayerControl()` 清上一脚本图层。**三大 API 垫片与 Code Editor 对齐**：① `Map.addLayer` = `obj.getMapId(visParams,cb)` → `mapid.urlFormat` 直接喂 `L.tileLayer`（urlFormat 本身就是 `base/{z}/{x}/{y}` 模板，Leaflet `<img>` 无鉴权也不需要 CORS——后端 URL 已带能力）；GeoJSON/Feature/FC 先 `ee.FeatureCollection()/ee.Feature()` 包一层再 getMapId；已用 Map.setCenter/centerObject（几何 bounds→bbox→map.fitBounds 或 setView）/getBounds/clear。② `print(label?, x)`：EE 对象自动 `getInfo` 取值；FC 摘要（features 数/columns）、Image（bands）、ImageCollection（features 数）特殊格式化，超 8000 字截断。③ `Export.image/table/video.{toDrive,toCloudStorage,toAsset}`（对象式参数，库的 `extractFromFunction` 自动映射键值）+ **自动 `.start()` 提交**（否则任务不进入列表），任务面板用 `ee.data.getTaskList(cb)` 轮询（15s）+ 渲染 description/task_type/state/创建时间/错误信息/取消按钮（`ee.data.cancelTask`）。CodeMirror 补全：登录初始化后 `ee.data.getAlgorithms()` 拉算法目录 → 建 类名/方法 两级 hint 表，`Ctrl-Space`/输入触发 `CodeMirror.hint.gee`（自定义 registerHelper）。分隔条 pointer capture 拖拽调左右/上下比例（与 note-demo 的 resizer 同套路，拖拽中 body.is-drag）。**本地实测 ✓（浏览器，未登录态）**：ee 库加载、CodeMirror 渲染默认示例（SRTM 18 行）、地图渲染 12 块底图瓦片、三 Tab 正常、设置弹窗开关正常、运行按钮未登录正确拦截、三栏布局尺寸正确（editor 589px / map 685×434 / console 230）。**真实 server 调用（瓦片/打印取值/算法目录/导出）需要：可访问 Google 的网络 + 用户自己的 Client ID + 已注册 GEE 并启用了 Earth Engine API 的 project**——这两步只能用户做（登录授权是用户 Google 账号，OAuth Client 需在其 Cloud Console 创建），工具内已内嵌帮助页（步骤 + 已知限制）。**受限**：不含 ui.* 部件/Chart/在线地图排版（Inspector 用 print 代替）。部署注意：`lib/ee/browser.js` 1.6MB + codemirror 合计约 2.3MB，随 git 入库（只增成型产物），打包/克隆都要带上；工具页只依赖纯静态/相对路径，GitHub Pages 子路径与 eznine.xyz 根路径都能直接跑。

31b. **博客 /tools 页 GEE 接入（与 31 同期）**：`app/tools/page.tsx` 在 DEM 卡上方加 `GeePlayground` 卡（`components/tools/gee-playground.tsx`，client，`useState` 展开/收起，`asset('/demos/gee-playground/')` 生成带 basePath 前缀的 iframe 地址——注意 `/demos/` 下 6 个既有 demo 若开编辑代码走 `fetch` 同源即可，本工具不需要 `base`）；文案进 `content/copy/09-工具页.json` 新增 `gee` 段（title/en/status/desc/open/expand/hint），并同步在 `lib/site.ts` 的 `tools` 类型加 `gee`（否则 tsc 崩）。首次使用需创建 OAuth Client + 可访问 Google 网络，提醒写进 hint。

32. **矢量格式转换工具（2026-09-03，用户「写工具里的类型转换工具吧，不光是 GeoJSON/Shapefile 互转，发挥想象做得实用一点，不限制只做转换，别偏离主题」）**：纯前端浏览器内转换，数据不上传（GH Pages 静态站 + eznine.xyz 都能跑，不需要后端）。**核心引擎 `lib/geo/`**：全部输入先归一成 GeoJSON（RFC 7946）再导出目标格式。① 读——GeoJSON 直读（`detect.ts` 按扩展名+内容特征识别 GeoJSON/TopoJSON 顶层键/XML 根/CSV 头/WKT 前缀）；Shapefile 用 `shpjs`（`.zip` 或 `.shp+.dbf+.prj` 多选，`parseShp/parseDbf/parseZip`，prj 识别 WGS84/CGCS2000/3857 等 ESRI WKT）；KML/GPX 用 DOMParser（`kml-read.ts`，ExtendedData/SimpleData 进属性，GPX 轨迹→线串）；WKT 手写解析器（`wkt.ts`，支持 Z/M、GeometryCollection 拆多要素）；CSV/TSV 通用分隔解析（`csv-read.ts`，头行 lng/lon/x、lat/y 或中文经/纬度，转点+轻数值类型推断）。② 写——`.shp` 二进制手写（`shapefile-write.ts`，**单位 16-bit word**：文件头 filecode=9994 大端、content length 字段 = bytes/2，记录 4 字节对齐；支持 Point/1、PolyLine/3、Polygon/5、MultiPoint/8，面/线 parts 数组，空几何=0 parts）+.dbf（dBASE III，**字段名保留中文原字符**（超 10 字节 UTF-8 截断、去重加 `_N`），字段类型推断 N/C、记录值 UTF-8 写 + 输出 `.cpg=UTF-8`，QGIS/ArcGIS Pro 按 cpg 解中文）+.prj（ESRI WKT，预置 WGS84/4490/3857/4526/4528 + UTM 按分带动态生成）+.cpg，exactly 4 件套；TopoJSON 用 `topojson-server/client`（导出展示压缩比，`fcToTopoJSON` 量化 1e4）；KML/CSV 导出 DOM 生成（`writers.ts`，非点要素 CSV 附 wkt 列）。③ **重投影**（`reproject.ts`，proj4）：预置 WGS84/CGCS2000 地理/WebMercator/CGCS2000 3°带 111E(EPSG:4526)/117E(4528)/UTM 自动分带（按数据首点算 zone）+自定义 proj4 串；非 WGS84 源先归 4326 再转目标。④ 工具（`util.ts`：mapCoords/eachCoord/bboxOf/roundCoord）。**组件 `components/tools/format-converter.tsx`（client）**：拖拽/多选导入 → 概览条（格式·要素数·几何类型分布）→ 源 CRS 输入 + 重投影开关/目标 CRS 下拉/自定义 proj4 → 6 种导出格式单选 →「转换 · 生成」；属性表（表头/前100行）、统计（bbox +「坐标是否在经纬度范围」判断投影数据提示）、**地图预览（Leaflet，高德底图默认 + Esri 切换，见「底图偏好」）**、要素点击弹属性、TopoJSON 压缩比、Shapefile 结果条显示 4 文件逐个下载。**架构血泪**：① **Leaflet 不能在 client 组件顶层 import**——`leaflet-src.js` 顶层引用 window，SSR 预渲染 client 组件时崩 `ReferenceError: window is not defined`（dev 必现，`next build` 未必）；修法 `import type * as LeafletNS from 'leaflet'`（类型） + `loadLeaflet()` 运行时 `await import('leaflet')`（懒加载缓存），CSS import 安全保留。② **异步建图 vs 数据渲染竞态**：地图在 `useEffect` 里 `await loadLeaflet()` 建图，若数据 effect 先跑（此时 mapRef 还是 null）会 return，`[fc]` 依赖在 map 就绪后不再触发 → 点永远不画。修法：建图完成后 `setMapReady(true)`，数据 effect 依赖 `[fc, mapReady]`。③ 混合几何（点+线同文件）在 .shp 里只能落单一 Shape Type（shapefile 天生单类型），空几何记录 shpjs 回读返回 null——测试要按纯点/纯线/纯面分文件验证。**实测 ✓**：node 回合测试 17 项全过（纯点/线/面 shp 写入→shpjs 回读坐标/中文 dbf 属性/数值、TopoJSON 往返、4326→3857→4326 往返 CGCS2000→4526 投影、WKT/KML 导出）；浏览器端（dev + IAB）——导入 5 点 GeoJSON→概览/地图渲染 5 个 circleMarker/属性表中文表头/统计 bbox、重投影 WGS84→WebMercator 导出 WKT 坐标变米制 `POINT(12724430...)`、Shapefile 导出 4 件套下载触发 4 次、Esri 底图切换瓦片切到 arcgisonline、重置清空、移动端 390px 无横向滚动。**部署注意**：工具在 GH Pages 静态 /tools 同样可跑（纯前端），重库 shpjs/proj4/topojson/leaflet 均运行时动态 import（首屏 First Load 118kB、轻）；`09-工具页.json` 已把「矢量数据格式转换」从 future.items 移除并新增 `converter` 段，`lib/site.ts` tools 类型同步加 `converter`（否则 tsc 崩，AGENTS.md 24 的老坑）。dev 时 `import 'leaflet'` 顶层会 500，务必用懒加载。（dev 残留进程占 3000/3001 的已知问题再次出现，已清端口）

33. **勘测路线定稿 + 研究封面 + 后台工具设置 + 关于页散文（2026-09-04，一次大提交）**：① **勘测路线终态**：随机游走生成的初始形状被用户在 ?route-edit 编辑模式手捏 33 点替换（导出 route-anchors.json 固化进 REL_ANCHORS 静态数组）；统一圆点（类型色区分、去笔记分类色）、年份标注只留 YYYY 每年一个（居中于点正下方）、PT·02 移左上角、尾部虚线沿手绘方向延伸、未完待续挂虚线终点下方。**血泪（SVG text 坐标系）**：月份/年份标注 text 放在 station 的 translate g 内，若 lx/ly 用绝对坐标（pt.x/pt.y）会被双重平移推到画布右下角外——必须用【相对站点】的局部偏移。② **研究封面**：Research 加 cover 字段（frontmatter），loadDir decorate 传入 absFile 重写相对路径图片（copyImageAndRewrite）；后台编辑器（仅 research）加封面字段：上传/URL/预览/清除；前台 research-item 有封面时横排（封面左 220-240px、内容右），研究页改一行一个（flex-col 取代 md:grid-cols-2），首页研究区同步。给两篇研究做了主题 SVG 封面（/uploads/cover-*.svg）。**坑**：Server 组件里 img 不能传 onError（500），封面路径后台可控所以直接去掉。③ **后台工具设置**：admin-server 加 GET/PUT /api/copy/tools（读写 09-工具页.json 保留 _说明），新建 ToolsManager 编辑 page/converter/dem/gee/future 各区块文案 + future.items 增删改 + 工具点日期（首页勘测路线工具点 date 从硬编码改为读 site.pages.tools.date，后台可改）；admin-app 加「工具设置」入口。④ **关于页散文版**：用户全文重写关于页（一篇《我与地图相遇于一处坐标》的散文），旧 story 结构（intro/sections/quote）废弃；新结构 essay = epigraph + chapters（code 注记/title/paragraphs），四章排版（ORIGIN·起点 / QUESTIONS·追问 / ROUTE·路线 / FRONTIER·未竟之地），开篇引语与结尾两句「这是一张属于我的地图，一张未完成的地图。」用 grad-text 光效，段落 Reveal 滚动浮现；SKILLS 技能栈按用户要求删除，DATUM WGS 84 删除（页脚只留 {coords} · END OF SHEET），页头身份注记（山西师范大学/地理信息科学/坐标）删除，全站底部信息栏去掉「张鹏」与「WGS 84」（site-footer 只显示 role 与 coords）。**坑**：site.ts 类型与 site-server 装配必须同步改（story→essay，删 StorySection/StoryLink 接口），只改 JSON 会 tsc 崩。

## 六、用户的偏好与协作习惯（重要！）

* **快速**：不要无谓操作，小改动不用浏览器调试，大改动才确认；表述直接，不喜欢反复确认

* **术语习惯**：把首页开场大屏叫「**封面**」；「橙/红色」均指主题 accent 色

* **文案洁癖**：所有文字必须能独立修改、位置好找、按页面顺序排列；中文为主，讨厌生硬直译（如「最新优先」→ 最终定为「最新/最早」）

* **性能敏感**：粒子大字动效因卡顿被撤下；移动端动画在意流畅度

* **双端思维**：手机和电脑分别验证，移动端体验优先级高（目录滑轨、导航收起都是移动端专属）

* **底图偏好（重要）**：任何工具/页面需要地图底图时，**优先高德（AMap）和 Esri**——高德街道瓦片 `https://webrd0{s}.is.autonavi.com/appmaptile?...style=8`（国内直连快、无需 key）、Esri 卫星 `server.arcgisonline.com/.../World_Imagery/...`（WGS84）。注意高德底图是 GCJ-02 加密坐标，叠加 WGS84 数据有数百米偏移（UI 上要给提示）；Esri 是 WGS84 可严格对齐。曾用于：note demo 02 底图切换、`components/tools/format-converter.tsx` 地图预览（高德默认 + Esri 切换）

* **安全提醒**：site.config.json 含 adminPassword，已加入 .gitignore 不入库；密码绝不写进文档/README/提交信息

## 七、已知问题 / 待办

* [x] 部署到 GitHub：已推送 github.com/eznine/my-blog（覆盖旧版），Actions 自动发布到 <https://eznine.github.io/my-blog；后台密码已更换为随机强密码，且> site.config.json 已加入 .gitignore 不入库（密码只在本地文件，勿写进任何文档）

* [ ] 首次部署需在仓库 Settings → Pages → Source 选 GitHub Actions（网页操作）

* [x] 用户提过「右侧有点空」的方案（图幅注记面板/陕西轮廓+西安脉冲点/研究方向速览）——已用封面右侧「勘测路线」实现（2026-09-03，见演进 30）

* [ ] feed.xml 生成脚本若确认不要 RSS 可删

* [ ] **`components/hero-route-map.tsx` 尚未通过构建（2026-09-03 排查）**：该文件是用户在改的「勘测路线」组件，`next build` / `tsc` 报两类错——① `useEffect` 用了没 import（我已在 import 行补上 `useEffect`，这一处已修）；② **`relAnchors` 在渲染期被 `useEffect` 依赖数组引用，但 `const relAnchors` 声明在其后面的第 276 行 → TDZ「used before declaration」**（依赖数组在每次渲染时求值，早于块内 const 初始化）。这是用户当前 WIP 的结构问题，我没擅自重排——**若要在本地跑 `next build` / dev，需先把 `relAnchors` 的声明移到引用它的 `useEffect` 之前**（或把该 effect 从依赖数组里去掉 `relAnchors`）。另 `lib/geo/` 里有一批与「坐标转换」相关的 ts 报错（shpjs 无类型等）与页面无关，也是既有噪音。

## 八、生产部署（自建服务器，2026-09 上线）

* **双方案并存（2026-09 定稿）**：**GitHub Pages = A（静态 main 分支）**，**eznine.xyz = C（动态 standalone dynamic 分支，`my-blog-web.service` 端口 3210，Nginx 反代，保存即生效 3s TTL）**。**后台一律走 eznine.xyz/admin**（会连服务器真后台）；GitHub Pages 的后台请求发到访问者本机 127.0.0.1:3001，不是服务器，别在那登。**改文案刷新血泪：客户端组件不能 `import { site }`（构建期快照，改文案前台死也不刷）**——必须走 `SiteProvider`（`components/site-provider.tsx`）+ `useSite()`，layout 用 `getSite()`（`lib/site-server.ts` 导出的**真实对象**，不是 Proxy！Proxy 传给 client 组件 SSR 会崩 `undefined.map`）通过 `<SiteProvider value={site}>` 下发动态文案。现改为动态的组件：site-header / site-footer（server 直接读 site-server）/ site-utilities / hero-scroll / notes-browser（含 ChapterPanel 子组件）/ search-client；admin-app 保留静态 site（后台文案不需动态）。**改 JSON 测试文案必须无 BOM**（PowerShell `Set-Content -Encoding UTF8` 加 BOM → JSON.parse 失败 → 500；用 node 写）。**第二层血泪（2026-09-02）：standalone 里的 `content/`、`public/uploads/`、`public/content-images/` 必须是【符号链接】指回仓库根目录真实目录**——Next standalone 的 server.js 会 `process.chdir(__dirname)`，进程实际读的是 `.next/standalone/content/copy/`（构建时复制的副本），后台改的是 `/srv/my-blog/content/`，副本永远不变 → 前台死也不刷新；且构建用 sudo 跑会让 standalone 归 root，运行时写图片 EACCES 500。部署一律用 `sudo bash scripts/deploy-c2.sh`（已入库：拉代码→构建→复制静态资源→建符号链接→chown eznine→重启 web+admin 两个服务）。返回首页不重播封面靠 `hero-scroll.tsx` 的 1.2s 钉住循环（Next 路由切换的 smooth 滚动会把瞬时定位拉回顶部，单次 scrollTo 挡不住）。移动端卡顿优化：`topo-shader-field.tsx` <768px 时 dpr=1 + 30fps 限帧。后台左上角版本信息 = admin-server `GET /api/version`（git 提交号/时间 + 服务启动时间，免鉴权）

* 服务器：Azure VM Ubuntu 22.04（公网 IP 20.214.241.113），仓库在 `/srv/my-blog`

* 架构：Nginx（80）托管 `out/` 静态站 + `/api/` 反代 127.0.0.1:3001（`proxy_buffering off` 必须，否则 AI 流式断）+ systemd 服务 `my-blog-admin`（开机自启，跑 `node scripts/admin-server.mjs`）

* **部署流程（重要）**：本地改完代码 → `git push` → 服务器 `cd /srv/my-blog && git checkout -- public/feed.xml public/sitemap.xml && git pull && NEXT_PUBLIC_ADMIN_API=/api NODE_OPTIONS='--max-old-space-size=2048' npm run build` → **必须** **`sudo systemctl restart my-blog-admin`**（后台是旧代码进程，不重启新功能/接口不生效）

* **NEXT\_PUBLIC\_ADMIN\_API=/api 必须传**：不传则后台页所有 API 硬编码指向访问者本机 127.0.0.1:3001，后台全废；验证方法 `grep -rl '127.0.0.1:3001' out/_next | wc -l` 应为 0

* 服务器 `site.config.json`（adminPassword + ai 配置）不入库，修改后同样要重启服务才生效

* 访问：`https://eznine.xyz` 前台（HTTPS）、`/admin` 后台；`http://20.214.241.113` 仍是 HTTP（IP 不含证书，HTTPS 必须走域名）；Azure NSG 已开放 80/443，公网直连 3001 未开放（安全）

* 服务器小内存：build 需 `NODE_OPTIONS='--max-old-space-size=2048'`，OOM(SIGKILL) 时加 swap 解决

* 防火墙只放行 80/443/22；SSH 免密（本地 `ssh eznine` 别名）。**敏感凭据绝不写进本文件与 README**

* **HTTPS（2026-09-03 上线）**：`https://eznine.xyz` 用 Let's Encrypt 证书（`/etc/letsencrypt/live/eznine.xyz/`，到期自动续：certbot.timer 每半年续期 + `/etc/cron.d/certbot` 兜底，用户零维护）。Nginx 80 与 443 两个 server 块**内容相同**并存；**80 保留给 ACME 续期验证（`location /.well-known/acme-challenge/ { root /var/www/html; }`）与 IP 直连，不做强制 301 跳 443**——否则 DEM 服务与 IP 直连会受影响。「服务器 root 需密码、NOPASSWD 免密失效」已知问题见下。**教训**：Ubuntu 22.04 的 nginx 1.18 **不支持独立的 `http2 on;` 新指令（1.25+ 才有）**，必须用旧式 `listen 443 ssl http2;`，否则 `nginx -t` 报 `unknown directive "http2"`；ACME 验证路径必须放 80 且不走 proxy（webroot 静态喂），否则 certbot 签不了。

* **服务器 sudo 免密注意（2026-09-03 排查发现）**：`/etc/sudoers.d/eznine-nopasswd` 内容正确（`eznine ALL=(ALL:ALL) NOPASSWD:ALL`），`sudo -l` 也确认了 `(ALL) NOPASSWD: ALL`，但**实际 `sudo -n true` 仍要求输密码**（`use_pty` defaults + 非交互 SSH 会话的已知组合问题：sudo 无法建立伪终端时安全策略降级，退回密码认证）。**影响**：无交互环境下跑 `sudo bash deploy-c2.sh` 会在本机第一步就卡在 sudo 上——所有需要 root 的步骤要么交互式手动输密码，要么 `printf 'PW' | sudo -S`。修复方向（未做）：排查 `/etc/sudoers` 主文件是否缺对应 `Defaults !use_pty`，或在 SSH 层确保分配 TTY。**root 密码务必保密，本文件与 README 绝不含密码。**

