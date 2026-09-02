---
title: "第 16 节 · 异步：回调与 Promise"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
order: 49
tags: ["web"]
---







# 第 16 节 · 异步：回调与 Promise

> 📌 **版本信息**：基于 ECMAScript 2025（Promise 为多年稳定语义；2026-08-29 核对）
> 📚 来源：[现代 JS 教程 · 介绍：回调](https://zh.javascript.info/callbacks) ｜ [现代 JS 教程 · Promise](https://zh.javascript.info/promise-basics) ｜ [MDN Using Promises](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Using_promises)

## 一、这一节的目标

1. 说清 JS 为什么需要异步（单线程 + 等待很贵）
2. 理解回调地狱的样子与成因
3. **精通 Promise 三态**：pending / fulfilled / rejected
4. 掌握 `then` / `catch` / `finally` 与 `Promise.all`
5. 为下一节 async/await 铺平道路

---

## 二、JS 为什么必须异步

**一句话：JS 只有一个线程（一次只能干一件事），而世界充满等待——网络要几百毫秒、文件要几十毫秒。同步等待 = 整个页面卡死。**

```
同步模式（假如）：                    异步模式（现实）：
发出请求 → 傻等 800ms → 再干别的      发出请求 → 先去干别的 → 数据到了再回来处理
        ↑ 期间页面完全卡死                    ↑ 期间页面照常响应
```

**JS 的解法**："你先去忙，好了叫我"——把一个**回调函数**交给发起任务的人，任务完成时它来调用你。

你在 m00 已经享受过异步了：`setTimeout(回调, 2000)`（定时到点叫你）、`addEventListener('click', 回调)`（点击发生叫你）。**事件监听就是最古老的异步。**

---

## 三、回调地狱：异步的黑暗时代

模拟流程：查城市坐标 → 用坐标查天气 → 用天气决定穿衣建议：

```js
getCoords('武汉', function (coords) {
  getWeather(coords, function (weather) {
    getAdvice(weather, function (advice) {
      console.log(advice);
      // 再往下呢？继续往右缩进……
    });
  });
});
// ↑ 这就是"回调地狱"（callback hell）：
//   层层嵌套、难以阅读、错误处理要在每一层重复写
```

**Promise 就是为了终结它而生的。**

---

## 四、Promise：一张"未来兑现的凭证"

**类比：点外卖后拿到的订单凭证。**
- 下单（发起异步任务）→ 得到凭证（Promise 对象）
- 凭证有三种状态：**pending**（等骑手）→ **fulfilled**（送到，有餐）/ **rejected**（订单失败，有原因）
- 状态一旦改变就**凝固**，不可逆

```js
// 创建一个 Promise：executor 函数立即执行，里面干"异步的活"
const p = new Promise((resolve, reject) => {
  setTimeout(() => {
    const dice = Math.random();
    if (dice > 0.3) {
      resolve('任务成功的数据');   // 成功：状态 → fulfilled
    } else {
      reject(new Error('任务失败')); // 失败：状态 → rejected
    }
  }, 1000);
});

// 消费这个 Promise：then 接成功，catch 接失败，finally 总是执行
p.then((data) => console.log('拿到：', data))
 .catch((err) => console.log('出错：', err.message))
 .finally(() => console.log('不管成败都执行（比如关掉 loading）'));
```

**要点：**

1. `then` 返回**新的 Promise**，所以能链式调用——扁平的链条取代层层嵌套
2. `catch` 一个就够：链条上任何一环出错，都会被最近的 catch 接住（错误处理集中了！）
3. `then` 里 return 的值会传给下一个 then（流水线传货）

```js
// 回调地狱的 Promise 版：嵌套消失，变成一列火车
getCoords('武汉')
  .then((coords) => getWeather(coords))     // return 下一个 Promise，链条继续
  .then((weather) => getAdvice(weather))
  .then((advice) => console.log(advice))
  .catch((err) => console.log('任一环节失败：', err));
```

---

## 五、Promise.all：并行等齐

加载地图页常见需求：**同时**请求底图配置、图层数据、统计数字——三个互不依赖，串行等三次太慢：

```js
Promise.all([getLayers(), getStats(), getUser()])
  .then(([layers, stats, user]) => {     // 结果按传入顺序排列
    console.log('全部到齐', layers, stats, user);
  })
  .catch((err) => console.log('有一个失败就整体失败', err));

// 全都要（哪怕失败）→ Promise.allSettled
Promise.allSettled([getLayers(), getStats()])
  .then((results) => results.forEach((r) => console.log(r.status, r.value ?? r.reason)));
```

| API | 语义 | 失败行为 |
|---|---|---|
| `Promise.all` | 全部成功才算成功 | 一个失败整体失败 |
| `Promise.allSettled` | 等全部结束 | 不短路，逐个看结果 |
| `Promise.race` | 谁先完成用谁 | 常用于超时控制 |

---

## 六、动手跟练：16 · 模拟异步加载

配套文件：`02-web-basics/examples/16-模拟异步加载.html`

**步骤：**

1. Live Server 打开，点"加载数据"按钮：模拟网络延迟后加载地震数据并渲染
2. 读代码：`fetchQuakes()` 返回 Promise；按钮处理函数里 then/catch/finally 各自干什么
3. 完成 4 个 TODO：加载中状态（按钮禁用+文字变化）、失败重试、Promise.all 同时加载"地震+城市"两组数据、把回调地狱版改写成 Promise 链
4. 打开 Network 面板设为 Slow 3G 感受真实网络（本练习用 setTimeout 模拟，第 17 节换真请求）

**通关标准：**

- [ ] 加载期间按钮不可重复点击（防手抖连点）
- [ ] 能不看资料写出一个 50% 成功率的 Promise 并消费它
- [ ] 能说清回调地狱的两个痛点及 Promise 如何解决

---

## 七、自测题

1. JS 单线程却能做到"不卡页面"，靠的核心机制是什么？
2. Promise 的三种状态？状态能从 fulfilled 变回 pending 吗？
3. then 链中某一环抛错，错误会被谁接住？
4. `Promise.all` 和 `Promise.allSettled` 的选用原则？
5. `zoom ?? 10`（第 10 节）和异步有什么关系？——开放题：想想 `getZoomAsync()` 这类返回 Promise 的函数该和 ?? 怎么配合。

### 参考答案

1. 事件循环：异步任务完成后其回调被排进队列，等主线程空闲再执行（第 34 节阶段二细讲事件循环）。
2. pending / fulfilled / rejected；不能，状态凝固不可逆。
3. 链上最近的 catch（跳过中间的 then 直达）。
4. 缺一不可（全部成功才有意义）用 all；要"尽力而为、逐个检查"（多数据源容忍部分失败）用 allSettled。
5. 若 getZoomAsync() 返回 Promise，需要先 `.then(z => z ?? 10)` 拆开再判空——`??` 作用于值，不作用于"未来的值"（Promise）。这也是 async/await（第 17 节）存在的理由：让"未来的值"先变成值再运算。

---

## 八、下一步

Promise 已经够好，但 `.then` 链读多了还是绕 → **第 17 节：async/await 与 fetch**，异步的"同步写法"终极形态 + 第一次请求真实的网络数据。
