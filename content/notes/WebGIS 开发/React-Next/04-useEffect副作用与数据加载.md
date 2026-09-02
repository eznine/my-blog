---
title: "第 04 节 · useEffect：副作用与数据加载"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "React-Next"
order: 18
tags: ["web"]
---







# 第 04 节 · useEffect：副作用与数据加载

> 📌 **版本信息**：React 19.x（2026-08-29 核对）
> 📚 来源：[React 中文文档 · Synchronizing with Effects](https://zh-hans.react.dev/learn/synchronizing-with-effects) ｜ [你不需要 Effect](https://zh-hans.react.dev/learn/you-might-not-need-an-effect)（重要！）

## 一、这一节的目标

1. 理解"副作用"：渲染之外的世界（网络/定时器/日志）
2. 掌握 useEffect 三段结构 + 依赖数组四种形态
3. 精通"请求 + 加载态 + 错误态"标准模式
4. 理解清理函数（防内存泄漏、防竞态）
5. 知道什么时候**不该**用 Effect（官方重点提醒）

---

## 二、副作用：渲染之外的世界

**组件函数的任务是"根据 state 算 JSX"，发请求、改标题、定时器这些"与渲染无关的外部操作"叫副作用（side effect）——它们不该发生在渲染过程中（第 02 节纯粹性），Effect 就是 React 给副作用的指定座位。**

```jsx
import { useEffect, useState } from 'react';

function QuakeList() {
  const [quakes, setQuakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ① 副作用主体：组件挂载后执行
    fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson')
      .then((r) => r.json())
      .then((data) => { setQuakes(data.features); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);   // ② 依赖数组

  // ③ 渲染部分照常（三态渲染）
  if (loading) return <p>加载中…</p>;
  if (error) return <p className="err">{error}</p>;
  return <ul>{quakes.map((q) => <li key={q.id}>{q.properties.place}</li>)}</ul>;
}
```

---

## 三、依赖数组：Effect 的触发开关

```jsx
useEffect(() => { ... }, []);      // 空数组：只在挂载后跑一次（首请求数据的标配）
useEffect(() => { ... }, [cityId]);   // 挂载后 + cityId 变化时（切换城市重查）
useEffect(() => { ... });          // 不传：每次渲染后都跑（几乎总是错的）
// Effect 里用到的"响应式值"（state/props）都应出现在依赖里——React 官方 lint 会强制
```

**心智模型**：Effect 是"让外部世界与 state 保持同步"。依赖数组回答"**什么变了需要重新同步**"。

```jsx
// 城市切换重查数据（依赖变化的典型）
useEffect(() => {
  setLoading(true);
  fetch(`/api/weather?city=${cityId}`)
    .then((r) => r.json())
    .then((d) => { setWeather(d); setLoading(false); });
}, [cityId]);   // cityId 一变 → 清理旧的 → 跑新的
```

---

## 四、清理函数：Effect 的"退场动作"

Effect 函数里 **return 一个函数**，它会在"下次 Effect 执行前"和"组件卸载时"执行——负责收拾自己：

```jsx
useEffect(() => {
  const timer = setInterval(refresh, 5000);
  return () => clearInterval(timer);   // 不清理 = 切走页面后定时器还在跑（第 33 节的泄漏）
}, []);

// 竞态防护（请求场景必修）：慢的旧请求覆盖新的新请求 = 显示错数据
useEffect(() => {
  let ignore = false;                    // 闭包住"本轮是否已过期"
  fetch(`/api/weather?city=${cityId}`)
    .then((r) => r.json())
    .then((d) => { if (!ignore) setWeather(d); });
  return () => { ignore = true; };       // cityId 变了 → 上一轮被标记废弃
}, [cityId]);
```

---

## 五、"你不需要 Effect"（官方重点）

初学者会把 Effect 当"任意时机执行代码的钩子"——官方专门写了反模式清单：

| ❌ 不该用 Effect 做 | ✅ 应该做 |
|---|---|
| 由 props/state 推导的数据（filtered = xs.filter...） | 渲染时直接算（第 02 节的派生数据） |
| 事件响应（点击提交后发请求） | 放事件处理函数里 |
| 链式 setState 改另一份 state | 合成一个 state 或渲染时派生 |
| 初始化全局 store | 模块顶层/惰性初始化 |

**判断口诀**：这件事**要不要在"渲染提交到屏幕"之后自动发生**？要 → Effect；是"用户操作引发的"→ 事件处理；是"由现有数据算出来的" → 渲染时直接算。

---

## 六、动手跟练：04 · 请求与加载态

配套文件夹：`03-react-nextjs/examples/04-请求与加载态/`（`npm i && npm run dev`，真实请求 USGS）

**步骤：**

1. 读代码：三态（loading/error/data）渲染 + 依赖数组 + 清理函数
2. 完成 6 个 TODO：按震级筛选下拉（state 变化触发重新渲染而非重新请求）、重试按钮、倒计时自动刷新（setInterval + 清理）、abort 上一次请求、骨架屏、把请求数据换成 Open-Meteo（第 17 节技能回归）
3. Network 面板勾 Slow 3G，切换城市，观察竞态防护是否生效

**通关标准：**

- [ ] 三态渲染完整（不会白屏/不会卡死在加载）
- [ ] 能说出依赖数组四种形态的语义
- [ ] 能解释 ignore 变量如何防止竞态
- [ ] 能举出一个"不该用 Effect"的例子

---

## 七、自测题

1. 为什么副作用不能直接写在组件函数体里？
2. 依赖数组四种形态分别什么时候跑？
3. 清理函数的两个触发时机？
4. 请求竞态是什么现象？ignore 方案原理？
5. "点击查询按钮后发请求"应该放在哪？为什么不是 Effect？

### 参考答案

1. 组件函数在每次渲染都会执行（StrictMode 还双调用），副作用会重复/不可控地触发——渲染必须保持纯粹。
2. `[]` 挂载后一次；`[a,b]` 挂载后+任一依赖变化后；不传每次渲染后；返回清理函数则在每次重跑前与卸载时。
3. 下一次同 Effect 执行前；组件卸载时。
4. 快慢请求乱序返回，慢的旧响应覆盖新的正确响应；每轮 Effect 闭包一个 ignore，清理时置 true，响应回来先查 ignore 再 setState。
5. 事件处理函数。它由用户操作引发、有明确时机，不是"渲染后的自动同步"——放 Effect 会破坏纯粹性与触发语义。

---

## 八、下一步

数据会"自动到位"了 → **第 05 节：列表渲染与 key**，把列表渲染的规则与 key 的原理一次讲透。
