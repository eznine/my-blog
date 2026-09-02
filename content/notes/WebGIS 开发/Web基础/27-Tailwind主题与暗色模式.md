---
title: "第 27 节 · Tailwind：主题与暗色模式"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
order: 72
tags: ["web"]
---







# 第 27 节 · Tailwind：主题与暗色模式

> 📌 **版本信息**：基于 Tailwind CSS v4（CSS 变量主题 + `dark:` 变体；2026-08-29 核对）
> 📚 来源：[Tailwind · Dark Mode](https://tailwindcss.com/docs/dark-mode) ｜ [Tailwind · Theme Variables（v4）](https://tailwindcss.com/docs/theme)

## 一、这一节的目标

1. 掌握 `dark:` 变体的两种触发方式（媒体查询 / class 切换）
2. 理解 v4 的主题机制：**一切颜色/刻度都是 CSS 变量**，可覆写
3. 掌握品牌色定制（CSS 变量方案）
4. 完成暗色切换页——阶段一（第 01~27 节）收官项目

---

## 二、dark: 变体

```html
<!-- 写法：给深色下的样式加 dark: 前缀 -->
<div class="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
  白天白底黑字，夜里黑底白字
</div>
```

两种触发方式：

| 方式 | 行为 | 何时用 |
|---|---|---|
| 系统跟随（默认） | `prefers-color-scheme` 媒体查询 | 完全跟随操作系统 |
| **class 切换（推荐）** | `<html class="dark">` 生效 dark: | 给用户一个开关（现代产品标配） |

class 方案在 v4 里需在 CSS 入口声明（构建版）：

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));   /* 声明：.dark 类触发 dark: */
```

```js
// 切换逻辑（配合 localStorage 记住选择）：
function toggleDark() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}
```

CDN 浏览器版已内置 class 触发支持——练习直接可用。

---

## 三、v4 主题：颜色即 CSS 变量

v4 的核心变化：**主题就是一堆 CSS 变量**，覆盖变量 = 换肤：

```css
/* 构建版的入口 CSS：把品牌主色从蓝改成青（全站 text-primary 等同步变化） */
@import "tailwindcss";

@theme {
  --color-primary: #0e7490;        /* 现在所有 primary 相关工具类变成青色系 */
  --color-primary-light: #155e75;
  --font-sans: "Microsoft YaHei", sans-serif;
}
```

```html
<!-- HTML 里用主题变量 -->
<button class="bg-primary text-white">品牌色按钮</button>
```

> 💡 和第 04 节"CSS 单位与变量"（第 30 节阶段二）会师：Tailwind v4 的主题层**就是** CSS 自定义属性——你学的原生知识直接用上。

---

## 四、动手跟练：27 · 暗色切换页（阶段一收官）

配套文件：`02-web-basics/examples/27-暗色切换页.html`

**步骤：**

1. Live Server 打开：右上角太阳/月亮按钮切换明暗，整页（导航/卡片/表格/表单）同步换肤
2. 读代码：`dark:` 前缀如何逐元素成对出现；切换按钮如何 toggle `.dark`
3. 完成 5 个 TODO：卡片暗色版、表格斑马纹暗色版、表单输入框暗色版、记住用户选择（localStorage）、跟随系统初始值
4. 阶段一通关自检：对照第 01~27 节的"通关标准"逐条打勾

**通关标准：**

- [ ] 切换按钮工作正常，刷新后记住选择
- [ ] 能说出 class 方案与系统跟随方案的取舍
- [ ] 阶段一自检清单全勾 → **去做综合项目 C-02a（个人主页）与 C-02b（地震数据面板 TS 版）**

---

## 五、自测题

1. `dark:` 前缀的两种触发方式？产品里推荐哪种？
2. class 方案靠什么元素上的什么类触发？
3. v4 的主题定制本质上覆盖的是什么？
4. `bg-primary` 里的 primary 是写死的颜色还是变量？
5. 记住用户主题选择用什么 Web API？

### 参考答案

1. 系统跟随（prefers-color-scheme）/ class 切换；产品推荐 class 切换（给用户选择权，还能三态：亮/暗/跟随系统）。
2. `<html>`（documentElement）上的 `dark` 类。
3. CSS 自定义属性（@theme 块里覆写 --color-* 等变量）。
4. 变量——由 @theme 里的 `--color-primary` 决定，改一处全站生效。
5. localStorage（存 'light'/'dark'，初始化时读取恢复）。

---

## 六、阶段一完结 🎉

第 01~27 节：HTML/CSS/JS/TS/Tailwind 全部完成。综合项目路线：
**C-02a 个人主页**（学完 08 即可做）→ **C-02b 地震数据面板 TS 版**（23 节的 quake.ts 是它的数据模块）→ 进入 **第 28 节：语义化与无障碍**（阶段二开始）。
