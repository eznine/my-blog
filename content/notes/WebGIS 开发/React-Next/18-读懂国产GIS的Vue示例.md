---
title: "第 18 节 · 读懂国产 GIS 的 Vue 示例"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "React-Next"
order: 53
tags: ["web"]
---









# 第 18 节 · 读懂国产 GIS 的 Vue 示例

> 📌 **版本信息**：Vue 3.x + Vite（2026-08-29 核对）
> 📚 本地教材：`resources/06-cesium-3d/mars3d-vue-project/`（Mars3D 官方 Vue3 工程，本节主战场）
> 🎯 定位：认知收尾——**拿真实开源工程开刀**，验证第 17 节的对照表够不够用。

## 一、这一节的目标

1. 跑通 Mars3D Vue 工程（不深究三维本身，只看工程结构——三维是模块 16 的事）
2. 掌握"读陌生前端工程"的固定路径（五步法）
3. 精读 2 个真实文件，产出一份"翻译笔记"

---

## 二、读陌生前端工程的五步法（通用方法论）

```
① 看 package.json：dependencies 暴露技术栈（vue? react? 哪个 UI 库? 哪个地图库?）
   scripts 暴露命令（dev/build 怎么跑）
② 看 src/ 顶层：main.js(ts) 入口 → 路由 → 布局，画出"页面清单"
③ 挑一条最短的页面链路走读：路由 → 页面组件 → 它 import 的子组件（只读一条线）
④ 遇到不认识的目录（widgets/、misc/）：看 README 或猜+验证
⑤ 别陷进去：目标是"知道每个文件夹大概装什么"，不是读懂每一行
```

> 💡 这套五步法对**任何**前端工程通用（React 的也一样）——它是你接手公司旧项目的标准动作。

---

## 三、Mars3D 工程走读（跟着做）

```
mars3d-vue-project/
├── package.json        ① vue3 + vite + mars3d + @mars3d/* + antd?(看实际)
├── src/
│   ├── main.js         ② 入口：createApp → 装插件 → 挂载
│   ├── App.vue         根组件（≈你的 App.jsx）
│   ├── components/     通用组件
│   ├── pages/ 或 views/ 页面
│   ├── widgets/        ★ Mars3D 特色：业务功能块（每个 widget=一个功能面板）
│   ├── common/         配置与核心封装（map 配置常在这里）
│   └── utils/
└── public/             静态资源与配置 json
```

**跑通**：

```bash
cd resources/06-cesium-3d/mars3d-vue-project
npm install
npm run dev     # 浏览器打开，能看到三维地球就成功（要联网加载 Mars3D 资源）
```

---

## 四、精读任务（产出"翻译笔记"）

挑 `src/widgets/` 下**最简单的一个 widget**（找个只有一两个文件的，比如测量/坐标显示类）与 `common/` 的地图初始化文件，逐段翻译成 React 方言，写进本模块 `notes/vue-reading-notes.md`：

```markdown
## 原文片段（Vue）
<template><div ref="mapRef"/></template>
<script setup>
onMounted(() => { map = mars3d.Map.create(...) })
</script>

## React 方言翻译
function MapContainer() {
  const mapRef = useRef(null)
  useEffect(() => { /* mars3d.Map.create 同款 */ return () => map.destroy() }, [])
  return <div ref={mapRef} />
}

## 概念对照
onMounted ↔ useEffect([]) ；emit ↔ 回调 props ；widget ↔ 我们的 features/favorites 模式
```

## 五、自测题

1. 五步法第二步"看 src 顶层"具体看什么？
2. Mars3D 的 widgets/ 目录对应你学的哪种组织模式？
3. Vue 工程里"不进模板的对象"（如地图实例）为什么常用普通 let 而不是 ref？
4. 走读时遇到看不懂的目录怎么办？
5. 翻译笔记的价值是什么？

### 参考答案

1. main 入口 → 全局插件注册 → 路由 → 页面清单，画出最小页面链路。
2. features 模式（按业务功能内聚状态与组件）——与第 09 节的 features/favorites 同构。
3. Vue 的 ref 是响应式订阅（模板用了才需要）；地图实例不渲染、变化不需通知视图，包 ref 反而引入代理开销。（React 里同理：用 useRef 或普通变量，不用 useState。）
4. 查 README、看文件名猜职责、必要时读一个代表文件验证猜想——限时探索，不陷入。
5. 把"读过"变成"会迁移"：下次在 React 项目里实现同功能，直接调用这份映射。

---

## 六、下一步

Vue 认知完成，React 全部内容（阶段一+二）完结 🎉 → **第 19 节：为什么有 Next.js**，进入模块 03 的下半场。
