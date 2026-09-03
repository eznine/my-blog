---
title: "第 13 节 · 控件全解与 API 速查手册（模块 05 收官）"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Leaflet"
order: 42
tags: ["web","leaflet"]
---









# 第 13 节 · 控件全解与 API 速查手册（模块 05 收官）

> 📌 **版本信息**：Leaflet 1.9.4（2026-08-29 核对）
> 📚 来源：[Leaflet Control 参考](https://leafletjs.com/reference.html#control) ｜ [PLUGIN-GUIDE](https://github.com/Leaflet/Leaflet/blob/main/PLUGIN-GUIDE.md)
> 📖 定位：两件事——①控件体系全解；②产出一份**可长期维护的《Leaflet API 速查手册》**（章程承诺的"当字典维护"）。

## 一、这一节的目标

1. 掌握控件体系：位置象限 / 内置控件配置 / Control.extend
2. 掌握 Attribution（版权）控件的合规管理
3. 产出《Leaflet API 速查手册》到本模块 examples/13 目录（长期字典 v1.0）
4. 模块 05 收官

---

## 二、控件体系全解

```js
// 四个位置象限：topleft / topright / bottomleft / bottomright
// 内置控件一览：
L.control.zoom({ position: 'topleft', zoomInText: '+', zoomInTitle: '放大' });
L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 150 });   // 比例尺（公制）
L.control.layers(baseMaps, overlays, { position: 'topright', collapsed: false });  // 图层开关（第 07 节）
L.control.attribution({ position: 'bottomright', prefix: false }); // 版权汇总

// 版权管理（合规要点）：
const map = L.map('map', { attributionControl: false });   // 关掉默认
L.control.attribution({ prefix: 'GeoLearn' }).addTo(map);  // 自定义前缀
// 各 TileLayer 的 attribution 自动汇总到该控件——多个底图时显示各自的
// ⚠️ 全删 = 法律风险；产品化要保留数据源署名（OSM 条款要求可点击查看完整声明）

// 自定义控件（第 07 节 Control.extend 已学）+ 控件的移除：
const ctl = L.control.scale({...}).addTo(map);
map.removeControl(ctl);
```

---

## 三、《Leaflet API 速查手册》v1.0（产出物）

手册文件：`examples/13-LeafletAPI速查手册.md`。**骨架如下（正式内容我已写入该文件）**——按"你实际会翻的场景"组织，共 10 张速查表：

1. 地图初始化与视野（map/create/flyTo/setView/invalidateSize）
2. 底图 TileLayer（模板占位符/参数/常用源 URL）
3. 标记与图标（marker options / 三种 icon / 锚点）
4. 弹窗与提示（bindPopup/Tooltip 选项/手动开关）
5. GeoJSON 三回调（style/pointToLayer/onEachFeature）
6. 矢量图层参数（Path 公共 + 各专属 + 选型）
7. 事件速查（map 事件表 / 图层事件 / e 对象字段）
8. 图层组织（Group/FeatureGroup/Layers 控件/pane z 值表）
9. 坐标与换算（latLng/latLngBounds/距离量算 containerPointToLatLng…）
10. 常用插件一行用法（cluster/heat/minimap/fullscreen/providers）

**维护约定**：以后每节新学到的 API、每次踩坑的解法，都补进对应表——毕业时这本手册就是你的"Leaflet 外挂大脑"。

---

## 四、模块 05 结业自检（对照总纲）

- [ ] 13 节文档全部完成（阶段一 8 + 阶段二 5）
- [ ] 8 个练习全部跑通
- [ ] 综合项目 **C-05 旅行足迹地图** 完成（practice/C-05-旅行足迹地图/README.md 任务书）
- [ ] `学习计划.md` 打卡

## 五、自测题

1. 四象限位置值？比例尺控件的公制配置？
2. attribution 控件的合规底线？
3. Layers 控件与 map.addLayer 联动机制？
4. 自定义控件必须实现的 method？
5. 速查手册的维护约定？

### 参考答案

1. topleft/topright/bottomleft/bottomright；`L.control.scale({ imperial: false })`。
2. 不可全删 attribution；保留数据源署名与可查链接（OSM/天地图条款）。
3. 控件注册了 map 的 addLayer/removeLayer 事件——编程开关会同步勾选状态（双向）。
4. `onAdd(map)` 返回控件 DOM（可选 onRemove 清理）。
5. 按场景分 10 张表；后续新 API 与踩坑解法持续补入对应表。

---

## 六、🎉 模块 05 · Leaflet 收官

**13/13 节完成**：三板斧 → 底图 → 标记 → 弹窗 → GeoJSON → 事件 → 图层组织 → 插件 → 类体系 → CRS → 渲染器 → 矢量参数 → 控件与速查。

**下一站：模块 06 · OpenLayers**（15 节：全功能二维地图库——OL 核心概念、Workshop 全程、矢量/交互/Source 体系、矢量瓦片、WebGL、React 集成、性能优化 + C-06 综合工作台）。Leaflet 是"轻快上手"，OL 是"企业主力"——难度与深度同步上台阶。
