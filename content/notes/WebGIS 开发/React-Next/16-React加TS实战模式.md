---
title: "第 16 节 · React + TS 实战模式"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "React-Next"
order: 50
tags: ["web"]
---







# 第 16 节 · React + TS 实战模式

> 📌 **版本信息**：React 19.x 类型定义 / TypeScript 5.x（2026-08-29 核对）
> 📚 来源：[React TS 中文速查（TypeScript + React 模式）](https://react-typescript-cheatsheet.netlify.app/) ｜ [react.dev TypeScript](https://zh-hans.react.dev/learn/typescript)

## 一、这一节的目标

1. 掌握组件 props 的类型模式（含 children、事件、可选与默认值）
2. 掌握事件处理器的类型（原生事件与 React 合成事件）
3. 掌握泛型组件与"类型收窄"在组件里的应用
4. 掌握 hooks 的类型化（useState 推断、useRef 双形态、自定义 Hook）
5. 能给 C-02b/C-03a 写出全类型化的组件

---

## 二、props 的类型模式

```tsx
// ① 基础：interface + 可选 + 默认值（解构默认值比 PropsWithChildren 更直观）
interface CityCardProps {
  name: string;
  lat: number;
  lng: number;
  tag?: string;                      // 可选
  onSelect?: (id: number) => void;   // 可选回调
}
function CityCard({ name, lat, tag = '未分类' }: CityCardProps) { ... }

// ② children：专用类型
import type { ReactNode } from 'react';
interface PanelProps { title: string; children: ReactNode }

// ③ 复用已有数据类型：Omit/Pick（第 38 节的实战！）
type CityCardProps = Omit<City, 'population'> & { onSelect?: () => void };

// ④ 展开传参的收敛：extends 确保不乱传
type StyledCardProps = CityCardProps & { className?: string };
```

> ⚠️ **不要用 `React.FC`**（旧教程常见）：它隐式附带 children 且泛型别扭，社区与官方文档已弃用——直接给参数标 props 类型即可。

---

## 三、事件类型

```tsx
// React 合成事件（不是原生 DOM 事件！）
function SearchBox() {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => setKw(e.target.value);   // 输入框
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); };    // 表单
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {};                        // 按钮
  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') ... };
  return <input onChange={onChange} />;
}

// 处理函数抽出去时，类型标注跟元素走：
const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {...};

// 偷懒的边界：内联箭头函数不用标（上下文推断）；抽出去就必须标。
```

> 💡 技巧：**先写 JSX 里的内联箭头函数，再把鼠标悬停变量名**——TS 会显示推断出的事件类型，复制它即可。让编译器替你写类型。

---

## 四、泛型组件

```tsx
// 需求：一个通用列表组件——传什么类型的 items，onSelect 就收什么类型
interface ListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  onSelect?: (item: T) => void;
  renderItem: (item: T) => ReactNode;    // 渲染细节交给调用方（render prop 模式）
}

function List<T>({ items, getKey, onSelect, renderItem }: ListProps<T>) {
  return (
    <ul>{items.map((item) => (
      <li key={getKey(item)} onClick={() => onSelect?.(item)}>{renderItem(item)}</li>
    ))}</ul>
  );
}

// 使用：T 自动推断为 QuakeFeature —— onSelect 的参数就有完整类型提示
<List items={features} getKey={(f) => f.id} renderItem={(f) => <span>{f.properties.place}</span>} />
```

这个模式在 W 系列里反复出现（通用表格列配置、通用弹窗）——**泛型组件 = 可复用性与类型安全兼得**。

---

## 五、hooks 的类型化

```tsx
// useState：多数靠推断；联合初始值要显式标（否则收窄死）
const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading');
const [user, setUser] = useState<City | null>(null);      // 可能为空的对象

// useRef 双形态：DOM 用法参数必须给 null；可变盒用泛型
const mapDivRef = useRef<HTMLDivElement>(null);            // 挂 DOM
const timerRef = useRef<number | undefined>(undefined);    // 存定时器 id
const mapRef = useRef<MapInstance | null>(null);           // 存地图实例（第 07 模块地图组件标配）

// 自定义 Hook：返回值标清楚（元组要用 as const 保住字面量顺序）
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {...});
  const set = (v: T) => {...};
  return [value, set] as const;   // as const：调用方解构时类型是 [T, (v: T) => void]
}
```

---

## 六、自测题

1. 为什么弃用 React.FC？
2. 内联箭头函数的事件参数不用标类型，抽出后必须标——原理？
3. `Omit<City,'population'> & {...}` 这种 props 定义用了第 38 节的什么能力？好处？
4. 泛型组件 List 的 T 在哪里被推断？renderItem 模式解决了什么？
5. `as const` 在自定义 Hook 返回值上的作用？

### 参考答案

1. 隐式附带 children、泛型支持别扭、官方文档已不使用——直接标参数类型更清晰。
2. 内联时 TS 有上下文推断（知道它将被赋给 onChange）；抽离后失去上下文，需显式标注。
3. 类型工具组合（交叉 + Omit）；基础类型改一处，props 类型自动跟随——类型跟实现走。
4. 调用处由 items 实参推断；renderProp 把"怎么渲染"留给调用方，组件保持通用。
5. 保住元组类型（否则 TS 推成 (T | setter)[] 联合数组，解构后类型丢失）。

---

## 七、下一步

TS 模式齐了 → **第 17 节：Vue 认知 · 差异地图**，换一双眼睛看组件世界（只为读懂国产 GIS 示例）。
