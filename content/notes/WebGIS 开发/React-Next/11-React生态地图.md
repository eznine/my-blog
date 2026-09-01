---
title: "第 11 节 · React 生态地图"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "React-Next"
tags: ["web"]
---

# 第 11 节 · React 生态地图

> 📌 **版本信息**：axios 1.x / dayjs 1.x / react-hook-form 7.x / Zustand 5.x（2026-08-29 核对）
> 📚 来源：各库官方文档 ｜ [react.dev · Sandbox](https://zh-hans.react.dev/learn)
> 🧭 定位：**认脸 + 知道何时用**——本节不求精通，求"读到 import 不发怵、遇到需求知道找谁"。

## 一、这一节的目标

1. 画出 React 生态的"装备栏"：每个槽位放什么工具
2. 掌握三个立即会用的：dayjs（时间）、axios（请求）、nanoid（id）
3. 认识两个后续会用的：Zustand（状态）、react-hook-form（复杂表单）
4. 建立"先找现成库，再自己写"的决策习惯

---

## 二、装备栏总览

| 需求 | 工具 | 一句话 | 本课何时用 |
|---|---|---|---|
| 时间处理 | **dayjs** | moment 的 2KB 替代品，链式 API | 列表时间格式化、倒计时 |
| HTTP 请求 | **axios** | fetch 的增强壳：拦截器/自动 JSON/错误统一 | C-03a、W 系列 |
| 唯一 id | **nanoid** | crypto.randomUUID 的便捷替代 | 前端造临时数据 id |
| 全局状态 | **Zustand** | 3 行上手的极简状态库（vs Redux 的仪式感） | 第 14 节大屏的筛选状态 |
| 复杂表单 | **react-hook-form** | 非受控+高性能表单 | W-1/W-2 的管理表单 |
| 图表 | **ECharts（echarts-for-react）** | 国内标配图表库 | W-3 大屏联动图表 |
| 路由 | react-router（已学） | — | 第 08 节 |
| UI | AntD（已学） | — | 第 10 节 |
| 动效 | framer-motion | 声明式动画 | C-03c 博客 |
| 工具集 | lodash-es | 防抖/节流/深比较等现成轮子 | 搜索防抖 |

**决策口诀**：先查官方文档有没有这个能力（React/AntD 本体）→ 再查这个"槽位"的社区标准库 → 都没有才自己写。

---

## 三、立即上手三件套

```jsx
// ── dayjs：时间处理 ──
import dayjs from 'dayjs';

dayjs(1756444800000).format('YYYY-MM-DD HH:mm');  // 时间戳 → '2025-08-29 12:00'
dayjs().add(3, 'day').format('M月D日');            // 三天后
dayjs('2026-08-20').diff(dayjs(), 'day');          // 相差几天（负数=过去）

// ── axios：请求 ──
import axios from 'axios';

// 与 fetch 的区别：①自动 JSON.parse ②非 2xx 直接抛错（没有 fetch 的"两段式陷阱"）
// ③可以配拦截器（统一加 token/统一处理错误）
const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
  params: { latitude: 30.59, longitude: 114.31, current_weather: true },  // 自动拼 query
});
const res = await axios.post('/api/pois', { name: '武汉站' });   // 自动 JSON.stringify

// ── nanoid：造 id ──
import { nanoid } from 'nanoid';
nanoid();   // 'V1StGXR8_Z5jdHi6B-myT'
```

---

## 四、认识两个"后续上线"的库

```jsx
// Zustand：极简全局状态（对比第 07 节 Context 的适用场景——高频更新/跨页面）
import { create } from 'zustand';

const useFilterStore = create((set) => ({
  minMag: 0,
  setMinMag: (v) => set({ minMag: v }),
}));
// 组件里：const { minMag, setMinMag } = useFilterStore(); —— 没有 Provider、没有样板

// react-hook-form：复杂表单（几十个字段/动态校验时的性能与简洁解）
// 本课程表单量级用受控+AntD Form 已够，W-2 大表单时再上
```

**Context vs Zustand 一句话**：低频全局数据（主题/用户/地图实例）用 Context；高频/跨页大状态用 Zustand（它做了精准订阅，只重渲染用到的组件）。

---

## 五、动手跟练：11 · 生态组件练习

配套文件夹：`03-react-nextjs/examples/11-生态组件练习/`（`npm i && npm run dev`；依赖 dayjs/axios/nanoid）

**步骤：**

1. 需求：USGS 地震面板 2.0——axios 请求数据（替代 fetch）、dayjs 格式化时间列、"xx 天前"相对时间（dayjs 插件 relativeTime）、nanoid 造本地收藏 id
2. 完成 4 个 TODO：axios 拦截器统一错误提示（接 AntD message）、relativeTime 中文语言包、收藏功能（nanoid 造 id + localStorage 持久化——第 09 节的 useLocalStorage Hook 复用）、把请求超时设为 8 秒（axios timeout 配置）
3. 对照实验：同一次请求分别用 fetch 与 axios 打日志，看返回结构差异（自己体会"两段式"与"自动解析"）

**通关标准：**

- [ ] 三个库都在项目里真实用上
- [ ] 能说出 axios 相比 fetch 的三个增强
- [ ] 能说出"什么时候 Context、什么时候 Zustand"

---

## 六、自测题

1. axios 对 404 响应的行为与 fetch 有何不同？
2. dayjs 相比直接用 Date 对象的价值？
3. 拦截器（interceptor）能统一处理什么？举两例。
4. 为什么高频全局状态推荐 Zustand 而非 Context？
5. "遇到需求先找现成库"的查找顺序？

### 参考答案

1. axios 非 2xx 直接 reject（进 catch）；fetch 把 404 当正常 resolve（要手动查 response.ok）。
2. 链式 API、解析容错、插件生态（时区/相对时间）、不可变操作——原生 Date 的 API 反人类且可变性埋坑。
3. 请求头统一注入 token；响应错误统一 message 弹出并 redirect 登录页。
4. Context value 变化会重渲染所有消费者；Zustand 按选择器精准订阅，只更新用到的组件。
5. React/AntD 本体能力 → 本课"装备栏"里对应槽位 → npm 关键词搜索（选维护活跃、周下载高、文档好的）→ 最后才自己写。

---

## 七、下一步

装备栏点亮 → **第 12 节：Hooks 全解（阶段二开篇）**，把 useState/useEffect 每个参数的"为什么"讲透。
