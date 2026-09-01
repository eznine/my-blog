---
title: "第 26 节 · Tailwind：组件化样式模式"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
order: 70
tags: ["web"]
---




# 第 26 节 · Tailwind：组件化样式模式

> 📌 **版本信息**：基于 Tailwind CSS v4（`@apply` 语法；2026-08-29 核对）
> 📚 来源：[Tailwind · Reusing Styles](https://tailwindcss.com/docs/reusing-styles) ｜ [Tailwind · Functions & Directives（@apply）](https://tailwindcss.com/docs/functions-and-directives)

## 一、这一节的目标

1. 认识"类名太长"问题与三种解法
2. 掌握 `@apply`：把工具类打包成"组件类"
3. 掌握"提取组件"模式（前端框架时代的正解）
4. 会按状态变体（hover/disabled）组织按钮组件集

---

## 二、问题：同一串类名复制了 20 遍

```html
<!-- 项目里有 20 个按钮，每个都长这样 -->
<button class="bg-blue-600 hover:bg-blue-700 text-white font-medium
               px-4 py-2 rounded-md disabled:opacity-50">查询</button>
```

改一个颜色要改 20 处——**复制粘贴是坏味道**，三个解法：

| 解法 | 做法 | 何时用 |
|---|---|---|
| ① `@apply` 组件类 | CSS 文件里把一串工具类打包成 `.btn-primary` | 无框架的 HTML 项目 |
| ② 提取组件 | 把"按钮"做成 `Btn.vue` / `<Button>` 组件（第 03 模块起） | **框架项目（主流正解）** |
| ③ 循环渲染 | 数据驱动，模板只写一处 | 列表类重复 |

---

## 三、@apply：组件类打包

```css
/* v4：入口 CSS 里（Vite 项目即 @import "tailwindcss" 之后） */
@import "tailwindcss";

.btn {
  @apply inline-block font-medium rounded-md px-4 py-2 transition-colors;
}
.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}
.btn-sm {
  @apply px-2 py-1 text-sm;
}
```

```html
<!-- HTML 里变成语义化的短类名组合 -->
<button class="btn btn-primary">查询</button>
<button class="btn btn-danger btn-sm">删除</button>
```

**注意语义**：`.btn-danger` 是"用途名"（删除按钮）而不是"样子名"（红按钮）——将来换配色，用途名不用动（呼应第 04 节"别用样子名"）。

> ⚠️ **@apply 的克制原则**：官方也提醒别把 @apply 用回"传统 CSS 一大坨"的老路——**只在真正重复 ≥3 次的组合上用**，一次性样式留在类名里。

---

## 四、提取组件（预告第 03 模块）

框架里"按钮"直接变成代码组件，复用单位从"类名"升级为"组件"：

```tsx
// React 伪代码（第 03 模块正式学）
function Button({ color = 'primary', size, children }) {
  return (
    <button className={`btn btn-${color} ${size === 'sm' ? 'btn-sm' : ''}`}>
      {children}
    </button>
  );
}
// 使用：<Button color="danger" size="sm">删除</Button>
```

Tailwind 官方的态度：**重复 → 先提取组件，@apply 是 HTML 项目时代的方案**。我们按此顺序教：现在学 @apply，框架后用组件。

---

## 五、动手跟练：26 · 按钮组件集

配套文件：`02-web-basics/examples/26-按钮组件集.html`

**步骤：**

1. Live Server 打开：一个"按钮全家福"页面（主按钮/危险按钮/幽灵按钮 × 大中小 × 禁用态），类名已经用 `@apply` 打包成组件类
2. 页面用 CDN 版无法使用 `@apply`（@apply 属于构建特性）——文件里演示了**双方案**：注释区是构建版 CSS，页面内联了一段等效 CSS（读代码理解映射关系）
3. 完成 4 个 TODO：加"成功按钮"组件类、加"加载中"状态样式（disabled + cursor-wait）、给幽灵按钮加边框 hover 反色、把按钮集做成小尺寸表单行
4. 思考题（写在文件注释里）：这 6 种按钮如果放到 React 里，你会怎么提取组件？

**通关标准：**

- [ ] 能说出 @apply 的适用边界（重复 ≥3 次才用）
- [ ] 组件类命名全部是"用途名"
- [ ] 4 个 TODO 完成且按钮态齐全（normal/hover/disabled/loading）

---

## 六、自测题

1. 三种复用解法分别是什么？框架项目首选哪种？
2. `@apply` 应该克制在什么场景？
3. 为什么组件类要按"用途"命名而不是"样子"命名？
4. CDN 版为什么用不了 `@apply`？
5. `disabled:cursor-not-allowed` 完整翻译成 CSS？

### 参考答案

1. @apply 组件类 / 提取组件 / 循环渲染；框架项目首选提取组件。
2. 真正重复出现（约 ≥3 次）的组合；一次性组合留在类名里。
3. 样式会改版而用途不变——用途名让改版不动 HTML（语义稳定）。
4. @apply 是构建期指令，需要 Tailwind 编译管线处理；CDN 浏览器版只做工具类生成，没有编译期。
5. `button:disabled { cursor: not-allowed; }`。

---

## 七、下一步

样式系统成型 → **第 27 节：主题定制与暗色模式**，Tailwind 段收官，阶段一（01~27）整体完结。
