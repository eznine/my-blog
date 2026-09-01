---
title: "第 12 节 · Hooks 全解（逐参数讲透）"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "React-Next"
order: 40
hidden: true
tags: ["web"]
---





# 第 12 节 · Hooks 全解（逐参数讲透）

> 📌 **版本信息**：React 19.x（Hook 语义多年稳定；2026-08-29 核对）
> 📚 来源：[React 中文文档 · API 参考](https://zh-hans.react.dev/reference/react/hooks) ｜ [Rules of Hooks](https://zh-hans.react.dev/reference/rules/rules-of-hooks)
> 📖 定位：阶段二精读——把阶段一用过的每个 Hook 的**每个参数、每个返回值、每个坑**讲透，达到"读官方 API 参考像读笔记"。

## 一、两条铁律（Hook 的"宪法"）

1. **只在顶层调用**：不能放在 if/循环/嵌套函数里——React 靠**调用顺序**记忆每个 Hook 的 state，顺序一乱全错（这就是 lint 插件 `react-hooks/rules-of-hooks` 存在的原因）
2. **只在 React 函数里调用**：组件或自定义 Hook 里；普通 JS 函数、类、事件处理器外的裸代码里不行

---

## 二、useState(initialValue)

```js
const [state, setState] = useState(initial);
```

- **initialValue**：初始值。⚠️ 若是"重计算的表达式"（如 `createHugeArray()`），每次渲染都会白算一遍——**惰性初始化**写 `useState(() => createHugeArray())`（第 11 节生态练习的 localStorage 读取就是它）
- **setState(nextValue)**：排队重渲染。⚠️ 传**函数**即函数式更新 `setState(prev => ...)`（第 03 节批处理）
- **setState(prevState)**：传对象时是**替换不是合并**！`setForm({...form, x: 1})` 的展开是你自己的责任
- **Object.is 比较**：setState 后 React 用 `Object.is` 比较新旧值——`setCount(0)` 在 count 已是 0 时会**跳过渲染**（这也是"改 state 前先造新对象"的底层原因）

---

## 三、useEffect(setup, dependencies?)

```js
useEffect(() => {
  // 副作用
  return () => { /* 清理 */ };   // 可选的 cleanup
}, [deps]);                       // 可选依赖数组
```

- **dependencies** 四种形态的精确语义（第 04 节表格的原理版）：
  - 省略：**每次渲染后**都跑
  - `[]`：仅挂载后跑一次（若组件被 StrictMode 双挂载，会"挂-卸-挂"，清理函数必须写对）
  - `[a, b]`：挂载后 + a/b 中**任意一个** Object.is 变化后
  - 比较是 **Object.is 逐个比**——所以依赖里放对象/数组没意义（每次渲染都是新引用），要放基本类型或 state 本身
- **cleanup 的三个触发点**：下次同 Effect 重跑前 / 组件卸载时 / StrictMode 模拟卸载时
- **为什么要在依赖里写全**：省略一个依赖 = Effect 闭包住旧值（闭包陷阱，第 33 节）——React 要靠依赖数组决定"何时用新 props/state 重跑"

```js
// 经典闭包陷阱演示
useEffect(() => {
  const t = setInterval(() => console.log(count), 1000);  // 这里的 count 永远是首次的 0！
  return () => clearInterval(t);
}, []);   // ← 依赖里没写 count，Effect 不重跑，闭包冻结在旧值
// 修法：依赖加 [count]（定时器重建）或 setState(prev => prev) 函数式 + 空依赖
```

---

## 四、useRef(initialValue)

```js
const boxRef = useRef(null);      // { current: null }
```

- 返回 `{ current }` **盒对象**，改 `.current` **不触发重渲染**——这是它和 state 的本质区别
- 两大用途：
  1. **拿 DOM**：`<div ref={boxRef}>`，渲染后 `boxRef.current` 是真实节点（第 07 节地图实例挂载就是它）
  2. **跨渲染存"与渲染无关的值"**：定时器 id、上一次的值、是否已请求过的标记（第 04 节的竞态 ignore 也可以用 ref 代替闭包变量）
- ⚠️ 纪律：**渲染期间不读写 ref.current**（除初始化）——它的变化不引起重渲染，渲染中读会拿到不一致的值；要"变了就更新界面"用 state，"变了不用更新界面"用 ref

---

## 五、useMemo(fn, deps) 与 useCallback(fn, deps)

```js
const expensive = useMemo(() => computeHuge(quakes), [quakes]);
const handleClick = useCallback((id) => select(id), [select]);
```

- **useMemo**：缓存**计算结果**——deps 不变时跳过重算。两个正当用途：①真昂贵的计算（万级数据过滤）；②**引用稳定**（把对象/数组传给 memo 子组件或作为其他 Hook 的依赖）
- **useCallback**：`useMemo(() => fn, deps)` 的糖——缓存**函数本身**。正当用途只有一个：**把回调传给被 memo 的子组件**，避免子组件因"回调引用变了"而白白重渲染
- ⚠️ 滥用警告：没有 memo 子组件/昂贵计算时，useMemo/useCallback 只是增加噪音与缓存开销。**默认不写，测到慢再写**（React 官方立场）
- 两者都依赖 Object.is 逐个比 deps

---

## 六、useReducer(reducer, initialArg)

```js
const [state, dispatch] = useReducer(reducer, { items: [], loading: false });

function reducer(state, action) {
  switch (action.type) {
    case 'add':    return { ...state, items: [...state.items, action.payload] };
    case 'set_loading': return { ...state, loading: action.value };
    default:       return state;
  }
}
dispatch({ type: 'add', payload: newItem });
```

- **何时升级到 useReducer**：状态的多种更新逻辑**集中可查**（一个 reducer 函数 vs 散落十处的 setState）、下一个更新依赖上一个、想把状态逻辑从组件里整体搬走（配合 Context 就是"轻量 Redux"）
- **dispatch 的身份稳定**（不像普通函数每次渲染新建）——传给深层子组件不需要 useCallback 包

---

## 七、其余内置 Hook 认脸

| Hook | 一句话 | 何时见 |
|---|---|---|
| useContext | 读 Context（第 07 节三件套之三） | 已用 |
| useId | 生成 SSR 安全的唯一 id | 表单 label 配对（Next 章节出现） |
| useTransition | 把 setState 标记为"可中断的非紧急更新" | 大列表切换不卡输入 |
| useDeferredValue | 延迟跟随某个值的"慢副本" | 搜索框输入流畅 + 结果稍后更新 |
| useSyncExternalStore | 订阅外部数据源 | 库作者用 |
| useLayoutEffect | DOM 更新后、绘制前同步执行（vs useEffect 绘制后） | 量取 DOM 尺寸 |
| useInsertionEffect / useImperativeHandle | CSS-in-JS / 暴露 ref 自定义值 | 库作者用 |

---

## 八、自测题

1. Hook 为什么不能放 if 里？React 靠什么记住每个 Hook？
2. useState 传函数作为 initialValue 的意义？传函数作为 setState 参数的意义？两者别混（`setState(fn)` 与 `useState(fn)`）！
3. useEffect 依赖数组漏写一个 state 会发生什么？机制是什么？
4. useRef 改 current 为什么不重渲染？什么数据适合放 ref？
5. 何时从 useState 升级 useReducer？
6. useMemo/useCallback 的"正当用途"各一条；为什么说默认不该写？

### 参考答案

1. React 按调用顺序为 Hook 分配存储槽位；条件调用导致顺序漂移，state 对错位。靠调用顺序 + lint 强制。
2. 惰性初始化：首次渲染才执行昂贵计算；函数式更新：基于最新排队值累加。前者是初始化器，后者是更新器，签名相同语义不同。
3. Effect 不重跑，内部闭包永远引用旧值（闭包冻结）；机制是词法作用域 + 依赖数组控制重跑时机。
4. ref 只是普通可变盒对象，React 不追踪；定时器 id、DOM 引用、是否已请求标记等"不影响渲染输出"的值。
5. 多种更新逻辑集中化 / 更新依赖前一次结果 / 想整体搬走状态逻辑时。
6. useMemo：昂贵计算或引用稳定供 memo 子组件；useCallback：给 memo 子组件传稳定回调。默认不写是因为缓存本身有成本，无收益时纯噪音——测到慢再优化。

---

## 九、下一步

Hook 心法归位 → **第 13 节：渲染机制**，看穿"setState 之后 React 到底做了什么"。
