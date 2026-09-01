---
title: "第 06 节 · Flex 弹性布局"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
order: 24
tags: ["web"]
---




# 第 06 节 · Flex 弹性布局

> 📌 **版本信息**：基于 CSS Flexible Box Layout Module Level 1（所有现代浏览器稳定支持；2026-08-29 核对）
> 📚 来源：[MDN Flexbox](https://developer.mozilla.org/zh-CN/docs/Learn/CSS/CSS_layout/Flexbox) ｜ [Flexbox Froggy 游戏](https://flexboxfroggy.com/#zh-cn)（强烈推荐 10 分钟通关） ｜ [A Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)

## 一、这一节的目标

1. 建立 Flex 的核心心智模型：**主轴 + 交叉轴**
2. 掌握容器三件套：`display: flex` + `justify-content` + `align-items`
3. 掌握 `flex-direction` / `flex-wrap` / `gap`
4. 理解 `flex: 1` 的分配逻辑（地图应用侧栏/地图区的经典布局）
5. 完成"导航栏 + 多列卡片"——以后所有 WebGIS 面板的排布骨架

---

## 二、Flex 是什么

**一句话：给一个容器加上 `display: flex`，它的子元素就从"堆叠"变成"按你指定的方向灵活排列"。**

过去居中一个元素要背口诀，现在：

```css
.parent {
  display: flex;
  justify-content: center;  /* 主轴居中 */
  align-items: center;      /* 交叉轴居中 */
}
/* 两行代码，完美居中——曾经的前端面试题变成了一行配置 */
```

### 核心心智模型：两根轴

```
默认（flex-direction: row，行方向）：

        主轴（justify-content 管这头）→
  ┌──────────────────────────────────┐
  │  [A]  [B]  [C]                   │
  └──────────────────────────────────┘
        ↓ 交叉轴（align-items 管这头）

flex-direction: column（列方向）时两轴互换！
```

**先想清楚主轴方向，再选 justify 还是 align**——这是 Flex 不迷路的唯一秘诀。

---

## 三、容器属性（写在父元素上）

```css
.container {
  display: flex;              /* 开关：开启 Flex */

  /* 主轴排列（6 个常用值） */
  justify-content: flex-start;  /* 默认：从头排 */
  justify-content: center;      /* 居中 */
  justify-content: space-between; /* 两端对齐，中间均分 ← 导航栏神器 */
  justify-content: space-around;  /* 每项两侧等距 */
  justify-content: space-evenly;  /* 完全均分 */

  /* 交叉轴对齐 */
  align-items: stretch;     /* 默认：拉满容器高 ← 卡片等高的秘密 */
  align-items: center;      /* 垂直居中 */
  align-items: flex-start;  /* 顶对齐 */
  align-items: flex-end;    /* 底对齐 */

  /* 方向与换行 */
  flex-direction: row;      /* 默认横排；column 竖排 */
  flex-wrap: wrap;          /* 放不下时换行（默认 nowrap 会硬挤） */

  /* 间距：现代方案，替代 margin 对碰（第 05 节的坑直接消失） */
  gap: 16px;                /* 子项间距统一 16px */
}
```

---

## 四、子项属性（写在子元素上）

```css
/* flex: 1 —— 弹性分配的核心
   含义：有剩余空间就抢来分掉；数字是分配权重 */
.sidebar { flex: 0 0 260px; }  /* 不放大不缩小，固定 260px（图层树侧栏） */
.map-area { flex: 1; }         /* 抢走所有剩余空间（地图区） */

/* 单个子项的交叉轴特立独行 */
.logo { align-self: flex-end; }

/* 排序与禁缩 */
.item { order: -1; }        /* 排最前（视觉顺序 ≠ DOM 顺序） */
.no-shrink { flex-shrink: 0; } /* 不许被压缩 */
```

> 💡 **WebGIS 经典布局一行代码**：地图页 = 顶栏 + (侧栏 + 地图)。用 Flex：
> ```css
> .app { display: flex; flex-direction: column; height: 100vh; }
> .topbar { flex: 0 0 48px; }
> .main { flex: 1; display: flex; }
> .sidebar { flex: 0 0 280px; }
> .map { flex: 1; }   /* 地图自动填满剩余 */
> ```
> 把这段记住，第 05 模块写地图工作台时直接用。

---

## 五、常见布局配方（抄走即用）

```css
/* ① 导航栏：左 logo 右菜单 */
.navbar { display: flex; justify-content: space-between; align-items: center; }

/* ② 卡片墙：自动换行 + 等间距 */
.cards { display: flex; flex-wrap: wrap; gap: 16px; }
.cards .card { flex: 0 0 calc(33.33% - 11px); } /* 三列（gap 也占宽，要减掉） */

/* ③ 完美居中 */
.center { display: flex; justify-content: center; align-items: center; }

/* ④ 表单行：label 定宽 + 输入框自适应 */
.row { display: flex; align-items: center; gap: 8px; }
.row label { flex: 0 0 80px; }
.row input { flex: 1; }
```

---

## 六、动手跟练：06 · 导航栏与多列卡片

配套文件：`02-web-basics/examples/06-导航栏与多列卡片.html`

**步骤：**

1. Live Server 打开：页面有一个素坯导航栏和 6 张城市卡片
2. 按文件内 7 个 TODO 完成：导航栏 space-between、菜单居中、卡片墙换行 + gap、三列等宽、卡片等高、侧栏+主区弹性布局（WebGIS 雏形）
3. 把浏览器窗口拉窄，观察 `flex-wrap` 的换行行为

**通关标准：**

- [ ] 导航栏：logo 居左、菜单项等距居右、整体垂直居中
- [ ] 卡片墙：三列等宽、间距一致、卡片等高
- [ ] 底部"侧栏 + 地图区"布局：窗口任意缩放，侧栏 280px 纹丝不动，地图区吃掉剩余空间
- [ ] 口头回答：`justify-content` 和 `align-items` 分别管哪根轴？

---

## 七、自测题

1. `flex-direction: column` 时，`justify-content: center` 让子项往哪居中？
2. `justify-content: space-between` 和 `space-evenly` 的区别？
3. `.sidebar { flex: 0 0 280px }` 三个数字分别是什么意思？
4. 卡片墙用 `gap: 16px` 后，三列等宽为什么要写 `calc(33.33% - 11px)` 而不是 `33.33%`？
5. 为什么说 `gap` 优于用子项 margin 排间距？

### 参考答案

1. 垂直方向（column 时主轴变成竖轴）。
2. space-between 首尾贴边、只在项与项之间均分；space-evenly 连首尾两侧的空隙也参与均分。
3. flex-grow=0（不放大）、flex-shrink=0（不缩小）、flex-basis=280px（基准宽度）。
4. 两个 gap（16px×2=32px）也要占宽度：三张卡各减 32/3≈10.67px，即 33.33%−11px 才不会溢出换行。
5. gap 不参与 margin 合并、不用修首尾多出的 margin、语义清晰、一处声明管所有间隔。

---

## 八、下一步

一维排列（一行/一列）已拿下 → **第 07 节：定位与层叠**——让元素飘起来、钉住、叠在上面（地图控件、弹窗、悬浮球全靠它）。
