---
title: "第 05 节 · 列表渲染与 key"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "React-Next"
tags: ["web"]
---

# 第 05 节 · 列表渲染与 key

> 📌 **版本信息**：React 19.x（2026-08-29 核对）
> 📚 来源：[React 中文文档 · Rendering Lists](https://zh-hans.react.dev/learn/rendering-lists) ｜ [保持列表纯粹](https://zh-hans.react.dev/learn/keeping-lists-pure)

## 一、这一节的目标

1. 熟练用 `map` 渲染列表（第 13 节 + 第 02 节的组合应用）
2. **真正理解 key**：它是什么、给谁看、为什么不能用下标
3. 掌握列表的增删改排序四种操作的不可变写法
4. 掌握三种条件渲染写法及选择标准

---

## 二、map 渲染：三件套

```jsx
const cities = [
  { id: 1, name: '武汉', lat: 30.59 },
  { id: 2, name: '西安', lat: 34.34 },
];

function CityList() {
  return (
    <ul>
      {cities.map((c) => (
        <li key={c.id}>          {/* ① key：稳定、唯一的标识 */}
          <b>{c.name}</b>        {/* ② 内容来自数据 */}
          {c.lat.toFixed(2)}°N
        </li>
      ))}
    </ul>
  );
}
```

三件套：**map 遍历 → 每项给 key → JSX 描述每项**。过滤/排序在 map 之前做（filter/sort 返回新数组再 map）。

---

## 三、key 的真相（面试与实战双高频）

**key 是给 React 的 Diff 算法看的"身份证"，不是给你看的。** React 重渲染列表时，拿新旧两份列表按 key 配对——key 相同的元素被识别为"同一个"，只更新变化的部分；没有 key，React 只能按**顺序**猜测对应关系。

### 为什么不能用数组下标当 key？

```jsx
// 数据：['武汉', '西安', '成都'] → 删除'武汉'后：
// 用 id 做key：React 精准知道"西安/成都还是它们"，只删武汉那项 ✅
// 用下标做key：原来 index0=武汉，删除后 index0=西安 → React 以为"0 号内容变了"
//   → 列表项若带输入框/勾选等内部状态，状态会错位（第一项的勾"跳"到第二项上）！
```

**结论**：

1. key 必须**在同列表内唯一、且跨重渲染稳定**（数据库 id 最理想）
2. **只在数组层面需要 key**（静态写死的 JSX 不用）
3. 实在没有 id 用稳定字段（如 `place+time` 组合）；**新增项可用 `crypto.randomUUID()`**
4. 下标做 key 只在"列表永不重排/永不增删"时才无害——别赌

> 💡 第 02 节练习里你故意去掉 key 看过警告——现在你知道那个警告背后的机制了。

---

## 四、增删改排序（不可变更新复习）

```jsx
const [list, setList] = useState(initial);

setList([...list, newItem]);                              // 增
setList(list.filter((x) => x.id !== id));                 // 删
setList(list.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));  // 改
setList([...list].sort((a, b) => b.mag - a.mag));         // 排（先复制再排，不动原件）

// 插入到头部：setList([newItem, ...list])
```

---

## 五、条件渲染三式

```jsx
{isError && <ErrorBox msg={error} />}          // ① &&：要么显示要么没有（注意左值不能是 0/''！）
{loading ? <Spinner/> : <List data={data}/>}   // ② 三元：二选一
{status === 'loading' ? <Spinner/> : status === 'error' ? <Err/> : <List/>}  // ③ 多态链
// 元素赋给变量再渲染（status === 'error' 时 err 为 null 则安全）
```

> ⚠️ `&&` 陷阱：`{count && <Badge n={count}/>}` 在 count=0 时会渲染出"0"（0 是合法的 falsy 但会被输出）。修正：`{count > 0 && ...}` 或 `{count ? ... : null}`。

---

## 六、动手跟练：05 · 动态列表增删

配套文件夹：`03-react-nextjs/examples/05-动态列表增删/`（`npm i && npm run dev`）

**步骤：**

1. 需求：地震记录列表（模拟数据）——添加/删除/标记已读/按震级排序/按地区筛选
2. 完成 6 个 TODO：新增表单（随机 id 用 crypto.randomUUID）、删除（filter）、已读切换（map 改项）、排序按钮（复制后 sort）、地区筛选（filter + 三态渲染空状态）、key 实验三连（去掉 key / 换成 index / 用 id，观察控制台与交互差异——给列表项加一个"未读"计数徽章让错位可见）
3. 重点体验 TODO 6 的 key 实验：**带内部状态的列表项 + index key = 状态错位**，亲眼看一次胜过读十遍

**通关标准：**

- [ ] 增删改排筛选全部正常，全程无直接修改数组
- [ ] 能向别人解释"key 是给 Diff 算法的身份证"
- [ ] 能举出下标 key 造成状态错位的具体场景

---

## 七、自测题

1. key 的两个要求？数据库 id 为什么是最好的 key？
2. 静态写死的三个 `<li>` 需要 key 吗？
3. `{count && <Badge/>}` 的 0 陷阱怎么修？
4. 为什么排序要 `[...list].sort()` 而不是 `list.sort()`？
5. 新增项没有 id 时怎么办？

### 参考答案

1. 列表内唯一 + 跨渲染稳定；数据库 id 天然满足且与后端数据对应。
2. 不需要（不在 map 生成的数组里，React 静态结构已知）。
3. `count > 0 && <Badge/>` 或 `{count ? <Badge n={count}/> : null}`。
4. sort 原地修改数组——直接改 state 引用不变，React 不重渲染且破坏不可变约定。
5. `crypto.randomUUID()` 在创建数据时生成并随数据一起存。

---

## 八、下一步

列表会渲染了 → **第 06 节：受控表单**，把第 03 节的输入框升级成完整的表单处理（多字段、校验、提交）。
