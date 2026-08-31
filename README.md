# 未完成的地图

> 一处坐标，一段旅程，一张未完成的地图。

地理信息科学方向研究生的个人博客（曾用名：EZNINE 的 GIS 空间站）。关注生态安全格局、InSAR 形变监测与 WebGIS 可视化。喜欢把研究过程写成笔记，把想法做成能跑的项目。

**在线地址**：<https://eznine.github.io/my-blog>

## 技术栈

- **框架**：Next.js 15（App Router，静态导出 `output: 'export'`）
- **样式**：Tailwind CSS v4 + CSS 变量（主题色 / 字号可调）
- **背景**：WebGL2 shader 等高线全站固定层，支持鼠标扰动
- **部署**：GitHub Pages（GitHub Actions 自动构建发布）
- **后台**：本地 Node API 服务（文章管理 / 批量导入 / 外观设置）

## 本地开发

```bash
npm install
npm run dev
```

`npm run dev` 会同时启动 Next.js 开发服务器和本地后台服务（端口 3001），打开 <http://localhost:3000> 即可访问。

## 内容管理

所有页面文案按页面拆分，存放在 `content/copy/`，文件按编号排序，字段顺序即页面从上到下的顺序：

```
content/copy/
├── 00-站点信息.json   全站共用数据（姓名/坐标/邮箱/浏览器标题/导航栏/底部信息栏）
├── 01-首页.json       首页：开场大屏、方向卡、三个内容区块、结束语
├── 02-笔记页.json     笔记页
├── 03-研究页.json     研究页
├── 04-项目页.json     项目页
├── 05-归档页.json     归档页
├── 06-关于页.json     关于页
├── 07-搜索页.json     搜索页
└── 08-404页.json      404 页
```

文章内容（Markdown）在 `content/notes`、`content/research`、`content/projects`，中文文件名会自动转换为 URL 安全的英文 slug。

## 后台管理

后台是**本地服务**，用于日常写作与管理，入口在首页底部信息区。

```bash
npm run admin        # 仅启动后台服务（127.0.0.1:3001）
npm run dev          # 同时启动站点 + 后台
```

后台功能：

- 文章管理：笔记 / 研究 / 项目的新增、编辑、删除（Markdown 编辑器，支持图片上传）
- 批量导入：多文件导入 Markdown，可统一分类、追加标签
- 外观设置：调整正文 / 列表 / 标题 / 导航的字号与颜色（写入 `content/appearance.json`）
- 分类与标签候选管理

> 后台密码在本地 `site.config.json` 的 `adminPassword` 字段（该文件已加入 `.gitignore`，不会提交到仓库）。参考模板见 `site.config.example.json`。也可以用环境变量 `ADMIN_PASSWORD` 覆盖。

## 部署

推送到 `main` 分支即自动触发 GitHub Actions 构建并发布到 GitHub Pages：

```bash
git push origin main
```

部署流程（`.github/workflows/deploy.yml`）会自动计算 basePath（项目页为 `/my-blog`），无需手动配置。

## 目录结构

```
app/                 页面（首页 / notes / research / projects / archive / about / search / admin）
components/          组件（含 admin/ 后台组件）
content/             文案（copy/）、文章（notes/research/projects）、外观配置、分类标签
lib/                 数据读取与配置生成
scripts/             开发 / 后台 / RSS 生成脚本
public/              静态资源与上传图片
```

## License

个人项目，保留所有权利。
