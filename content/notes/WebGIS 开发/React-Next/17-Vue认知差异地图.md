---
title: "第 17 节 · Vue 认知：差异地图"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "React-Next"
order: 52
tags: ["web"]
---







# 第 17 节 · Vue 认知：差异地图

> 📌 **版本信息**：Vue 3.x（组合式 API Composition API，2026-08-29 核对）
> 📚 来源：[Vue3 官方中文文档](https://cn.vuejs.org/guide/introduction.html) ｜ 本地教材 `resources/06-cesium-3d/mars3d-vue-project/`
> 🎯 定位：**认知级**——你的主线是 React，但国内 GIS 界（超图 iClient、Mars3D 官方工程）Vue 占比高。本节目标：**拿到一份 Vue 组件代码，能读懂它干了什么**。

## 一、这一节的目标

1. 建立 Vue 与 React 的概念对照表（一个概念一个翻译）
2. 掌握组合式 API 的四大件：setup / ref / computed / watch
3. 读懂单文件组件 SFC 的三段结构
4. 能独立读懂一份简单的 Vue 地图组件

---

## 二、概念对照表（一张表打通 80%）

| 你会的（React） | 对应的（Vue3） | 备注 |
|---|---|---|
| 组件函数返回 JSX | SFC 模板 `<template>` | HTML 风格模板 + 指令 |
| useState + setter | `ref(0)` / `.value` | **读写都要 .value**（script 里） |
| 派生数据（渲染时算） | `computed(() => ...)` | 带缓存的派生值 |
| useEffect（监听变化做副作用） | `watch(source, cb)` / `watchEffect` | 更"点名式"的监听 |
| props / 回调向上 | `defineProps` / `defineEmits` | 子传父靠 emit('事件名') |
| Context | `provide` / `inject` | 同思想，跨层广播 |
| useEffect 清理 | `onUnmounted` 等生命周期 | Vue 生命周期显式命名 |
| 条件渲染三元/&& | `v-if` / `v-show` | 指令写在模板上 |
| 列表 map + key | `v-for="(item, i) in list" :key="item.id"` | 一样要稳定 key |
| className/ style 对象 | `:class` / `:style`（可对象可数组） | 更像原生 |
| 受控输入 value+onChange | `v-model="text"` | 双向绑定语法糖 |
| memo | computed 缓存（自动细粒度） | Vue 靠响应式追踪，手动优化更少 |

---

## 三、SFC 三段结构与组合式 API

```vue
<!-- CityCard.vue：单文件组件 = template + script + style 三段 -->
<template>
  <!-- 模板：插值 {{ }}、指令 v- 开头 -->
  <div class="card" :class="{ dark: theme === 'dark' }">
    <h3>{{ city.name }}</h3>
    <p>{{ latText }}</p>
    <button @click="$emit('select', city.id)">查看</button>
    <button @click="remove">删除</button>
  </div>
</template>

<script setup>
// setup：组合式 API 的主舞台（相当于组件函数体）
import { ref, computed } from 'vue'

// props 与事件（编译宏，不用 import）
const props = defineProps({ city: Object, theme: String })
const emit = defineEmits(['select', 'remove'])

// ref：响应式引用——script 里读写必须 .value，模板里自动解包
const count = ref(0)

// computed：派生值（自动追踪依赖 + 缓存）
const latText = computed(() => props.city.lat.toFixed(2) + '°N')

function remove() {
  count.value += 1                       // 注意 .value！
  emit('remove', props.city.id)          // 向上发事件（不是调父的回调）
}
</script>

<style scoped>
/* scoped：样式只作用于本组件（编译时加 data 属性选择器） */
.card { border: 1px solid #eee; border-radius: 8px; padding: 12px; }
</style>
```

**心智模型差异（一句话各表）**：

- React："改 state → 整个组件函数重跑，Diff 出差异"（重渲染模型）
- Vue："ref 变了 → **只通知用到它的地方**"（细粒度响应式模型，Proxy 拦截读写——第 35 节认过脸）

---

## 四、读懂一份 Vue 地图组件（实战演练）

```vue
<!-- 网上 GIS 项目的典型长相：initMap + onMounted -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'

const mapRef = ref(null)          // 挂 DOM 容器（对应你的 useRef）
let map = null                    // 地图实例（不用 ref：它不进模板、不需响应式）

onMounted(() => {                 // ≈ 你的 useEffect(() => {...}, [])
  map = L.map(mapRef.value).setView([30.59, 114.31], 10)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
})

onUnmounted(() => map?.remove())  // ≈ useEffect 的清理函数
</script>

<template>
  <div ref="mapRef" style="height: 400px"></div>
</template>
```

**对照你的 React 版**：`ref 容器 → useRef`、`onMounted → useEffect []`、`onUnmounted → cleanup`、`let map → useRef(mapRef)`——**你已经会写了，只是换了方言**。这就是"React 主线 + Vue 认知"策略的底气。

---

## 五、自测题

1. Vue 的 ref 与 React 的 useState 最直观的使用差异？
2. computed 相当于 React 的什么？多什么能力？
3. 子组件向父传事件的语法？对应 React 的什么？
4. `v-if` 与 `v-show` 的区别（对应 React 里怎么写）？
5. Vue 版地图组件的 onMounted/onUnmounted 对应 React 的什么？

### 参考答案

1. ref 读写都 `.value`（script 内）；useState 返回 [值, setter]，且任何更新触发组件重渲染。
2. 相当于"渲染时直接算的派生数据"；多了显式缓存与依赖追踪（React 里是每次渲染重算，优化要 useMemo）。
3. `emit('事件名', 载荷)` + 父组件 `@事件名` 监听；对应 React 的回调 props。
4. v-if 不渲染/销毁（≈ 条件渲染三元）；v-show 一直渲染只切 display（≈ style={{display}}）。
5. 挂载副作用与卸载清理——对应 `useEffect(() => {...}, [])` 与其 return 的清理函数。

---

## 六、下一步

会读 Vue 了 → **第 18 节：读懂国产 GIS 的 Vue 示例**，拿 Mars3D 官方工程真刀真枪练一次。
