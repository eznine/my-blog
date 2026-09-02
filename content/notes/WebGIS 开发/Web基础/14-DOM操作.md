---
title: "第 14 节 · DOM 操作"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
order: 46
tags: ["web"]
---







# 第 14 节 · DOM 操作

> 📌 **版本信息**：基于 DOM Living Standard（2026-08-29 核对）
> 📚 来源：[现代 JS 教程 · 文档](https://zh.javascript.info/document) ｜ [MDN DOM 入门](https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model/Introduction) ｜ 本地教材 `resources/01-web-basics/modern-js-tutorial/2-ui/`

## 一、这一节的目标

1. 理解 DOM 是什么：HTML 被 JS 摸得到的样子
2. 掌握查找元素的两大 API：`querySelector` / `querySelectorAll`
3. 掌握增删改：`createElement` / `append` / `remove` / `innerHTML`
4. 会改样式和类：`classList` 三件套
5. 完成动态待办列表——"数据变化 → 页面跟着变"的第一次完整体验

---

## 二、DOM 是什么

**一句话：浏览器把你的 HTML 解析成一棵"对象树"，JS 通过这棵树读写页面。**

```html
<html> → <body> → <div id="app"> → <h1>、<ul> → <li>……
```

类比：HTML 是你写的设计图，**DOM 是浏览器按图盖出来的真实大楼**——JS 操作的是大楼（DOM），不是图纸（HTML 源码）。你在 DevTools Elements 面板里看到的就是这棵树（第 01 模块第 04 节见过）。

---

## 三、查找元素（会用两个就够）

```js
// querySelector：按 CSS 选择器找"第一个"（最常用，一个 API 打天下）
const box = document.querySelector('#app');          // 按 id
const item = document.querySelector('.card');        // 按类
const btn = document.querySelector('button[type="submit"]');  // 任意 CSS 选择器

// querySelectorAll：找"所有"，返回 NodeList（能 forEach，不是纯数组）
const items = document.querySelectorAll('.card');
items.forEach((el) => console.log(el.textContent));

// 也可以在任意元素上继续往下找（缩小范围）
const list = document.querySelector('#todo-list');
const firstDone = list.querySelector('.done');
```

> 💡 老代码里的 `getElementById` / `getElementsByClassName` 还会见到，认识即可；新代码统一 `querySelector` 系列（一套选择器语法走天下）。

---

## 四、读写内容与属性

```js
const el = document.querySelector('#title');

// 读/写文本（安全，推荐——内容会被当纯文本）
el.textContent = '新标题';

// 读/写 HTML（⚠️ 会解析标签：只能用于自己拼的安全内容，绝不能拼用户输入！XSS 攻击入口）
list.innerHTML = '<li>由 JS 生成的一行</li>';

// 读写属性
const link = document.querySelector('a');
link.href = 'https://leafletjs.com/';
link.setAttribute('target', '_blank');
link.getAttribute('href');
inputEl.value = '输入框的值';     // 表单元素用 .value（第 03 节埋的伏笔）
```

> ⚠️ **innerHTML + 用户输入 = XSS 漏洞**。用户输入一律用 `textContent`。这条纪律从今天开始养成。

---

## 五、增删元素

```js
// 创建 + 装配 + 上树（标准三步）
const li = document.createElement('li');   // 1. 造（此时还悬浮在内存里）
li.textContent = '学完第 14 节';            // 2. 装内容/加类
li.classList.add('done');
list.append(li);                           // 3. 放进某个父元素的末尾

// 其他插入位
parent.prepend(el);        // 插到最前
parent.before(el);         // 插到某元素前面
parent.after(el);          // 插到某元素后面
el.remove();               // 删除自己
list.innerHTML = '';       // 清空容器（暴力但常用）
```

---

## 六、classList：类名的增删改查

样式永远交给 CSS（第 04 节的选择器），JS 只负责**切换类名**——这是"结构与行为分离"的关键纪律：

```js
el.classList.add('done');        // 加
el.classList.remove('done');     // 删
el.classList.toggle('done');     // 有则删无则加（开关，超好用）
el.classList.contains('done');   // 有没有

// 配合 CSS：
// li.done { text-decoration: line-through; color: #999; }
// JS 只切类，划线变灰是 CSS 的事——各司其职
```

直接改样式（`el.style.color = 'red'`）能用但只适合极个别动态值（比如根据数据算出来的颜色），常规一律 classList。

---

## 七、性能初识：别在循环里反复碰 DOM

DOM 操作是 JS 里最贵的操作之一（跨过 JS/渲染的边界）。两种修正思路：

```js
// ❌ 慢：100 次上树 = 100 次重排
for (const name of names) {
  list.append(makeLi(name));
}

// ✅ 快：先拼好一整段，一次上树
list.innerHTML = names.map((n) => `<li>${n}</li>`).join('');
// （第 13 节的 map + join 组合在这里会师——这就是它最常见的用途）
```

---

## 八、动手跟练：14 · 动态待办列表

配套文件：`02-web-basics/examples/14-动态待办列表.html`

**步骤：**

1. Live Server 打开：一个能增删、能勾选完成的待办列表
2. 读代码：`render()` 函数是灵魂——**每次数据变了就整个重画列表**（数据驱动的雏形，React 的核心思想提前见面）
3. 完成 5 个 TODO：回车添加、点击切换完成态、删除按钮、剩余数量统计、清空已完成
4. 观察：所有操作都没有"直接改某个 li"，全靠"改数组 → render()"——体会这个模式

**通关标准：**

- [ ] 增删勾选全部正常
- [ ] 能口头说出"数据驱动渲染"的循环：操作数据 → 调 render() → 页面重画
- [ ] 能说出 innerHTML 拼用户输入的危险性

---

## 九、自测题

1. `querySelector` 和 `querySelectorAll` 返回的东西有什么不同？
2. 为什么用户输入要用 `textContent` 而不是 `innerHTML`？
3. "JS 只切类名，样式交给 CSS"——这样分工的好处？
4. `innerHTML = ''` 的作用是什么？有什么副作用？
5. 循环里逐个 `append` 有什么问题？两种解法？

### 参考答案

1. 前者返回单个元素（找不到是 null）；后者返回 NodeList（类数组，可 forEach）。
2. innerHTML 会把输入当 HTML 解析，`<img onerror=...>` 这类内容会执行——XSS 攻击；textContent 当纯文本处理，安全。
3. 结构与表现分离：改样式不用动 JS 代码，改行为不用动 CSS，CSS 选择器（含伪类 :hover）还能白嫖。
4. 清空容器内所有子元素；副作用是整个重建（事件监听如果直接绑在子元素上会丢——第 15 节的事件委托就是解药）。
5. 每次上树都可能触发重排，性能差；解法①拼字符串一次 innerHTML，解法②用 DocumentFragment 一次性插入。

---

## 十、下一步

页面会画了，但还不会"响应点击" → **第 15 节：事件**，让页面真正"活"起来。
