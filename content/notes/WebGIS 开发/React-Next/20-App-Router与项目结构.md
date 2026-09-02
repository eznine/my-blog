---
title: "第 20 节 · App Router 与项目结构"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "React-Next"
order: 58
tags: ["web"]
---







# 第 20 节 · App Router 与项目结构

> 📌 **版本信息**：Next.js 15.x App Router（2026-08-29 核对）
> 📚 来源：[Next.js · App Router](https://nextjs.org/docs/app) ｜ [Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
> ▶️ 配套练习：`examples/20-多路由站点/`（最小可跑 Next 项目，带中文注释）

## 一、这一节的目标

1. 会创建 Next 项目并跑通 `npm run dev`
2. 掌握 App Router 的核心约定：**文件夹即路由**
3. 掌握 page / layout / 全局样式的职责
4. 会加新页面与新布局

---

## 二、创建与目录约定

```bash
npx create-next-app@latest 20-多路由站点
# 交互项建议：TypeScript=No（本模块练习用 JS 保持连贯，TS 版第 16 节技能直接平移）
#             ESLint=Yes、Tailwind=Yes（C-03c 要用）、App Router=Yes、src/=No、import alias=@/*
cd 20-多路由站点 && npm run dev   # http://localhost:3000
```

**App Router 的核心约定：`app/` 下的文件夹 = URL 段，`page.js` = 该路由的页面**：

```
app/
├── layout.js      ← 根布局（唯一必须：包 <html><body>）
├── page.js        ← / 首页
├── about/
│   └── page.js    ← /about
├── citys/
│   ├── page.js        ← /citys
│   └── [slug]/
│       └── page.js    ← /citys/wuhan（[slug] 动态段，第 21 节）
└── globals.css
```

**其他约定文件（先认脸）**：`loading.js`（该段加载 UI）、`error.js`（错误 UI）、`not-found.js`（404）、`route.js`（API 接口，第 24 节）。

> ⚠️ **page.js / layout.js 是保留文件名**，文件夹里没有 page.js 就不是可访问路由。React 组件放 `components/`（约定俗成，非路由）。

---

## 三、layout 与 page 的分工

```js
// app/layout.js —— 根布局：所有页面共享的"壳"，负责 <html><body>
import './globals.css';

export const metadata = {                       // SEO 元数据（第 19 节痛点的解药！）
  title: 'GeoLearn 导览站',
  description: 'WebGIS 学习者的城市导览',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <nav>…全局导航…</nav>                    {/* 每页共有：布局只写一次 */}
        {children}                               {/* ← 当前页面渲染在这里（Outlet 的角色） */}
        <footer>…</footer>
      </body>
    </html>
  );
}

// app/page.js —— 首页：就是普通组件
export default function HomePage() {
  return <h1>首页</h1>;
}

// 嵌套布局：app/citys/layout.js 只包住 citys 段的所有子页（侧栏等分区布局）
```

**与 react-router 的对照**：BrowserRouter→框架内置；Routes/Route→文件夹结构；Layout+Outlet→layout.js+children；Link→`next/link`（第 21 节）；useParams→`params` prop。

---

## 四、动手跟练：20 · 多路由站点

配套文件夹：`03-react-nextjs/examples/20-多路由站点/`（已放最小结构：layout/page/about/citys）

```bash
cd F:\learn_webgis\03-react-nextjs\examples\20-多路由站点
npm install && npm run dev
```

**步骤：**

1. 跑通后逐个访问 `/`、`/about`、`/citys`，观察**页面切换零刷新**（与 react-router 同体验）但**首屏 HTML 是服务端直出的**（右键查看源代码有真内容——CSR 痛点 ② 已解决）
2. 完成 5 个 TODO：加 `/team` 页、修改根 metadata 看标签页变化、加 `app/citys/[slug]/page.js` 动态段（先返回占位）、改 globals.css 主题色、给 citys 段加嵌套 layout（侧栏）
3. 做一个"故意错误"：把 app/about/page.js 改名 page.jsx 之外的名字（如 Page.js），看 404——体会"约定即路由"

**通关标准：**

- [ ] 三条路由 + 动态段可访问
- [ ] 能说出 page/layout/metadata 各自的职责
- [ ] 查看源代码能解释"SEO 痛点在哪被解决"

---

## 五、自测题

1. "文件夹即路由"的具体约定？缺 page.js 会怎样？
2. 根 layout 为什么必须包 `<html><body>`？
3. metadata 导出解决了 SPA 的哪个痛点？
4. `[slug]` 文件夹名代表什么？
5. Next 的 layout.js 对应 react-router 的什么？page.js 呢？

### 参考答案

1. app/ 下每个含 page.js 的文件夹成为一个路由段；缺 page.js 不可访问（可作组织文件夹）。
2. Next 不再注入 HTML 模板，根布局就是整站 HTML 的定义处（CSR 时代由 index.html 承担）。
3. SEO/分享预览：元数据直接出现在服务端渲染的 `<head>` 里。
4. 动态路由段：匹配 /citys/后面的任意一段，值通过 params 传入页面。
5. layout.js ≈ 嵌套路由的 Layout + Outlet 合体（children 即出口）；page.js ≈ 路由对应的页面组件。

---

## 六、下一步

会建站了 → **第 21 节：路由与布局**，把动态段、加载与错误 UI 补全成"博客式结构"。
