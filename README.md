# GEO · NOTES — GIS 个人平台

以 GIS、遥感、WebGIS、空间分析与编程为核心的个人网站。

- **HOME** 认识我：身份、方向、核心能力与最新内容
- **NOTES** 看我的学习：GIS / 遥感 / 空间分析 / WebGIS / 编程学习笔记
- **RESEARCH** 看我的科研：生态安全格局、InSAR、生态网络等真实研究
- **PROJECT** 看我的作品：WebGIS、3D GIS、GIS 工具、遥感应用
- **ABOUT** 了解我的背景

技术栈：Next.js 15（App Router · 静态导出）+ Tailwind CSS v4 + 构建期 Markdown 编译。
暗色模式、全文搜索、标签分类、目录导航、RSS 订阅、GitHub Pages 自动部署，全部开箱即用。

## 本地使用

```bash
npm install     # 安装依赖
npm run dev     # 开发模式 http://localhost:3000
npm run build   # 构建到 out/（纯静态，可部署到任何静态托管）
```

## 写内容

所有内容都是 Markdown 文件，放在 `content/` 对应目录，文件名即 URL（`content/notes/foo.md` → `/notes/foo`）。

**笔记**（`content/notes/`）：

```yaml
---
title: 文章标题
date: 2026-08-01
category: 遥感          # 分类，自动汇总为筛选器
tags: [GEE, Landsat]    # 标签，自动汇总
summary: 一句话摘要，显示在列表与搜索结果中。
---
正文，支持 GFM、代码高亮、表格。
```

**研究**（`content/research/`）额外支持：

```yaml
status: 在研            # 在研 / 已发表 / 已完成
links:
  - label: 论文 DOI
    url: https://doi.org/...
```

**项目**（`content/projects/`）额外支持：

```yaml
tech: [MapLibre, TypeScript]   # 技术栈徽章
demo: https://...              # 在线演示链接
github: https://github.com/...
```

## 修改个人信息

- `site.config.json` — 姓名、身份、学校、邮箱、GitHub、坐标、方向、技能、教育经历（全站共用）
- `content/pages/about.md` — 关于页长文介绍
- `app/globals.css` 顶部 `:root` / `.dark` — 改强调色等设计变量

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库并推送代码：

   ```bash
   git init && git add -A && git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```

2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 推送到 `main` 会自动触发 `.github/workflows/deploy.yml`：安装依赖 → 静态构建 → 发布。
   - 仓库名为 `<用户名>.github.io` 时，站点在根路径；
   - 其他仓库名时自动使用 `/<仓库名>` 作为 basePath，无需手动配置。
4. 记得把 `site.config.json` 里的 `siteUrl` 改成你的实际地址（影响 RSS / Sitemap 里的链接）。

也可以部署到 Vercel / Netlify / Cloudflare Pages：直接导入仓库，构建命令 `npm run build`，输出目录 `out`。

## 目录结构

```text
app/                页面（App Router）
  notes/ research/ projects/ archive/ about/ search/
components/         组件（导航、卡片、动效、搜索等）
content/            所有 Markdown 内容
  notes/ research/ projects/ pages/
lib/                内容加载、搜索、Markdown 管线
scripts/feed.mjs    RSS 与 Sitemap 生成（build 前自动执行）
site.config.json    个人信息唯一配置入口
```
