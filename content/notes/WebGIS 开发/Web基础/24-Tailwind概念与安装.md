---
title: "第 24 节 · Tailwind：概念与安装"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
order: 66
tags: ["web"]
---




# 第 24 节 · Tailwind：概念与安装

> 📌 **版本信息**：基于 Tailwind CSS **v4**（2025 年发布的 CSS-first 新架构，v3 的配置文件方式已过时；2026-08-29 核对）
> 📚 来源：[Tailwind 官方文档](https://tailwindcss.com/docs/installation) ｜ [Play CDN（浏览器直用）](https://tailwindcss.com/docs/installation/play-cdn)
> 🔑 本模块练习统一用 **v4 浏览器版 CDN**（一行 `<script>` 直接写工具类，免安装），Vite 项目内正式接入的方式在 TODO 里给出。

## 一、这一节的目标

1. 理解"原子化/工具类 CSS"的思想，以及它为什么赢了
2. 会读会写 Tailwind 工具类（先拿下间距/尺寸/颜色/字号）
3. 用浏览器 CDN 跑起来一个页面
4. 建立"组合代替自定义"的手感

---

## 二、Tailwind 是什么：把 CSS 单位拆成"单词"

传统写法：HTML 里起类名 → 去另一个文件写样式 → 来回跳。
Tailwind 写法：**每个工具类 = 一条 CSS 声明**，直接在 HTML 上"组词成句"：

```html
<!-- 需求：白底圆角、内边距 16、阴影、居中文字的卡片 -->
<!-- 传统：class="card" + CSS 文件里写 4 行 -->

<!-- Tailwind：原地组合 -->
<div class="bg-white rounded-lg p-4 shadow-md text-center">武汉</div>
<!--
  bg-white     → background-color: white
  rounded-lg   → border-radius: 0.5rem
  p-4          → padding: 1rem（p=padding，4=1rem，刻度表见下）
  shadow-md    → box-shadow: 中等阴影
  text-center  → text-align: center
-->
```

**为什么它赢了**（对比第 04 节的"起类名写 CSS"）：

1. **不用起名**：`.card` `.main-title` 起名的痛苦直接消失
2. **不用跳文件**：样式和结构在一起，所见即所得
3. **天然防膨胀**：工具类全项目复用同一套，CSS 体积封顶；不会再有 5000 行"祖传样式"
4. **约束刻度**：间距/字号只能用预设刻度，设计自动统一

代价：HTML 上类名很长（习惯就好），以及要背常用类的"单词表"——本节开始背。

---

## 三、数字刻度表（必背前三行）

Tailwind 的间距/尺寸是统一刻度：**数字 × 0.25rem**（rem=16px 时 1 个单位 = 4px）：

| 类 | 实际值 | 记法 |
|---|---|---|
| `p-1` | 4px | 1 格 |
| `p-2` | 8px | 小间距 |
| `p-4` | 16px | 常规间距（最常用） |
| `p-6` | 24px | 舒适间距 |
| `p-8` | 32px | 大间距 |

前缀字母决定属性：`p`=padding 四周、`px`=左右、`py`=上下、`pt/pr/pb/pl`=单边；把 p 换成 m 就是 margin。

颜色：`text-red-500`（文字）、`bg-blue-600`（背景）、`border-gray-200`（边框）；数字 50~950 是深浅刻度（500 左右最饱和）。

字号：`text-sm` `text-base` `text-lg` `text-xl` … `text-4xl`。

---

## 四、跑起来：浏览器 CDN 版

```html
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<!-- 加这一行后，页面上写任何 Tailwind 类都立即生效（仅开发/练习用） -->
```

正式项目（Vite）接入（TODO 体验，先不展开）：

```bash
npm install tailwindcss @tailwindcss/vite
# vite.config.js 里加 tailwindcss() 插件
# CSS 入口里写 @import "tailwindcss";
```

> ⚠️ CDN 版是**运行时扫描生成**，官方定位是原型/练习；上线项目必须走构建版（体积与性能都不可同日而语）。我们练习期用 CDN，第 03 模块起全部走 Vite 构建版。

---

## 五、动手跟练：24 · Tailwind 改造登录页

配套文件：`02-web-basics/examples/24-Tailwind改造登录页.html`

**步骤：**

1. Live Server 打开：左右分屏对比——左边第 03 节的"原生 CSS 登录表单"，右边已经用 Tailwind 类重写的同款
2. 逐个类名对照：`p-4` 对应原来的哪行 CSS？`rounded-lg` 呢？
3. 完成 5 个 TODO：给输入框加聚焦样式类、按钮 hover 变色类、错误提示红色类、卡片阴影升级、整体居中布局
4. 挑战：把右侧卡片改成"深色主题"（把 bg-white 换 bg-slate-800、文字换 text-slate-100…）

**通关标准：**

- [ ] 能把"内边距 16px"翻译成类名，也能反着翻译
- [ ] 完成 5 个 TODO 且效果正确
- [ ] 能说出 CDN 版与构建版的区别（以及为什么练习用 CDN）

---

## 六、自测题

1. `p-4` 等于多少像素（默认 rem 下）？
2. `px-2` 和 `py-2` 分别管哪两个方向？
3. `text-red-500` 里的 500 是什么？
4. 为什么 Tailwind 解决了"类名起名难"的问题？
5. 浏览器 CDN 版能不能直接用于上线项目？

### 参考答案

1. 1rem = 16px，p-4 = 4 格 = 1rem = 16px。
2. px=左右内边距，py=上下内边距。
3. 颜色深浅刻度（50 最浅 ~ 950 最深，500 为标准色）。
4. 它把"描述样式的类名"变成标准词汇表——不再需要为每块样式发明业务类名。
5. 不能。它是运行时版本，体积大、按需扫描慢，官方只定位为原型用；上线走构建版。

---

## 七、下一步

会"读单词"了 → **第 25 节：布局与常用工具类**，把 Flex/Grid/响应式前缀接上，Tailwind 就能独立撑起整个页面。
