---
title: "第 21 节 · interface 与 type"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Web基础"
tags: ["web"]
---

# 第 21 节 · interface 与 type

> 📌 **版本信息**：基于 TypeScript 5.x（2026-08-29 核对）
> 📚 来源：[TS 手册 · 对象类型](https://typescript.bootcss.com/handbook/2/objects.html) ｜ [阮一峰 TS 教程 · interface](https://wangdoc.com/typescript/interface)

## 一、这一节的目标

1. 掌握 `interface` 声明对象形状的全部常用语法
2. 掌握 `type` 及其"联合"杀手锏
3. 说清 interface vs type 的区别与选择原则
4. 掌握类型继承 `extends` 与交叉类型 `&`
5. 给地图应用建模：City / Layer / MapConfig 一套类型

---

## 二、interface：对象形状的"合同"

```ts
interface City {
  name: string;
  lat: number;
  lng: number;
  nickname?: string;        // 可选属性
  readonly code: string;    // 只读属性
}

const wh: City = { code: 'WH', name: '武汉', lat: 30.59, lng: 114.3 };

// interface 的独门绝技：声明合并（同名的 interface 自动合并字段）
interface City { area?: number; }
// 现在的 City = 原字段 + area?（第三方库的类型扩展就靠这个，日常少用，知道即可）
```

### 方法签名

```ts
interface MapApi {
  getZoom(): number;                     // 方法签名
  flyTo(lat: number, lng: number, zoom?: number): void;
}
```

---

## 三、type：类型的"别名"，能力更广

```ts
// 对象形状：和 interface 基本等价
type CityT = {
  name: string;
  lat: number;
};

// type 的独门绝技 ①：联合类型（interface 做不到！）
type LayerType = 'base' | 'vector' | 'label';        // 字面量联合
type Id = string | number;

// ② 工具类型与映射（第 38 节展开）
type CityPartial = Partial<CityT>;                    // 所有字段变可选

// ③ 元组、函数类型的别名
type Coord = [number, number];
type Handler = (e: Event) => void;
```

### interface vs type 怎么选？

| 维度 | interface | type |
|---|---|---|
| 对象形状 | ✅ | ✅ |
| 联合/元组/原始类型别名 | ❌ | ✅ |
| extends 继承 | ✅ | 用 `&` 交叉实现 |
| 声明合并 | ✅（独有） | ❌ |

**行业惯例**：对象用 interface、其余（联合/元组/工具）用 type，混用毫无问题。**团队统一即可**——本项目教程采用这个惯例。

---

## 四、扩展：继承与交叉

```ts
// interface 继承：extends（可多继承，逗号分隔）
interface GeographicEntity {
  lat: number;
  lng: number;
}
interface City extends GeographicEntity {
  name: string;
}

// type 交叉：&（取所有类型的并集约束）
type WithId = { id: number };
type CityFull = GeographicEntity & WithId & { name: string };
// 效果等同：{ lat; lng; id; name }
```

> ⚠️ 交叉类型的坑：两个类型的同名字段类型冲突时（`name: string & name: number`），结果是 `never`——这个字段谁都赋不了值。报错信息会很绕，见到"never"先查字段冲突。

---

## 五、动手跟练：21 · 数据模型建模

配套文件：`02-web-basics/examples/21-数据模型建模.html`

**步骤：**

1. 打开文件读 5 道建模题的**需求描述**（模拟产品经理提需求）
2. 在 TypeScript Playground 里把每题的 interface/type 写出来并放测试数据验证
3. 第 5 题是综合题：为"图层树"建模（嵌套结构），这是数据管理平台 W-2 的真实需求

**通关标准：**

- [ ] 5 题全部通过 Playground 编译
- [ ] 能说出 interface 和 type 各自的独门能力
- [ ] 嵌套建模题里用了 `children?: Layer[]`（递归类型）——拿到就是赚到

---

## 六、自测题

1. `interface` 有而 `type` 没有的能力？反过来呢？
2. `?` 可选属性和"类型里带 undefined"的区别是什么？
3. 交叉类型 `A & B` 是什么语义？字段冲突会怎样？
4. `type X = 'a' | 'b'` 相比用普通字符串常量好在哪？
5. 递归类型（自己引用自己）合法吗？举一个 GIS 场景。

### 参考答案

1. interface 独有声明合并；type 独有联合/元组/原始别名/条件映射。
2. 本质等价（`lng?: number` 就是 `lng: number | undefined` 的简写），但 `?` 还表达"这个键可以不存在"。
3. 同时满足 A 和 B 的类型；同名字段类型冲突时该字段变 never。
4. 字面量联合把取值范围锁死，拼写错误/非法值在编译期报错，还有自动补全。
5. 合法。图层树：`interface LayerNode { children?: LayerNode[] }`——目录树、行政区划树都这样。

---

## 七、下一步

形状会定义了 → **第 22 节：函数与泛型入门**，让函数也能"参数化类型"。
