---
title: "第 19 节 · 为什么需要 TypeScript"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
tags: ["web"]
---

# 第 19 节 · 为什么需要 TypeScript

> 📌 **版本信息**：基于 TypeScript 5.x（2026-08 核对，TS 版本轮转快，特性以本节基础语义为主，多年稳定）
> 📚 来源：[TypeScript 官方手册中文](https://typescript.bootcss.com/) ｜ [TypeScript 教程（阮一峰）](https://wangdoc.com/typescript/) ｜ 本地教材 `resources/01-web-basics/typescript-tutorial/`

## 一、这一节的目标

1. 说出 JS 的三个"运行时才炸"的痛点
2. 理解 TS 的定位：**JS 的超集，编译成 JS 运行**
3. 看懂第一段 TS 代码（其实 90% 是 JS）
4. 理解"类型即文档"：为什么 AI 协作时代 TS 更重要

---

## 二、JS 的痛点：错误总在运行时才炸

```js
// 场景 1：手滑打错属性名
const city = { name: '武汉' };
console.log(city.nmae.length);   // ❌ 运行到这里才报 TypeError，页面白屏
// ↑ 你在 m00~18 的 Console 里一定见过几次

// 场景 2：函数参数传错
function zoomToResolution(zoom) { return 156543 / 2 ** zoom; }
zoomToResolution('10');   // '10' 是字符串，2 ** '10' 能算……但 156543 / '10' 呢？
// 静默返回错误结果，不报任何错——比报错更可怕

// 场景 3：重构靠猜
// mapCenter 变量到底有哪些字段？改名会不会炸？只能全局搜+祈祷
```

**TS 的解法：把检查提前到"写代码/编译时"。** 类似给图纸加审核环节——盖歪了在图纸上就打回，不用等楼盖一半塌。

---

## 三、TS 是什么

**一句话：TypeScript = JavaScript + 类型系统。所有合法 JS 都是合法 TS；TS 编译（编译器叫 tsc，Vite 内置支持）后输出纯 JS 运行。**

```
你写的 .ts ──tsc/vite 编译──→ 浏览器运行的 .js
             ↑ 编译期抓错：
             "nmae 不存在于类型上"、
             "string 不能赋给 number"
```

```ts
// 你的第一段 TS：其实就是 JS + 冒号标注
const cityName: string = '武汉';
let zoom: number = 10;
zoom = '10';   // ❌ 编译期就红波浪线：Type 'string' is not assignable to type 'number'

// 函数：参数和返回值都标
function degToRad(deg: number): number {
  return deg * (Math.PI / 180);
}
degToRad('30');   // ❌ 编译期报错——第 02 节的"场景 2"被当场抓获
```

**关键认知**：

1. TS 的类型标注是"零成本"的——编译后全部消失，不增加一行运行时代码
2. TS 不改变 JS 的运行规则，运行期的坑（如 NaN 比较）依然在；它管的是**写代码时的正确性**
3. 标注可以省略——TS 有强大的**类型推断**：`const lat = 30.59` 自动推断为 number，不用手写

---

## 四、为什么 AI 协作时代 TS 更重要

1. **类型即文档**：`interface City { name: string; lat: number; lng: number }` 比注释靠谱一万倍——它**强制**成立
2. **AI 生成代码的可验证性**：AI 写的 TS 过不了类型检查 = 一眼发现问题；`tsc` 就是免费的代码审查员
3. **重构有安全网**：改字段名，所有引用处立刻红线标出
4. **行业标配**：现代前端招聘几乎都写"熟悉 TypeScript"；React/Vue/OL 的官方类型定义（`.d.ts`）让库的用法在编辑器里自动提示

> 💡 你在 m04 里用的 OpenLayers 就带完整 TS 类型——`new Map({...})` 少写一个参数，编辑器立刻提醒。这就是 TS 生态的日常。

---

## 五、动手跟练：19 · JS vs TS 对照页

配套文件：`02-web-basics/examples/19-JS与TS对照.html`

**步骤：**

1. Live Server 打开：页面左边是"JS 版"代码，右边是"TS 版"，右边代码区我已用注释标出 TS 会在哪报错
2. 完成 4 个 TODO（都是"读代码找错"题）：找出打错的属性名、找出传错的参数类型、给函数补类型标注、预测推断结果
3. 体验环节（可选进阶）：去 [TypeScript Playground](https://www.typescriptlang.org/zh/play) 把 TODO 里的代码贴进去，看真实的红线报错——不用装任何东西

**通关标准：**

- [ ] 能说出"编译期 vs 运行时"检查的区别
- [ ] 能写出带参数/返回值标注的函数
- [ ] 能解释为什么 TS 编译后类型标注会消失

---

## 六、自测题

1. TS 和 JS 的关系？合法的 JS 文件改后缀为 .ts 能编译吗？
2. TS 的类型检查发生在什么时候？运行时还有类型约束吗？
3. `const lat = 30.59` 没写类型标注，lat 是什么类型？
4. TS 能防住 `0.1 + 0.2 !== 0.3` 这类运行期数值坑吗？
5. 为什么说"类型即文档"？

### 参考答案

1. TS 是 JS 超集；能，普通 JS 就是"没有类型标注的 TS"。
2. 编译期（写代码时）；运行时没有任何 TS 的东西（全被擦除）。
3. number（类型推断）。
4. 不能。TS 防的是类型错误，不管数值精度——那是 JS 运行时语义。
5. 类型声明机器可验证，永远准确不会过时；注释会撒谎，类型不会。

---

## 七、下一步

有了动机 → **第 20 节：基础类型标注**，把类型标注的"单词表"学全。
