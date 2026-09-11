---
title: "第 04 节 · CSS 引入与选择器"
date: "2026-09-07"
category: "WebGIS 开发"
chapter: "Web基础"
demo: "/demos/04-1/"
demoLabel: "04-选择器练习页"
order: 4
tags: ["web"]
---

# 第 04 节 · CSS 引入与选择器

> 📌 **版本信息**：基于 CSS Level 3/4 现行规范（选择器、层叠、伪类均为稳定特性；2026-09-06 核对）
> 📚 来源：[MDN CSS 第一步](https://developer.mozilla.org/zh-CN/docs/Learn/CSS/First_steps) ｜ [MDN 选择器参考](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_selectors) ｜ [MDN 层叠基础](https://developer.mozilla.org/zh-CN/docs/Learn/CSS/Building_blocks/Cascade_and_inheritance)

## 当查询面板需要自己的样子

第 03 节做完表单后，页面还停留在浏览器默认样式中：按钮是灰底黑字，输入框又矮又普通，整页像一份没排版的原稿。现在想让查询面板变成以后地图应用里的样子：深色导航条、白底卡片、主色按钮，鼠标悬停时按钮给出反馈。

CSS 就是干这件事的。但它和 HTML 不同：HTML 在结构里直接声明“这一块是什么”，CSS 必须先找到页面上的元素，再决定它长什么样。这一节先解决两件事：CSS 怎么进入页面，以及怎么准确地“点名”元素。

## 这一节讲什么

本节讲 CSS 规则的组成、三种引入方式、高频选择器、层叠冲突的初步规则，以及最常用的几个伪类。学完这一节可以做到：

- 写出完整、合法的 CSS 规则，并说清选择器与声明的分工
- 在正式项目、单文件练习、临时调试三种场景下选对引入方式
- 用元素、类、ID、后代、子、群组、属性选择器准确命中目标
- 根据优先级和书写顺序判断两条冲突样式谁生效
- 用 `:hover`、`:focus`、`:not()`、`:nth-child()` 处理按钮反馈和列表状态

## 一条 CSS 规则长什么样

CSS 的最小单元是一条规则，由选择器和声明块组成：

```css
selector {              /* 选择器：点名要改谁 */
  color: red;           /* 声明：属性: 值 */
  font-size: 16px;      /* 分号分隔多条声明 */
}
```

可以把页面看成毛坯房：HTML 是墙和房间，CSS 是装修。选择器决定“刷哪面墙”，声明决定“刷成什么颜色、刷多厚”。装饰的顺序也很重要，后面层叠那一节会看到，同一面墙被刷两次时，不是每次都后刷的赢。

## 三种引入方式

```html
<!-- ① 外链式：行业标配，样式放在独立 CSS 文件里 -->
<link rel="stylesheet" href="./style.css" />

<!-- ② 内嵌式：写在 head 的 <style> 里，单文件练习常用 -->
<style>
  p { color: #333; }
</style>

<!-- ③ 行内式：直接写在标签上，仅调试或极个别特例用 -->
<p style="color: red; font-weight: bold;">红色加粗</p>
```

| 方式 | 场景 | 主要代价 |
|---|---|---|
| 外链 | 正式项目一律用它：可缓存、可复用、结构与样式分离 | 多一次文件请求，现代项目几乎可以忽略 |
| 内嵌 | 单文件练习、临时实验 | 页面一多就难以维护 |
| 行内 | 邮件 HTML、临时调试 | 不能复用，优先级又最高，正常开发应避免 |

外链还有一个好处：多个页面共用同一个 `style.css` 时，浏览器只下载一次。后面项目里的公共样式、主题变量都会走这条路。

## 高频选择器

```css
/* ① 元素选择器：选中页面上所有该标签，杀伤面大，适合定基调 */
p { line-height: 1.6; }

/* ② 类选择器：最常用。class 可以有多个，样式围绕它组织 */
.card { border: 1px solid #ddd; }

/* ③ ID 选择器：选中唯一 id；一个页面里 id 只能出现一次 */
#main-map { height: 90vh; }

/* ④ 后代选择器：空格表示“任意层级里”，只影响 .card 内部的 p */
.card p { color: #555; }

/* ⑤ 子选择器：> 只选直接子级，孙辈不选 */
.menu > li { padding: 8px; }

/* ⑥ 群组选择器：逗号表示同时选多个 */
h1, h2, h3 { font-weight: 600; }

/* ⑦ 属性选择器：按属性选，表单控件很常用 */
input[type="text"] { border: 1px solid #ccc; }
input[type="radio"] { accent-color: #1677ff; }

/* ⑧ 类叠加：同时拥有两个类才选中 */
/* HTML：<div class="card active">…</div> */
.card.active { border-color: #1677ff; }
```

类叠加和后代选择器经常一起出现，比如 `.card.active` 是“同一个元素同时带两个类”，而 `.card .active` 是“`.card` 里面的 `.active`”，两者不要混淆。

> ✍️ 命名习惯：class 用小写中划线（`main-title`、`map-container`），按职责命名。`style1`、`red2` 这种“样子名”在换肤时会让人找不到北。

## 冲突了听谁的：层叠初步

同一条样式被多处声明时，浏览器按两步定胜负：

1. **比优先级**：ID 选择器 > 类选择器 > 元素选择器。用记分法理解就是 `#id` 100 分、`.class` 10 分、`p` 1 分，分高者胜。
2. **同分比先后**：后写的覆盖先写的。

```css
/* 下面两条都命中 <p class="intro">，谁赢？ */
p { color: black; }        /* 1 分 */
.intro { color: blue; }    /* 10 分 → 蓝色赢 */
```

优先级只比较选择器，不比较声明块里的属性顺序。完整算法里还有继承和 `!important`，第 29 节会全部展开；现在先把“分数直觉”建立起来，写样式时自然就不会随手堆 ID。

## 伪类：按状态和位置点名

伪类用冒号开头，选中的不是元素本身，而是元素所处的状态：

```css
/* 悬停：鼠标移上去，按钮的必备反馈 */
button:hover { background: #4096ff; }

/* 激活：鼠标按下去的瞬间 */
button:active { transform: scale(0.98); }

/* 获得焦点：输入框被点击或 Tab 到它身上 */
input:focus { outline: 2px solid #1677ff; }

/* 否定：选中没有 .done 类的 li，待办列表里未完成项 */
li:not(.done) { color: #333; }

/* 结构伪类：第 n 个孩子，表格斑马纹神器 */
tr:nth-child(even) { background: #fafafa; }
li:first-child { font-weight: bold; }
```

`:not()` 的优先级按括号里的内容计算，`:not(.done)` 里的 `.done` 值 10 分。`:nth-child(even)` 表示偶数位，先数父元素下的所有子元素，再按位置匹配。

## 易错点

- **把 CSS 注释写成 HTML 注释**：CSS 里混入 `<!-- -->` 可能直接让后面的规则失效。CSS 注释是 `/* */`，这是两种语言，不能互相串门。
- **后代选择器选得过宽**：`.card p` 会命中卡片里任意层级的 `p`，包括嵌套很深的内容。只想管直接子级时用 `>`。
- **类叠加写成空格**：`.card .active` 是“里面的”，`.card.active` 才是“自己同时带两个类”。少一个点，语义完全不同。
- **一上来就用 ID 写样式**：ID 优先级 100 分，之后任何类选择器都盖不过它，重构成本很高。页面结构用 class 组织，ID 留给锚点和 JS。
- **把 `:hover` 当“点击效果”**：`:hover` 是悬停，`:active` 才是按下瞬间。移动端没有悬停状态，按钮反馈另有一套方案，到 JS 事件那一节再补。

## 动手练习：04 选择器打靶

配套文件：`02-web-basics/examples/04-选择器练习页.html`。页面里埋了 10 个靶子，答案写在文件内已有的 `<style>` 注释空位里；每写一条保存一次，看浏览器里的变化。

全部完成后的参考答案：

```css
/* 靶 1：类选择器，10 分 */
.target { color: #e03131; }

/* 靶 2：ID 选择器，100 分 */
#special { background: #ffe066; }

/* 靶 3：后代选择器，11 分 */
.list li { color: #1971c2; }

/* 靶 4：子选择器，11 分 */
.list > li { font-weight: 700; }

/* 靶 5：类叠加，20 分 */
.box.active { color: #2f9e44; }

/* 靶 6：属性选择器，11 分 */
input[type="text"] { border: 2px solid #1c7ed6; }

/* 靶 7：悬停伪类，11 分 */
.btn:hover { background: #f08c00; color: #fff; }

/* 靶 8：结构伪类，12 分 */
.list li:nth-child(even) { background: #f1f3f5; }

/* 靶 9：否定伪类，21 分 */
.list li:not(.done) { color: #d48806; }

/* 靶 10：群组选择器，3 分 */
h1, h2, .task { margin-left: 12px; }
```

练习里值得多停一下的是靶 3、4、9：

- 靶 3 的后代选择器会连第二层嵌套的 `li` 一起选蓝；靶 4 的子选择器只加粗第一层，两层结果可以同时观察。
- 靶 9 的 `.list li:not(.done)` 是 10 + 1 + 10 = 21 分，会覆盖靶 3 的 11 分，所以未完成项变橙，`.done` 项保持蓝色。
- 靶 8 的偶数位是按 `.list` 的直接子元素数，嵌套在第二层的 `li` 不算数。

通关标准：

- [ ] 10 个靶子全部命中
- [ ] 能说出后代选择器和子选择器的区别，以及各自适合什么场景
- [ ] 能解释 `.card.active` 和 `.card .active` 为什么是两种选择
- [ ] 给页面里的按钮加 `:hover` 效果，并说清优先级分数

## 自测题

1. 三种引入方式在正式项目里怎么选？为什么？
2. `.card p` 和 `.card > p` 的区别？
3. `<p class="a b">` 同时命中 `.a { color: red; }` 和 `.b { color: blue; }`，最终颜色由谁决定？
4. `input[type="text"]` 和 `input:text` 哪个写法对？另一种错在哪？
5. `li:nth-child(even)` 选中的是第几个 `li`？

### 参考答案

1. 外链。可缓存、多页面共用一份、样式与结构分离，团队协作时也更容易维护。
2. `.card p` 选中卡片里所有层级的 `p`；`.card > p` 只选直接子级。
3. 两个类选择器同为 10 分，后写的 `.b` 生效，最终是蓝色。
4. `input[type="text"]` 对；`input:text` 不存在，`:text` 不是有效伪类。
5. 第 2、4、6… 个，也就是偶数位。

## 下一步

能“选中”元素之后，下一个问题是“选中的盒子到底占多大”。第 05 节从盒模型与布局流讲起，先把宽度、间距、边距这些最容易失控的概念钉死。
