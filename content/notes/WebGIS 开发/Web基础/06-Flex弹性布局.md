---
title: "第 06 节 · Flex 弹性布局"
date: "2026-09-07"
category: "WebGIS 开发"
chapter: "Web基础"
code: "/code/06.html"
codeLabel: "06-导航栏与多列卡片.html"
order: 6
tags: ["web"]
---

# 第 06 节 · Flex 弹性布局

> 📌 **版本信息**：基于 CSS Flexible Box Layout Module Level 1（现代浏览器稳定支持；2026-09-06 核对）
> 📚 来源：[MDN Flexbox](https://developer.mozilla.org/zh-CN/docs/Learn/CSS/CSS_layout/Flexbox) ｜ [Flexbox Froggy 游戏](https://flexboxfroggy.com/#zh-cn) ｜ [A Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)

## 当导航栏和地图主区需要各就各位

第 05 节之后，单盒子的尺寸和间距已经可控，但“摆一排盒子”仍然别扭。拿一个 WebGIS 工作台首页举例：顶部导航栏里 logo 居左、菜单居右；中间一排城市卡片要三列等宽、间距一致；底部是左侧 240px 图层面板、右侧地图区吃掉所有剩余空间。

用块级元素自然堆叠做不到这些；用 `inline-block` 和 `float` 硬凑，又会遇到末尾空格、垂直对齐、清除浮动等问题。Flex 把这个问题收敛成一套清晰的规则：先决定主轴方向，再决定这一条线上怎么排。地图门户常见的顶栏、卡片墙、侧栏 + 地图主区，都是同一套 Flex 骨架。

## 这一节讲什么

本节讲 Flex 的两根轴、容器属性、子项属性，以及 Flex 与 Grid 的分工。学完这一节可以做到：

- 说清主轴和交叉轴由谁决定，`justify-content` 与 `align-items` 各自管哪根轴
- 用容器属性完成横排、居中、两端对齐、换行和统一间距
- 用 `flex: 0 0 240px` 锁住侧栏宽度，用 `flex: 1` 让地图区吃掉剩余空间
- 解释 `flex-grow`、`flex-shrink`、`flex-basis` 三个数字的意义
- 独立搭出“导航栏 + 卡片墙 + 侧栏 + 主区”的 WebGIS 工作台骨架

## 一根主轴和一根交叉轴

给容器写 `display: flex` 后，它的直接子元素会成为弹性项（flex item），默认沿着主轴排成一行：

```text
flex-direction: row（默认）

  主轴（justify-content 管这头）→
  ┌──────────────────────────────────┐
  │  [logo]  [菜单]  [菜单]  [菜单]   │
  └──────────────────────────────────┘
        ↓ 交叉轴（align-items 管这头）
```

`flex-direction: column` 时两根轴交换：主轴变竖轴，交叉轴变横轴。所以写属性前先问一句“现在主轴朝哪”，答案不对，`justify` 和 `align` 就全反了。主轴方向由 `flex-direction` 决定，不是由屏幕方向或元素数量决定。

## 容器属性：写在父元素上

```css
.container {
  display: flex;              /* 开关：只影响直接子元素 */

  justify-content: flex-start;    /* 主轴：默认从头排 */
  justify-content: center;        /* 主轴：居中 */
  justify-content: space-between; /* 主轴：首尾贴边，中间均分，导航栏常用 */
  justify-content: space-around;  /* 主轴：每项两侧等距 */
  justify-content: space-evenly;  /* 主轴：首尾也参与均分 */

  align-items: stretch;       /* 交叉轴：默认拉满容器高度，卡片等高的来源 */
  align-items: center;        /* 交叉轴：居中 */
  align-items: flex-start;    /* 交叉轴：顶对齐 */
  align-items: flex-end;      /* 交叉轴：底对齐 */

  flex-direction: row;        /* 主轴方向：row 横排，column 竖排 */
  flex-wrap: wrap;            /* 放不下时换行；默认 nowrap 会硬挤 */
  gap: 16px;                  /* 子项之间的间距，替代 margin 对碰 */
}
```

换行后还会出现第二个问题：多行之间怎么分。`align-items` 管的是“每一行内部的对齐”，`align-content` 管的是“多行整体在交叉轴上的分布”。单行布局用不到后者，卡片墙换行后想控制行间距离时才会碰到。

`gap` 只负责弹性项之间的间距，不参与 margin 合并，也不会在首尾多出一段外边距。它比“每个子项写 margin，再修第一个和最后一个”清晰得多，是第 05 节那些间距问题的正面解法。

## 子项属性：写在子元素上

`flex` 是 `flex-grow`、`flex-shrink`、`flex-basis` 的简写，默认值是 `0 1 auto`：

```css
/* grow: 有剩余空间时是否放大、放大多少（0 不放大，1 按权重分） */
/* shrink: 空间不足时是否缩小（0 不缩小，1 按权重缩） */
/* basis: 主轴方向上的基准尺寸 */

.sidebar { flex: 0 0 240px; }  /* 不放大、不缩小、基准 240px = 固定宽 */
.map-area { flex: 1; }         /* 1 1 0%：基准为 0，剩余空间全归它 */
.card { flex: 0 1 200px; }     /* 可缩小但不可放大，基准 200px */
```

`flex: 1` 是 WebGIS 里最常见的写法：侧栏写死，主区写 `flex: 1`，窗口怎么变，地图区都会接管剩下的宽度。数字不是“占几份”的简单比例，而是放大时的权重；只有所有项基准都是 0 时，它才表现成严格的比例分配。

单个子项还可以独立于兄弟项对齐：

```css
.logo { align-self: flex-end; }  /* 只改自己，不影响其他子项 */
.item { order: -1; }             /* 视觉顺序可以不等同于 DOM 顺序 */
```

## Flex 和谁竞争：为什么不用 inline-block 和 float

`inline-block` 能横排，但元素之间的空白字符会变成真实间距，垂直居中要猜行高，子项宽度也只能写死。`float` 更接近“文字环绕”的原始用途，用它拼整页布局需要清除浮动，间距和高度都容易失控。

Flex 的价值在于“弹性”：剩余空间可以按权重分配，空间不足可以换行或收缩，交叉轴对齐由一行属性完成。它和 Grid 的分工是：Flex 擅长一根轴上的排列，Grid 擅长行和列同时控制的二维布局。卡片墙两轴都有列和行，用 Grid 也合理；但导航栏、侧栏、表单行这种一维场景，Flex 更直接。

## 从导航栏到工作台：三个渐进场景

**场景一：导航栏。** 左 logo、右菜单，垂直居中：

```css
.navbar {
  display: flex;
  justify-content: space-between;  /* logo 贴左、菜单贴右 */
  align-items: center;             /* 两边的子项垂直居中 */
}
```

`space-between` 适合只有两个大分区的情况。`space-around` 和 `space-evenly` 适合菜单项本身直接作为弹性项、首尾也要留空的情况。

**场景二：卡片墙。** 三列等宽、自动换行、间距统一：

```css
.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.card {
  flex: 0 0 calc(33.33% - 11px);  /* 三列基准，减掉 gap 占的宽度 */
}
```

`flex-basis` 的百分比按容器内容区宽度计算，而两个 16px 的 gap 也要占宽度，所以直接写 `33.33%` 会多出约 10.67px 一行放不下。减去 11px 是经验值，也可以用 `calc((100% - 32px) / 3)` 写得更严谨。

**场景三：侧栏 + 地图主区。**

```css
.app { display: flex; }          /* 默认 row：左侧栏 + 右主区 */
.sidebar { flex: 0 0 240px; }    /* 侧栏永远 240px */
.map-area { flex: 1; }           /* 地图区吃掉全部剩余空间 */
```

如果整页是“顶栏 + 下面主区”，就把外层容器改成 `flex-direction: column`，顶栏 `flex: 0 0 56px`，主区 `flex: 1`。顶栏固定、侧栏固定、中间弹性，这套组合在后面的地图工作台里会反复出现。

## 易错点

- **没先确认主轴方向**：`column` 布局里还用 `justify-content` 管左右居中，等于在竖轴上排横排。先画一下主轴，再决定写 `justify` 还是 `align`。
- **三列宽度写 `33.33%` 不加 gap 补偿**：换行后第三列掉到下一行。gap 占的是真实宽度，基准宽度要一起减掉。
- **`align-items` 和 `align-content` 混用**：单行看 `align-items`，换行后的行间分布看 `align-content`。卡片没有等高，先检查是不是某处写了 `align-items: flex-start`。
- **把 `flex: 1` 当成 `width: 100%`**：`width: 100%` 不会参与剩余空间分配，还可能和兄弟项一起溢出；`flex: 1` 才是弹性项的正确写法。
- **Flex 只作用于直接子元素**：`.cards > .card` 是弹性项，卡片里再深一层的元素不会自动横排。想对内部继续布局，要在那一层再开一个 Flex 容器。
- **忘了子元素自带的 margin**：Flex 能管理弹性项之间的间距，但卡片内部 `h3` 的默认 margin 仍会存在，该归零时还得归零。

## 动手练习：06 导航栏与多列卡片

配套文件：`02-web-basics/examples/06-导航栏与多列卡片.html`。用 Live Server 打开，页面分三个任务区：导航栏、六张城市卡片、WebGIS 雏形布局。文件里有 10 个 TODO，按顺序完成，每个 TODO 保存一次并刷新观察。

参考答案：



```css
/* TODO 1：开启 Flex */
	display: flex;

/* TODO 2：logo 居左、菜单居右 */
	justify-content: space-between;

/* TODO 3：内部全部垂直居中 */
	align-items: center;

/* TODO 4：卡片墙开启 Flex 并允许换行 */
	display: flex; flex-wrap: wrap;

/* TODO 5：子项间距统一 16px */
	gap: 16px;

/* TODO 6：三列等宽 */
	flex: 0 0 calc(33.33% - 11px);

/* TODO 7：同一行的卡片等高 */
	align-items: stretch;

/* TODO 8：侧栏 + 主区开启 Flex（横排） */
	display: flex;

/* TODO 9：侧栏固定 240px */
	flex: 0 0 240px;

/* TODO 10：地图区吃掉剩余空间 */
	flex: 1;
```

值得停下来理解的地方：

- TODO 6 的 `- 11px` 来自两个 gap：32px ÷ 3 ≈ 10.67px，减 11px 后三张卡刚好一行放满。
- TODO 7 其实只是把默认值写出来，但显式声明能提醒：如果哪张卡没有被拉伸，多半是别处写了 `align-items: flex-start` 把它覆盖了。
- TODO 9 和 10 是一对：侧栏“写死不参与弹性”，主区“吃掉所有剩余”，这个组合比给主区写百分比宽度更稳。

通关标准：

- [ ] 导航栏 logo 居左、菜单居右，整体垂直居中
- [ ] 卡片墙三列等宽、间距一致、同列卡片等高；窗口拉窄后卡片换行
- [ ] 底部布局里侧栏稳定 240px，地图区吃掉剩余空间
- [ ] 能口头说清 `justify-content` 和 `align-items` 分别管哪根轴

## 自测题

1. `flex-direction: column` 时，`justify-content: center` 让子项往哪里居中？
2. `justify-content: space-between` 和 `space-evenly` 的区别？
3. `.sidebar { flex: 0 0 280px; }` 三个数字分别是什么意思？
4. 卡片墙用 `gap: 16px` 后，三列等宽为什么写 `calc(33.33% - 11px)` 而不是 `33.33%`？
5. 为什么说 `gap` 优于用子项 margin 排间距？

### 参考答案

1. 垂直方向。`column` 让主轴变成竖轴，`justify-content` 跟着管竖向。
2. `space-between` 首尾贴边，只在项与项之间均分；`space-evenly` 连首尾两侧的空隙也参与均分。
3. `flex-grow: 0`（不放大）、`flex-shrink: 0`（不缩小）、`flex-basis: 280px`（主轴基准尺寸）。
4. 两个 gap（16px × 2 = 32px）也要占宽度，三张卡各减 32 ÷ 3 ≈ 10.67px，即约 11px，才不会溢出换行。
5. `gap` 不参与 margin 合并，不用修首尾多出的 margin，一处声明管所有间隔，语义也更明确。

## 下一步

一维排列已经拿下。第 07 节讲定位与层叠，解决元素“浮起来、钉住、叠在上面”的问题：地图控件、固定顶栏、要素弹窗都靠它。
