---
title: "第 25 节 · Tailwind：布局与常用工具类"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
order: 68
tags: ["web"]
---







# 第 25 节 · Tailwind：布局与常用工具类

> 📌 **版本信息**：基于 Tailwind CSS v4（2026-08-29 核对）
> 📚 来源：[Tailwind · Flexbox & Grid](https://tailwindcss.com/docs/flex) ｜ [Tailwind · 响应式设计](https://tailwindcss.com/docs/responsive-design)

## 一、这一节的目标

1. 把第 06/08 节的 Flex 与响应式知识"翻译"成 Tailwind 类
2. 掌握响应式前缀 `md:` `lg:`（媒体查询的类名形态）
3. 掌握状态前缀 `hover:` `focus:` `disabled:`
4. 会用 `hidden` 与 `block` 做元素显隐
5. 完成 Tailwind 版卡片墙（三端自适应）

---

## 二、Flex 类名对照表（第 06 节 → Tailwind）

| 原生 CSS | Tailwind 类 | 说明 |
|---|---|---|
| `display: flex` | `flex` | 开启 |
| `flex-direction: column` | `flex-col` | 竖排 |
| `justify-content: center` | `justify-center` | 主轴居中 |
| `justify-content: space-between` | `justify-between` | 两端对齐 |
| `align-items: center` | `items-center` | 交叉轴居中 |
| `flex-wrap: wrap` | `flex-wrap` | 换行 |
| `gap: 16px` | `gap-4` | 刻度表通用 |
| `flex: 1` | `flex-1` | 弹性抢占 |
| `flex: 0 0 280px` | `w-70`(定宽) + `shrink-0` | 定宽不缩 |
| `align-self: flex-end` | `self-end` | 单项特立独行 |

> 💡 规律：`justify-content` → `justify-`、`align-items` → `items-`、值去掉前面的 `flex-`。**单词即 CSS**，猜就能猜对大半。

---

## 三、响应式前缀：媒体查询的类名形态

第 08 节的媒体查询，在 Tailwind 里是"给类名加前缀"：

```html
<!-- 卡片：手机单列 → 平板两列 → 桌面三列 -->
<div class="flex flex-col md:flex-row md:flex-wrap gap-3">
  <div class="card md:w-[calc(50%-6px)] lg:w-[calc(33.333%-8px)]">…</div>
</div>

<!-- 侧栏：手机隐藏，桌面显示 -->
<aside class="hidden lg:block lg:w-56">…</aside>

<!-- 无前缀 = 所有尺寸生效；md: = ≥768px；lg: = ≥1024px（移动优先，和第 08 节一致） -->
```

常用断点前缀：`sm:`(≥640) `md:`(≥768) `lg:`(≥1024) `xl:`(≥1280)。

任意值语法 `w-[calc(33.333%-8px)]`：方括号里写任意值——**够不着的特殊值就用它**，但优先用标准刻度（保持设计统一）。

---

## 四、状态前缀与显隐

```html
<!-- hover: focus: disabled: 直接写在类名前 -->
<button class="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50">
  查询
</button>

<!-- hidden = display:none；block = display:block -->
<div class="hidden">默认隐藏</div>
<div class="hidden md:block">手机不显示，桌面显示</div>
<div class="block md:hidden">手机显示，桌面隐藏</div>
```

> 💡 第 14 节 JS 里用 `classList.toggle('hidden')` 控制显隐——Tailwind 项目里照样这么干，`hidden` 就是开关。

---

## 五、动手跟练：25 · Tailwind 版卡片墙

配套文件：`02-web-basics/examples/25-Tailwind版卡片墙.html`

**步骤：**

1. Live Server 打开：和第 08 节的"三端自适应页"同款需求，这次全部用 Tailwind 类实现（页面里没有一行 `<style>`）
2. 对照读：`flex-col md:flex-row` 对应原来哪段媒体查询？
3. 完成 5 个 TODO：卡片 hover 阴影浮起、导航深色反白、图片圆角、统计徽章（红点角标组合）、底部安全区
4. 拖窗口宽度验证三端表现与第 08 节一致

**通关标准：**

- [ ] 三端表现与第 08 节原生版一致
- [ ] 能把"≥1024px 时显示侧栏"翻译成类名组合
- [ ] 页面 `<style>` 标签为空或不存在

---

## 六、自测题

1. `md:flex-row` 的完整含义？
2. 移动优先在 Tailwind 里的体现是什么？
3. `w-[420px]` 这种方括号写法叫什么？什么时候用它？
4. `disabled:opacity-50` 完整翻译成 CSS？
5. `hidden md:block` 和 `block md:hidden` 分别什么效果？

### 参考答案

1. ≥768px 时 `display:flex; flex-direction:row`（小屏不受影响）。
2. 无前缀类 = 手机样式；`md:` 等前缀 = 逐级增强，等价于 min-width 媒体查询。
3. 任意值（arbitrary value）语法；标准刻度覆盖不到的特殊值时用，别滥用。
4. `button:disabled { opacity: 0.5 }`。
5. 前者手机隐藏、≥768px 显示；后者手机显示、≥768px 隐藏。

---

## 七、下一步

会"排"了 → **第 26 节：Tailwind 组件化样式模式**，类名太长怎么办——`@apply` 与组件类。
