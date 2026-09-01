---
title: "第 01 节 · 组件与 JSX/TSX"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "React-Next"
order: 8
tags: ["web"]
---




# 第 01 节 · 组件与 JSX/TSX

> 📌 **版本信息**：React 19.x（2026-08-29 核对；本模块组件 API 多年稳定，React 19 主要新特性在 Server Components/Actions，第 19 节起涉及） ｜ Vite 8.2.2
> 📚 来源：[React 中文文档 · 描述 UI](https://zh-hans.react.dev/learn/describing-the-ui) ｜ [react.dev Quick Start](https://zh-hans.react.dev/learn) ｜ Vite React 模板

## 一、这一节的目标

1. 建立 React 核心心智模型：**UI = f(state)**——界面是数据的函数
2. 会用 create-vite 建 React 项目并跑通
3. 掌握 JSX/TSX 语法规则（与 HTML 的六个差异）
4. 写出第一个组件，理解"组件是返回 UI 的 JS 函数"

---

## 二、React 心智模型

**一句话：你描述"数据长什么样时界面长什么样"，React 负责把界面变成那样。**

对比第 14 节的命令式 DOM：

```js
// 命令式（第 14 节）：一步步指挥 DOM
list.innerHTML = todos.map(...).join('');   // 手动重画
countEl.textContent = count;                // 手动更新每处

// 声明式（React）：只声明"结果"
function App() {
  return <h1>访客数：{visitorCount}</h1>;    // 数据变 → React 自动更新界面
}
```

第 14 节的 `render()` 函数你已经体会过"数据变 → 重画"的思想——React 把它做成了整个框架：**你只管改数据（state），界面永远自动与数据同步**。这就是 `UI = f(state)`。

---

## 三、建项目与文件解剖

```bash
cd F:\learn_webgis\03-react-nextjs\examples
npm create vite@latest 01-第一个组件 -- --template react
cd 01-第一个组件 && npm install && npm run dev
```

> 本模块练习为教学精简版，我在每个 examples/NN 文件夹放了可直接 `npm i && npm run dev` 的项目（与脚手架产物结构一致、带中文注释）。TS 版在第 23 节你已经见过（vanilla-ts），React+TS 的写法差异（.tsx）第 16 节讲。

```
01-第一个组件/
├── index.html              ← 壳：只有一个 <div id="root"> 和 script 入口
├── package.json            ← 多了 react / react-dom / @vitejs/plugin-react
├── vite.config.js          ← 注册 React 插件（让 Vite 认识 JSX）
└── src/
    ├── main.jsx            ← 入口：把 <App/> 挂到 #root 上
    ├── App.jsx             ← 根组件
    └── index.css
```

`src/main.jsx` 全文（就 4 行，读完整个"挂载"过程）：

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.querySelector('#root')).render(
  <StrictMode><App /></StrictMode>   // StrictMode：开发期额外检查（不产生 UI）
)
```

---

## 四、组件与 JSX 语法规则

**组件 = 返回 JSX 的普通函数**（首字母大写是硬性约定，小写会被当成 HTML 标签）：

```jsx
// App.jsx
function CityCard({ name, lat, lng }) {
  return (
    <div className="card">
      <h3>{name}</h3>
      <p>{lat.toFixed(2)}°N, {lng.toFixed(2)}°E</p>
    </div>
  );
}

export default function App() {
  return (
    <main>
      <h1>城市列表</h1>
      {/* 单标签必须自闭合；注释是花括号包 JS 注释 */}
      <CityCard name="武汉" lat={30.5929} lng={114.3052} />
      <CityCard name="西安" lat={34.3412} lng={108.9398} />
    </main>
  );
}
```

**JSX 与 HTML 的六个差异（必背）**：

| # | HTML 习惯 | JSX 规则 | 例 |
|---|---|---|---|
| 1 | 单标签可不闭 | **必须自闭合** | `<img />` `<br />` |
| 2 | class | **className** | `<div className="card">` |
| 3 | for | **htmlFor** | `<label htmlFor="u">` |
| 4 | 任意大小写 | 标签严格区分：大写=组件，小写=HTML | `<CityCard/>` vs `<div>` |
| 5 | 纯文本 | **花括号 {} 里写任意 JS 表达式** | `<p>{lat.toFixed(2)}°N</p>` |
| 6 | style="color:red" | **style={{color:'red'}}**（对象，驼峰属性） | `style={{ marginTop: 8 }}` |

**JSX 的本质**：它是 `React.createElement` 的语法糖——花括号里可以放**表达式**（能求值的），不能放**语句**（if/for 要用三元、`&&`、map 代替——第 05 节的列表渲染主题）。

---

## 五、动手跟练：01 · 第一个组件

配套文件夹：`03-react-nextjs/examples/01-第一个组件/`（精简 Vite React 项目，全中文注释）

```bash
cd F:\learn_webgis\03-react-nextjs\examples\01-第一个组件
npm install
npm run dev
```

**步骤：**

1. 跑通后读四个文件（main.jsx → App.jsx → components/CityCard.jsx → index.css）
2. 完成 5 个 TODO：新增第三个城市卡片、给卡片加"访问"按钮（先摆样子）、把 h1 换成动态表达式、把样式类改走 Tailwind（第 27 节技能回归）、故意把组件名写成小写观察警告
3. HMR 回归：改任意 JSX 文本，保存，页面**不刷新**就更新（Vite + React Fast Refresh）

**通关标准：**

- [ ] 能说出 UI = f(state) 的含义
- [ ] 六条 JSX 差异默写 5 条以上
- [ ] 页面上有三张卡片且数据来自 props

---

## 六、自测题

1. 用一句话解释声明式与命令式的区别。
2. JSX 里 `<div class="x">` 会发生什么？（两层：警告与功能）
3. `<p>{if (a) 'x'}</p>` 为什么不行？正确写法？
4. 组件名为什么必须大写开头？
5. `style={{ fontSize: 14 }}` 为什么是两层花括号？

### 参考答案

1. 命令式一步步指挥"怎么改"（操作 DOM 过程）；声明式只描述"结果长什么样"，过程交给框架。
2. 运行时 class 无效（样式不生效）+ 控制台警告"Did you mean className"。
3. if 是语句不是表达式，{} 里只能放表达式；写 `{a ? 'x' : ''}` 或 `{a && 'x'}`。
4. JSX 里小写标签被编译为 HTML 字符串标签、大写被当作组件引用——大小写是编译器的判定依据。
5. 外层花括号是"进入 JS 表达式"，内层是 JS 对象字面量。

---

## 七、下一步

组件会写了，但数据是写死的 → **第 02 节：props 与数据流**，让数据从父组件流进子组件。
