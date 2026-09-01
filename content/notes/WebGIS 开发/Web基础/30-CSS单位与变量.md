---
title: "第 30 节 · CSS 单位与变量"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
order: 75
tags: ["web"]
---




# 第 30 节 · CSS 单位与变量

> 📌 **版本信息**：基于 CSS Values and Units Level 4（现行规范；2026-08-29 核对）
> 📚 来源：[MDN CSS 值与单位](https://developer.mozilla.org/zh-CN/docs/Learn/CSS/Building_blocks/Values_and_units) ｜ [MDN 自定义属性](https://developer.mozilla.org/zh-CN/docs/Web/CSS/Using_CSS_custom_properties)

## 一、这一节的目标

1. 分清绝对单位与相对单位，形成"该用哪个"的条件反射
2. 精通 rem/em 的区别（前端布局第一大迷惑点）
3. 掌握视口单位 vh/vw/dvh 及移动端陷阱
4. 精通 CSS 自定义属性（变量）：定义、作用域、JS 读写
5. 会用 calc() 混合运算

---

## 二、单位全景图

| 类别 | 单位 | 相对于 | 典型用途 |
|---|---|---|---|
| 绝对 | `px` | 无（CSS 像素） | 边框、阴影、精细间距 |
| 字体相对 | `em` | **自身**字号 | 行内微调、行高 |
| 字体相对 | `rem` | **根元素**（html）字号 | 间距/字号主单位 |
| 视口 | `vw` / `vh` | 视口宽/高的 1% | 全屏布局 |
| 视口动态 | `dvh` / `svh` / `lvh` | 动态/最小/最大视口高 | 移动端全屏（修 100vh 陷阱） |
| 父级 | `%` | 父元素的对应属性 | 宽度自适应 |

**rem vs em 一句话分辨**：`em` 看自己（自己字号变了它跟着变，嵌套会**复利**——2em 里再 2em 是 4 倍），`rem` 看根（全页统一锚点，可预测）。**布局尺寸默认用 rem，仅在"随自身字号缩放"的场景用 em（如按钮 padding 随字号）**。

---

## 三、100vh 陷阱与 dvh（移动端必知）

```css
/* 痛点：手机浏览器顶部地址栏会收起/展开，100vh 按的是"最大视口"，
   地址栏收起前页面底部被地址栏遮住一截 */
.fullscreen { height: 100vh; }      /* 传统写法，移动端会溢出 */

/* 解法：动态视口单位（现代浏览器已全面支持） */
.fullscreen { height: 100dvh; }     /* dvh：随地址栏实时变化 */

/* 兜底写法（老浏览器渐进增强） */
.fullscreen { height: 100vh; height: 100dvh; }
```

第 08 节埋的这个坑在此正式填掉。**地图全屏场景（`height: 100dvh`）是 WebGIS 移动端标配。**

---

## 四、CSS 自定义属性（变量）

```css
/* 定义：-- 开头，放在选择器上（作用域=该选择器及其后代） */
:root {                        /* :root = html，全局变量约定放这里 */
  --brand: #1677ff;
  --map-height: calc(100dvh - 56px);
  --gap-base: 16px;
}

.card {
  border-color: var(--brand);
  height: var(--map-height);
  padding: var(--gap-base);
}

/* 作用域演示：局部覆盖（只影响这个容器内部） */
.dark-theme {
  --brand: #4096ff;            /* 后代读到的 --brand 变了——天然的主题机制 */
}

/* 带默认值的读取 */
color: var(--text-color, #333);   /* 未定义时用 #333 */
```

**JS 读写变量**（主题切换、动态配色的底层通道）：

```js
const el = document.documentElement;
getComputedStyle(el).getPropertyValue('--brand');   // 读
el.style.setProperty('--brand', '#ff4d4f');          // 写（全页即时换色！）
```

> 💡 **打通全链路**：第 27 节 Tailwind v4 的 `@theme { --color-primary: … }` 就是这套原生机制——Tailwind 把工具类的颜色指向 CSS 变量，你覆写变量即换肤。JS 的 setProperty 则是"运行时动态主题"（让用户自定义地图配色）的实现方式。

---

## 五、calc() 与现代函数

```css
/* calc：不同单位混合运算（+-*/，运算符两边必须有空格） */
.map { height: calc(100dvh - 56px); }         /* 视口高减顶栏 */
.card { width: calc(33.333% - 11px); }        /* 三列减 gap（第 06 节用过） */

/* clamp(最小, 理想, 最大)：响应式字号一行流（第 08 节用过） */
h1 { font-size: clamp(20px, 4vw, 32px); }

/* min / max：二选一 */
.sidebar { width: min(320px, 30vw); }         /* 不超过 30vw 的前提下用 320px */
```

---

## 六、自测题

1. 父元素 `font-size: 20px`，子元素 `padding: 1em` 是多少？换成 `1rem` 呢（html 字号 16px）？
2. `100vh` 在手机上为什么不可靠？现代解法？
3. CSS 变量的作用域由什么决定？`:root` 是什么选择器？
4. `var(--x, #333)` 的第二参数什么含义？
5. 用 JS 把全页品牌色换成红色，写核心一行。

### 参考答案

1. 20px（em 看自身字号）；16px（rem 只看根）。
2. 地址栏收放改变可视高度，100vh 按"最大视口"计算导致溢出；用 100dvh。
3. 由声明它的选择器决定（后代可读可覆盖）；`:root` 即 `html`。
4. 兜底默认值：`--x` 未定义（或值无效）时用 `#333`。
5. `document.documentElement.style.setProperty('--brand', '#ff4d4f')`。

---

## 七、下一步

静态样式全精通 → **第 31 节：过渡与动画全解**，让页面动起来（性能视角：合成层）。
