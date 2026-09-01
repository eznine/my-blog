---
title: "第 04 节 · CSS 引入与选择器"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
tags: ["web"]
---

# 第 04 节 · CSS 引入与选择器

> 📌 **版本信息**：基于 CSS Level 3/4 现行规范（选择器为稳定特性；2026-08-29 核对）
> 📚 来源：[MDN CSS 第一步](https://developer.mozilla.org/zh-CN/docs/Learn/CSS/First_steps) ｜ [MDN 选择器参考](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_selectors) ｜ [CSS 游戏 Flexbox Froggy](https://flexboxfroggy.com/#zh-cn)（第 06 节用）

## 一、这一节的目标

1. 说出 CSS 的三种引入方式及各自的使用场景
2. 掌握五类基础选择器，理解"选中谁才能改谁"
3. 理解层叠与冲突解决（谁说了算）
4. 认识常用伪类（`:hover` 等）
5. 会读会写一条完整的 CSS 规则

---

## 二、CSS 是什么

**一句话：CSS 描述"页面上每样东西长什么样"。**

```css
/* 一条 CSS 规则的解剖 */
selector {              /* 选择器：选中谁 */
  color: red;           /* 声明 = 属性: 值 */
  font-size: 16px;      /* 分号分隔多条声明 */
}
```

类比：HTML 是素坯，CSS 是刷漆——**选择器决定刷哪面墙，声明决定刷什么漆**。

---

## 三、三种引入方式

```html
<!-- ① 外链式（行业标配）：style.css 是独立文件 -->
<link rel="stylesheet" href="./style.css" />

<!-- ② 内嵌式：写在 head 的 <style> 里（小页面/练习用） -->
<style>
  p { color: #333; }
</style>

<!-- ③ 行内式：直接写在标签上（仅调试或个别特例用） -->
<p style="color: red; font-weight: bold;">红色加粗</p>
```

| 方式 | 场景 | 缺点 |
|---|---|---|
| 外链 | **正式项目一律用这个**：可缓存、可复用、结构清晰 | 需要多一个请求（可忽略） |
| 内嵌 | 单文件练习、临时实验 | 页面一多难维护 |
| 行内 | 邮件 HTML、极个别覆盖 | 无法复用、优先级最高难覆盖、应杜绝 |

> 💡 优先级口诀先记着：**行内 > 内嵌/外链（同后写者胜）**。完整的优先级算法第 29 节（阶段二）讲透。

---

## 四、五类基础选择器（每天都要用）

```css
/* ① 元素选择器：选中所有该标签（杀伤面大，慎用） */
p { line-height: 1.6; }

/* ② 类选择器（最常用！）：选中 class 含该名的所有元素 */
.card { border: 1px solid #ddd; }
<!-- HTML 里：<div class="card">…</div> -->

/* ③ ID 选择器：选中唯一 id（一个页面一个 id 只出现一次） */
#main-map { height: 90vh; }

/* ④ 后代选择器：选中"祖先里的"目标（空格分隔） */
/* 只选中 .card 里面的 p，不影响卡片外的 p */
.card p { color: #555; }

/* ⑤ 群组选择器：逗号 = 同时选多个 */
h1, h2, h3 { font-weight: 600; }
```

再补三个高频复合用法：

```css
/* 类叠加：同时有两个类的元素 */
/* <div class="card active">…</div> */
.card.active { border-color: blue; }

/* 子选择器（>）：只选直接子元素，孙辈不选 */
.menu > li { padding: 8px; }

/* 属性选择器：按属性选（input 的 type 场景超好用） */
input[type="text"] { border: 1px solid #ccc; }
input[type="radio"] { accent-color: #1677ff; }
```

> ✍️ **命名习惯**：class 用小写中划线（`main-title`、`map-container`），语义化命名（见名知意），别用 `style1`、`red2` 这种"样子名"——将来换肤全完蛋。

---

## 五、冲突了听谁的：层叠初步

同一条规则被多处声明时，浏览器按三步定胜负：

1. **比优先级（specificity）**：ID 选择器 > 类选择器 > 元素选择器。
   记分法：`#id` = 100 分，`.class` = 10 分，`p` = 1 分，分高者胜。
2. **同分比先后**：后写的覆盖先写的。
3. **都分不出**：继承父亲的（比如 body 的字体传给子元素）。

```css
/* 例：下面两条都命中 <p class="intro">，谁赢？ */
p { color: black; }        /* 1 分 */
.intro { color: blue; }    /* 10 分 → 蓝色赢 */
```

> 💡 今天只需建立"分数直觉"。第 29 节（阶段二）会把层叠/继承/优先级的完整规则全部讲透，包括 `!important` 为什么是禁手。

---

## 六、伪类：状态选择器

伪类用冒号，选中"处于某种状态的元素"：

```css
/* 悬停：鼠标移上去（按钮必备） */
button:hover { background: #4096ff; }

/* 激活：鼠标按下去的瞬间 */
button:active { transform: scale(0.98); }

/* 获得焦点：输入框选中时（表单必备） */
input:focus { outline: 2px solid #1677ff; }

/* 否定：选中没有 .done 类的 li（待办列表未完成项） */
li:not(.done) { color: #333; }

/* 结构伪类：第 n 个孩子（表格斑马纹神器） */
tr:nth-child(even) { background: #fafafa; }
li:first-child { font-weight: bold; }
```

先记 `:hover`、`:focus`、`:nth-child` 三个，其余用到再查。

---

## 七、动手跟练：04 · 选择器练习页

配套文件：`02-web-basics/examples/04-选择器练习页.html`（页面里埋了 10 个"靶子"，全部用选择器命中）

**步骤：**

1. Live Server 打开，页面里有 10 道题：每道题要求你写一条 CSS 让指定元素变色
2. 答案写在文件内已有的 `<style>` 区（我留了注释好的空位）
3. 写一条 → 保存（Live Server 自动刷新）→ 看效果，循环
4. 全部命中后，把每个选择器的"分数"写在旁边注释里（`#x`=100 分这种）

**通关标准：**

- [ ] 10 个靶子全部命中
- [ ] 能说出"类选择器 vs 后代选择器"各自适合什么场景
- [ ] 给页面上所有按钮加 `:hover` 效果

---

## 八、自测题

1. 三种引入方式在正式项目里怎么选？为什么？
2. `.card p` 和 `.card > p` 的区别？
3. `<p class="a b">` 同时命中 `.a {color:red}` 和 `.b {color:blue}`，最终颜色谁定？
4. `input[type="text"]` 和 `input:text` 哪个写法对？另一种错在哪？
5. `li:nth-child(even)` 选中的是第几个 li？

### 参考答案

1. 外链。可缓存（多页面共用一份）、可维护（样式与结构分离）、团队协作友好。
2. `.card p` 选中卡片里所有层级的 p（子孙都算）；`.card > p` 只选直接子代 p。
3. 同为类选择器 10 分同分，后写的赢。
4. `input[type="text"]` 对；`input:text` 不存在（`:text` 不是有效伪类，文本框是默认态无需伪类）。
5. 第 2、4、6… 个（偶数位）。

---

## 九、下一步

能"选中"了，接下来解决"怎么摆" → **第 05 节：盒模型与布局流**——理解每个元素都是一盒子，是 CSS 布局的总开关。
