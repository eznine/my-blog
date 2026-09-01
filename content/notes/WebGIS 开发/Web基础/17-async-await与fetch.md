---
title: "第 17 节 · async/await 与 fetch"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
order: 51
hidden: true
tags: ["web"]
---





# 第 17 节 · async/await 与 fetch

> 📌 **版本信息**：基于 ECMAScript 2025 与 Fetch API 现行标准（2026-08-29 核对）
> 📚 来源：[现代 JS 教程 · async/await](https://zh.javascript.info/async-await) ｜ [MDN Fetch API](https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API) ｜ [Open-Meteo 免费天气 API](https://open-meteo.com/en/docs)
> 🔑 本节练习使用 **Open-Meteo**：免费天气 API，**无需注册、无需 key**，直接 fetch。

## 一、这一节的目标

1. 精通 `async` 函数与 `await`——异步的"同步写法"
2. 掌握 `fetch` 的两段式（拿到响应 ≠ 拿到数据）与错误处理
3. 会请求 JSON 并处理真实网络的不确定性
4. 完成"天气 API 页面"——第一次请求真实互联网数据

---

## 二、async/await：让"未来的值"先变成值

第 16 节的结尾埋了伏笔：`??` 处理不了"未来的值"（Promise）。async/await 就是解药——**用同步的写法写异步的逻辑**：

```js
// Promise 链版（第 16 节）
function loadMap() {
  getLayers()
    .then((layers) => renderLayers(layers))
    .catch((err) => showError(err));
}

// async/await 版：几乎和同步代码长得一样
async function loadMap() {
  try {
    const layers = await getLayers();   // await：在这里"等"Promise 兑现，直接拿到值
    renderLayers(layers);
  } catch (err) {
    showError(err);                     // try/catch 接所有错误——你早就会的语法！
  } finally {
    hideLoading();
  }
}
```

**四条规则：**

1. `await` 只能在 `async` 函数里用（或模块顶层）
2. `await` 后面接 Promise，**得到的是兑现的值**；接普通值则原样返回
3. `async` 函数**永远返回 Promise**——`async` 函数内部 return 5，调用方拿到的是 `Promise<5>`，外部要拿 5 还得再 await 一次
4. 错误处理用 `try/catch/finally`，和同步代码完全一致

```js
// 并行：先发枪后等结果（❌ 串行要 2.6s，✅ 并行只要 1.6s）
async function loadAll() {
  const p1 = fetchQuakes();   // 立刻发出（不 await）
  const p2 = fetchCities();   // 立刻发出
  const quakes = await p1;    // 再分别等
  const cities = await p2;
  // 或者一步到位：const [quakes, cities] = await Promise.all([fetchQuakes(), fetchCities()]);
}
```

> ⚠️ **经典误区**：在循环里 `for (const id of ids) { await fetchOne(id) }` 会变成串行（一个等完才发下一个）。互相独立的请求用 `Promise.all` 并行。

---

## 三、fetch：浏览器原生的 HTTP 客户端

**一句话：fetch 发出 HTTP 请求，返回 Promise——但它有两段式陷阱。**

```js
async function getQuakes() {
  // 第一段：等"响应头"到达（此时服务器已应答，但数据体可能还没下完）
  const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');

  // ⚠️ 陷阱一：fetch 对 404、500 不抛错！它只在"网络层彻底失败"（断网/DNS）时 reject
  // 所以必须手动检查 response.ok（状态码 200~299 为 true）
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}：${response.statusText}`);
  }

  // 第二段：等"响应体"解析完（.json() 也是异步的，也返回 Promise）
  const data = await response.json();   // 还有 .text() / .blob() / .arrayBuffer()
  return data;   // GeoJSON 对象，直接能用！
}

// 调用（async 函数返回 Promise，外面接一层 await）
const quakes = await getQuakes();
quakes.features.length;   // ✅ 数据到手，第 12 节解剖过的结构
```

**带参数的请求**：GET 参数拼 URL，POST 用第二参数：

```js
// GET 带查询参数（URLSearchParams 自动处理转义）
const params = new URLSearchParams({ latitude: 30.59, longitude: 114.30, current_weather: true });
const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

// POST JSON（第 13 模块对接 FastAPI 时的样子）
await fetch('/api/pois', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: '武汉站', lat: 30.59, lng: 114.30 }),
});
```

> 💡 **CORS 预告**：浏览器默认禁止 A 网页读 B 服务器的响应（同源策略），B 服务器要返回 `Access-Control-Allow-Origin` 头"允许"才行。USGS/Open-Meteo 都开放了 CORS 所以能直接调；自建后端时 FastAPI 配 CORS 是第 13 模块的固定步骤。

---

## 四、真实数据的健壮性

外部数据永远不可信，三道防线：

```js
async function safeFetch(url, { timeout = 8000 } = {}) {
  // 防线 1：超时控制（AbortController：fetch 的官方刹车）
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    // 防线 2：状态码检查
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // 防线 3：结构检查（外部数据字段未必齐）
    if (!data || !Array.isArray(data.features)) throw new Error('数据格式异常');
    return data;
  } finally {
    clearTimeout(timer);
  }
}
```

---

## 五、动手跟练：17 · 天气 API 页面

配套文件：`02-web-basics/examples/17-天气API页面.html`

**步骤：**

1. Live Server 打开：输入城市坐标（预置武汉），点"查天气"→ 请求**真实的 Open-Meteo API** 渲染当前天气
2. 读代码：safeFetch 三道防线、URLSearchParams 拼参数、渲染函数
3. 完成 5 个 TODO：城市下拉切换（预设 4 个城市坐标）、渲染风力/温度/天气代码、错误重试按钮、加载骨架、查多个城市用 Promise.all 对比
4. Network 面板观察这次**真实请求**的完整过程（请求 URL、状态码、响应 JSON）

**通关标准：**

- [ ] 真实数据成功渲染，Network 里能指出请求与响应
- [ ] 把 URL 里的坐标改坏（如 latitude=abc），观察 Open-Meteo 返回错误结构，页面给出友好提示
- [ ] 能复述 fetch 的"两段式"与"不抛错陷阱"

---

## 六、自测题

1. `await` 一个普通数字会怎样？
2. async 函数里 `return 5`，调用方拿到的是什么？怎么拿到 5？
3. fetch 请求 404 时会 reject 吗？正确处理方式？
4. `response.json()` 为什么也要 await？
5. 三个互不依赖的接口，怎么请求最快？写出骨架。

### 参考答案

1. 原样返回（await 对非 Promise 值直接透传）。
2. Promise（值为 5 的）；再 await 一次拿到 5。
3. 不会；fetch 只在网络层失败时 reject。必须 `if (!response.ok) throw ...` 手动转错误。
4. 响应体的读取与解析是流式的、需要时间，`.json()` 返回 Promise。
5. 三个都先发出（不 await），再统一 `const [a, b, c] = await Promise.all([p1, p2, p3])`；总耗时 ≈ 最慢者。

---

## 七、下一步

异步通关。最后一块拼图：代码越写越多怎么组织 → **第 18 节：模块化**，阶段一 JS 完结。
