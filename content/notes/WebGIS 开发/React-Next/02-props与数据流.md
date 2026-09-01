---
title: "第 02 节 · props 与数据流"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "React-Next"
order: 13
tags: ["web"]
---




# 第 02 节 · props 与数据流

> 📌 **版本信息**：React 19.x（2026-08-29 核对）
> 📚 来源：[React 中文文档 · 传递 Props](https://zh-hans.react.dev/learn/passing-props-to-a-component) ｜ [组件的纯粹性](https://zh-hans.react.dev/learn/keeping-components-pure)

## 一、这一节的目标

1. 精通 props：传递、接收、默认值、children
2. 理解 React 单向数据流（数据只能从父到子）
3. 建立"props 只读"的纪律（组件纯粹性）
4. 用列表 + 组件 + props 完成数据驱动渲染（React 版第 14 节）

---

## 二、props：组件的入参

**一句话：props 是父组件传给子组件的只读数据，像函数参数一样。**

```jsx
// 子组件：解构接收 + 默认值
function CityCard({ name, lat, lng, color = 'blue' }) {
  return (
    <div className="card" style={{ borderColor: color }}>
      <h3>{name}</h3>
      <p>{lat.toFixed(2)}°N</p>
    </div>
  );
}

// 父组件：各种传法
<CityCard name="武汉" lat={30.59} lng={114.3} />                    // 逐个传
<CityCard {...wh} />                                                // 展开传（第 12 节技能）
<CityCard name="武汉" lat={30.59} lng={114.3}>详情</CityCard>        // children 传法见下
```

### children：标签之间的内容也是 props

```jsx
function Panel({ title, children }) {   // <Panel>xxx</Panel> 的 xxx 就是 children
  return (
    <section className="panel">
      <h3>{title}</h3>
      {children}      {/* 原样渲染：可能是文本、也可能是一堆子组件 */}
    </section>
  );
}

<Panel title="图层">
  <LayerItem name="路网" />
  <LayerItem name="水系" />
</Panel>
```

`children` 是布局组件的命脉：Card/Modal/Sidebar 全靠它——"壳负责框，内容由使用者塞"。

---

## 三、单向数据流

**规则：数据只能从父流向子（props 向下），事件从子流向父（回调向上）——两层永远不会反向改对方的数据。**

```
App（持有数据 cities 数组）
 ├─ 传 props：cities.map(c => <CityCard {...c} />)
 └─ CityCard（只读展示；想"修改"怎么办？——调用父传的回调函数，请父亲改）
```

```jsx
// 子组件想删除自己？它没有删除权，只能"报告"：
function CityCard({ city, onRemove }) {
  return (
    <div>
      {city.name}
      <button onClick={() => onRemove(city.id)}>删</button>
      {/* 点击 → 调用父传下来的 onRemove → 父组件改自己的数据 → 新 props 流下来 */}
    </div>
  );
}
```

**为什么这么设计**：数据只有一个"所有者"（父），改动路径唯一可追踪——应用一大了也不乱。这与第 14 节"唯一事实来源 + 整体重画"是同一思想，React 给了它正式的机制。

---

## 四、组件纯粹性：props 只读 + 不带副作用

React 要求组件像**纯函数**（第 11 节）：同样的 props 永远渲染同样的结果。

```jsx
// ❌ 三宗罪（React 开发模式都会被 StrictMode 抓出来）
function Bad({ city }) {
  city.name = '改了';            // ① 修改 props（只读！）
  fetch('/api/log');             // ② 发请求（副作用，应在事件/Effect 里）
  document.title = city.name;    // ③ 直接碰 DOM（React 的地盘）
  return <h3>{city.name}</h3>;
}
// ✅ 纯粹的组件：只做一件事——根据 props 算出并返回 JSX
```

> 💡 StrictMode 在开发模式会**故意把组件函数调用两次**——如果你的组件不纯（有副作用），两次调用会产生双倍副作用，bug 当场暴露。这就是 `main.jsx` 里包 StrictMode 的用意。

---

## 五、动手跟练：02 · 卡片列表组件

配套文件夹：`03-react-nextjs/examples/02-卡片列表组件/`（结构同 01，`npm i && npm run dev`）

**步骤：**

1. 读数据文件 `src/data.js`（城市数组）与 `App.jsx`（map 渲染列表——第 13 节技能直接复用）
2. 完成 6 个 TODO：Card 接收 children、空状态组件、颜色 prop 默认值、展开运算符传参、误改 props 的警告实验、列表 key 预告观察（故意不写 key 看警告）
3. 体会：**列表数据在父组件，子组件只管展示**——这就是单向数据流

**通关标准：**

- [ ] 城市列表来自 data.js 经 map 渲染（不是手写三份 JSX）
- [ ] 能说出 children 的用途并举一个布局组件例子
- [ ] 能复述"props 向下、事件向上"

---

## 六、自测题

1. props 能被子组件修改吗？为什么？
2. `<Comp>内容</Comp>` 里的"内容"在子组件内部叫什么？
3. 父组件想传"点击删除的回调"，子组件怎么使用？
4. StrictMode 为什么把组件渲染两次？
5. `{...city}` 传 props 与逐个传的取舍？

### 参考答案

1. 不能。props 只读（组件纯粹性）；数据所有权在父组件，修改要走回调向上。
2. `props.children`——标签包裹的内容作为特殊 prop 传入。
3. 父传 `onRemove` 函数 prop，子组件在事件里调用它（携带标识如 id），由父执行真正的修改。
4. 检测不纯的组件（副作用/依赖随机值），让隐性 bug 提前暴露；生产构建不双重渲染。
5. 展开传省事但耦合字段名、可读性差、易传多余 props；明确传参可读性好。团队约定：超过 3 个字段的对象建议展开，其余明确传。

---

## 七、下一步

数据静态地流下来了，但它还不能"变" → **第 03 节：state 与 useState**，给组件装上记忆。
