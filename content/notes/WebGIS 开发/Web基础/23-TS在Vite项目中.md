---
title: "第 23 节 · TS 在 Vite 项目中"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
order: 64
tags: ["web"]
---







# 第 23 节 · TS 在 Vite 项目中

> 📌 **版本信息**：Vite 8.2.2 / TypeScript 5.x / create-vite vanilla-ts 模板（2026-08-29 核对）
> 📚 来源：[Vite 官方 · TypeScript](https://cn.vitejs.dev/guide/features.html#typescript) ｜ [tsconfig 参考中文](https://typescript.bootcss.com/tsconfig.html)

## 一、这一节的目标

1. 会创建 vanilla-ts 项目并跑通（Vite 原生支持 TS，零配置）
2. 看懂 tsconfig.json 的 6 个高频配置项
3. **学会读 TS 报错**——AI 协作时代的核心技能
4. 知道类型声明文件 `.d.ts` 和 `@types/` 是怎么回事
5. 完成 C-02b 的准备：一个 TS 版的地震数据模块

---

## 二、创建 TS 项目（Vite 一条命令）

```bash
cd F:\learn_webgis\02-web-basics\examples
npm create vite@latest 23-ts-demo -- --template vanilla-ts
#    ↑ 项目名              ↑ 直接指定 TS 模板，跳过交互
cd 23-ts-demo
npm install
npm run dev
```

和 JS 版唯一的区别：源码文件是 `.ts` / `.tsx`。**Vite 内置 esbuild 转译 TS**——你写 TS，它实时编译给浏览器，无需任何额外配置。

对比第 05 节的项目，多了两个文件：

| 文件 | 作用 |
|---|---|
| `tsconfig.json` | TS 编译器的配置（"检查规则清单"） |
| `src/tsconfig.json`（有的模板分层） | 作用于 src 的细化配置 |

---

## 三、tsconfig 六个高频配置项

```jsonc
{
  "compilerOptions": {
    "target": "ES2020",       // 编译输出的 JS 版本（现代浏览器够用）
    "module": "ESNext",       // 模块方案（配合 Vite 用 ESNext）
    "moduleResolution": "bundler", // 模块解析策略（Vite 项目推荐 bundler）
    "strict": true,           // ★ 严格模式总开关：全部最佳实践检查
    "noUnusedLocals": true,   // 未使用的变量报错
    "skipLibCheck": true      // 跳过第三方库类型检查（提速，行业惯例）
  },
  "include": ["src"]          // 只检查 src 目录
}
```

**strict 必须开**（模板默认开）。它是一组严格检查的合集，最重要的是：

- `strictNullChecks`：null 不能随便赋值（逼你判空，第 20 节的 el 判空就是它）
- `noImplicitAny`：不许隐性 any（每个没有推断出类型的值都必须有明确类型）

> 💡 读别人项目先看有没有 `"strict": true`——没有的话它的类型标注约等于装饰品。

---

## 四、学会读 TS 报错（核心技能）

TS 报错的三段结构：

```ts
const el = document.querySelector('#app');
el.innerHTML = 'hi';
// ❌ 报错：
// 'el' is possibly 'null'.(18047)
// ─────────────┬───────── ┬┈┈┈ 错误编号（查文档/贴 AI 都有用）
//              └ 人话描述：el 可能是 null
//
// 修复建议：if (el) {...} 或 el!.innerHTML（非空断言）
```

**AI 协作工作流**：把报错**原文（含编号）+ 相关代码**一起贴给 AI，它给出修复并解释。比"页面白屏了帮我看看"高效十倍。

常见报错速查：

| 报错关键词 | 含义 | 典型原因 |
|---|---|---|
| is not assignable to | 类型不匹配 | 赋值/传参类型错了 |
| does not exist on type | 属性/方法不存在 | 拼错名、或类型定义里没有 |
| possibly 'null'/'undefined' | 可能是空值 | strictNullChecks 在逼你判空 |
| Type 'X' is missing properties | 缺字段 | 对象字面量没写全必填项 |
|implicitly has an 'any' type | 隐性 any | strict 模式要求你标注/初始化 |

---

## 五、第三方库的类型从哪来

```ts
// 现代主流库自带类型：import 时编辑器自动提示
import { createAlert } from './alert';   // alert.ts 里的类型直接可见

// 老库类型在社区包里：@types/xxx（DefinitelyTyped 项目）
// npm install -D @types/lodash 后，lodash 的所有函数都有完整类型

// 自己给"无类型的 JS 库"写声明：xxx.d.ts（了解即可）
declare module 'some-old-lib' {
  export function init(opts: Record<string, unknown>): void;
}
```

> 💡 看到"安装 @types/xxx"的提示就照做——那是给库补类型的"扩展包"。

---

## 六、动手跟练：23 · TS 版地震模块

配套文件夹：`02-web-basics/examples/23-ts-demo/`（你刚 create 的项目，我已放参考实现）

**步骤：**

1. 用 create-vite 创建（见第二节），然后把文件里的 `src/quake.ts`、`src/main.ts` 参考实现对照抄读
2. quake.ts 内容：第 20 节练习 17~20 题的 GeoJSON 类型 + 类型安全的取数函数——**你的第一个 TS 模块**
3. 完成 4 个 TODO：补全 fetchQuakes 返回类型、修复 3 处故意埋的 TS 报错（读报错→修）、给渲染函数参数标类型、strict 下解决 el 判空
4. 跑 `npx tsc --noEmit` 体验"只检查不输出"的纯类型检查

**通关标准：**

- [ ] `npm run dev` 正常跑、Console 正常输出
- [ ] `npx tsc --noEmit` 零报错
- [ ] 3 处埋的错误都能自己修（读懂报错是关键）
- [ ] 能复述 strict 模式最重的两条检查

---

## 七、自测题

1. Vite 项目里写 .ts 文件，谁负责编译成浏览器能跑的 JS？
2. `strict: true` 最重要的是哪两条子检查？分别防什么？
3. 报错编号（如 18047）有什么用？
4. `@types/lodash` 和 lodash 本体的关系？
5. `npx tsc --noEmit` 干什么用？什么时候跑？

### 参考答案

1. Vite 内置的 esbuild（开发时按需转译；类型检查由编辑器/ tsc 负责，esbuild 不做类型检查——所以 CI 里要单独跑 tsc）。
2. strictNullChecks（逼判空，防空值崩溃）、noImplicitAny（逼显式类型，防类型黑洞）。
3. 精确定位文档与搜索；贴给 AI 时附带上下文，修复更准。
4. lodash 是运行时实现；@types/lodash 是社区维护的"类型说明书"，编辑器/编译器读它来做检查。
5. 只做类型检查不输出编译产物；提交代码前 / CI 里跑，配合编辑器实时检查双保险。

---

## 八、下一步

TS 段（19~23）完成 → **第 24 节：Tailwind 概念与安装**，进入样式新范式，CSS 段最后一程。
