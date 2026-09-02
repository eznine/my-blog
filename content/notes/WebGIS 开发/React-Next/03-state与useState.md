---
title: "第 03 节 · state 与 useState"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "React-Next"
order: 16
tags: ["web"]
---







# 第 03 节 · state 与 useState

> 📌 **版本信息**：React 19.x（2026-08-29 核对）
> 📚 来源：[React 中文文档 · State：组件的记忆](https://zh-hans.react.dev/learn/state-a-components-memory) ｜ [渲染与提交](https://zh-hans.react.dev/learn/render-and-commit)

## 一、这一节的目标

1. 理解 state：组件的"私有记忆"，变化触发重渲染
2. 掌握 useState 三件套：声明、读取、更新
3. **精通不可变更新**（为什么不能 push、要造新数组）
4. 理解 setState 的"排队"语义（异步批处理）
5. 完成"计数器 + 受控输入"练习

---

## 二、state：组件的记忆

**一句话：普通变量在组件每次渲染时都会重新创建；state 是 React 帮你跨渲染保存的组件私有数据——它一变，组件自动重渲染。**

```jsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  //     ↑ 当前值  ↑ 更新函数      ↑ 初始值
  // 读法："声明一个叫 count 的 state，初始 0，用 setCount 改它"

  return (
    <button onClick={() => setCount(count + 1)}>
      点了 {count} 次
    </button>
  );
}
// 点击 → setCount(1) → React 记住新值 → 重新执行组件函数 → 界面显示 1
// 再点 → setCount(2) → 再渲染 → 显示 2
// ⚠️ 直接 count++ 毫无效果：普通变量改了就丢，React 根本不知道要重渲染
```

**渲染循环**：`setState(新值) → React 调度 → 重新执行组件函数（拿到新 state）→ Diff 差异 → 只更新变化的部分`。组件函数会被反复执行——所以它必须纯粹（第 02 节）。

---

## 三、不可变更新（本节最重点）

**规则：永远用 setState 创建"新值"，绝不直接修改旧值。**

```jsx
const [todos, setTodos] = useState([...]);

// ❌ 错误：原地修改（React 比较的是引用，旧引用没变 → 认为没变化 → 不重渲染）
todos.push(newTodo);
setTodos(todos);

// ✅ 正确：造新数组/新对象
setTodos([...todos, newTodo]);                          // 数组加一项
setTodos(todos.filter((t) => t.id !== id));             // 删一项
setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));  // 改一项
setCity({ ...city, name: '武汉新版' });                  // 对象改字段
```

这正是第 12 节"不可变更新"的 React 应用场景——当时埋的种子发芽了。**原因两层**：①React 靠引用比较判断"变没变"；②纯函数要求不碰外部状态。

### 函数式更新：基于"上一份"而不是"外面那份"

```jsx
// ❌ 连续两次 +1 可能只加一次（两次 setCount 拿到的都是同一个旧 count）
setCount(count + 1);
setCount(count + 1);

// ✅ 传函数：React 会把上一个更新结果传进来（prev）
setCount((prev) => prev + 1);
setCount((prev) => prev + 1);   // 稳定 +2
// 经验法则：新值依赖旧值时，一律用函数式更新
```

---

## 四、批处理：setState 不是立刻生效

```jsx
function handleClick() {
  setCount(count + 1);
  console.log(count);   // ⚠️ 打印的还是旧值！
}
```

**setState 是"提交申请"不是"立即生效"**——React 把同一事件里的多次 setState **批量收集、合并成一次渲染**（性能优化）。所以：

1. 事件处理函数里 setState 之后读 state，读到的还是旧值
2. 要"基于上一次的值"，用函数式更新（上一小节）
3. 需要在"渲染完成后做事"，用 useEffect（第 04 节）

---

## 五、动手跟练：03 · 计数器与表单

配套文件夹：`03-react-nextjs/examples/03-计数器与表单/`（`npm i && npm run dev`）

**步骤：**

1. 读代码：三个 state（count、step、输入文本）各管一摊
2. 完成 6 个 TODO：步长选择（1/5/10）、重置按钮、函数式更新实验（连点两次对比两种写法）、受控输入框、修改 props 的警告实验、把第 14 节待办列表用 React 重写预告
3. 重点实验：`setCount(count+1)` 连点 vs `setCount(prev=>prev+1)` 连点——亲眼看批处理的影响

**通关标准：**

- [ ] 能说出"为什么不能 push 直接改数组"
- [ ] 函数式更新能默写
- [ ] 能解释"setState 后 log 还是旧值"

---

## 六、自测题

1. 组件内普通变量 `let n = 0; n++` 为什么界面不变？
2. 不可变更新两层原因是什么？
3. `setCount(prev => prev + 1)` 与 `setCount(count + 1)` 的区别？
4. state 和 props 的本质区别一句话？
5. 同一事件里 setState 五次，渲染几次？

### 参考答案

1. 普通变量活在"这一次渲染"里，组件函数重执行时重新初始化；React 也不知道要重渲染。
2. React 用引用比较判断数据是否变化；组件纯粹性要求不改外部/入参数据。
3. 前者基于 React 维护的"最新排队值"，多次调用稳定累加；后者基于本次渲染捕获的旧值，批处理下会丢更新。
4. state 是组件私有的、可变的（通过 setter）；props 是父给的、只读的。
5. 只渲染 1 次（批处理合并），但 state 的最终值由五个更新依次作用决定。

---

## 七、下一步

数据会变了 → **第 04 节：useEffect**，处理"变了之后还要做什么"（发请求、操作定时器）。
