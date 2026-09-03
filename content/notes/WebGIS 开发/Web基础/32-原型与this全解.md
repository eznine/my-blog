---
title: "第 32 节 · 原型与 this 全解"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
order: 77
tags: ["web"]
---









# 第 32 节 · 原型与 this 全解

> 📌 **版本信息**：基于 ECMAScript 2025（对象模型多年稳定；2026-08-29 核对）
> 📚 来源：[现代 JS 教程 · 原型继承](https://zh.javascript.info/prototype-inheritance) ｜ [MDN this](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/this)

## 一、这一节的目标

1. 精通原型链：属性查找的完整路径
2. 掌握 `__proto__` / `prototype` / constructor 三者的关系图
3. **精通 this 的五条绑定规则**（面试+读码双刚需）
4. 掌握箭头函数的 this 特殊性（为什么回调里它最省心）
5. 会用 call/apply/bind 显式改 this

---

## 二、原型链：属性的"向上找"

**一句话：读对象属性时，自己没有就顺着 `__proto__` 一路向上找，直到 null。**

```js
const city = { name: '武汉' };
city.toString();      // 自己没有 → 原型 Object.prototype 上找到

// 验证链路
Object.getPrototypeOf(city) === Object.prototype;   // true
Object.getPrototypeOf(Object.prototype) === null;   // 链的尽头

// class 是原型机制的语法糖
class MapLayer {
  constructor(name) { this.name = name; }        // 实例属性（自己身上）
  show() { console.log(this.name + ' 显示'); }   // 方法在 MapLayer.prototype 上（共享！）
}
const roads = new MapLayer('路网');
roads.show();
// 查找：roads.show → 没有 → MapLayer.prototype.show → 找到 ✓
```

**为什么要懂**：①方法放在 prototype 上被所有实例**共享**（省内存）——class 写法背后的事实；②读第三方库源码（Leaflet 的 L.Layer 体系）全是原型继承；③"方法在实例上却调不通/构造函数丢了 this"这类 bug 的根源都在这。

### 三角关系图（必会画）

```
function MapLayer() {...}
      │  .prototype ──────────────┐
      ▼                           ▼
  MapLayer.prototype ◄──__proto── 实例 roads
      │  .constructor ───────────► MapLayer（函数自己）
```

---

## 三、this 五条绑定规则（按优先级）

`this` 不是定义时决定的，是**调用时**决定的——谁调用它，它指向谁：

| 优先级 | 规则 | this 指向 | 例 |
|---|---|---|---|
| 1 | new 调用 | 新建的实例 | `new MapLayer('路网')` |
| 2 | call/apply/bind | 指定的对象 | `fn.call(obj)` |
| 3 | 对象.方法() | 点前面的对象 | `map.getZoom()` → map |
| 4 | 直接调用 | undefined（严格模式） | `fn()` |
| 5 | 箭头函数 | **不适用以上**：继承定义处外层的 this | — |

```js
// 规则 3 的经典坑：方法被"摘下来"调用
const map = {
  name: '主地图',
  getZoom() { return this.name; },
};
map.getZoom();          // '主地图'（规则 3：有调用者）
const fn = map.getZoom;
fn();                   // undefined（规则 4：调用者丢了！）

// 解法 ①：bind 永久绑定
const bound = map.getZoom.bind(map);

// 解法 ②（推荐）：箭头函数（规则 5）
const timer = {
  count: 0,
  start() {
    setInterval(() => {          // 箭头函数：this 继承 start 的 this（=timer）
      this.count++;
      console.log(this.count);
    }, 1000);
  },
};
// 若这里写 function() { this.count++ }，this 是 window/undefined——经典 bug
```

**一句话决策**：**对象方法用普通函数（要 this 指向对象），回调函数用箭头函数（要继承外层 this）**——把这句焊死，90% 的 this 问题不会再找你。

---

## 四、call / apply / bind 对比

```js
fn.call(obj, arg1, arg2)     // 立即调用，参数逐个传
fn.apply(obj, [arg1, arg2])  // 立即调用，参数打包数组（唯一区别）
const g = fn.bind(obj)       // 不调用，返回"绑死 this"的新函数（配合 setTimeout/addEventListener 常用）
```

现代代码里 call/apply 出现率骤降（展开运算符取代了 apply 的参数打包），**bind 在旧代码与框架底层仍常见**，能认会读即可。

---

## 五、自测题

1. 读 `city.toString()` 时发生了什么查找过程？
2. class 里方法定义在哪？实例属性定义在哪？
3. 写出 this 五条规则的优先级顺序。
4. `const f = obj.method; f()` 为什么拿不到 obj 的数据？两种修法？
5. setInterval 里应该用普通函数还是箭头函数？为什么？

### 参考答案

1. 自己没有 → `__proto__`（Object.prototype）→ 找到 toString → 以 this=city 调用。
2. 方法在类的 prototype（实例间共享）；实例属性在 constructor 里 this.xxx（每个实例独立）。
3. new > call/apply/bind > 对象.方法() > 直接调用（严格模式 undefined）；箭头函数不参与，沿用外层。
4. 方法"脱钩"调用，this 按"直接调用"规则变 undefined；修法 bind(obj) 或改箭头/包裹箭头。
5. 箭头函数——继承外层 this 指向对象；普通函数的 this 在回调里丢失。

---

## 六、下一步

this 与函数世界的暗流摸清 → **第 33 节：闭包与内存**，把第 11 节埋的"闭包"彻底讲透。
