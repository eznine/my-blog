---
title: "第 10 节 · CRS 详解"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Leaflet"
order: 35
hidden: true
tags: ["web","leaflet"]
---





# 第 10 节 · CRS 详解

> 📌 **版本信息**：Leaflet 1.9.4（2026-08-29 核对）
> 📚 来源：[Leaflet CRS 文档](https://leafletjs.com/reference.html#crs) ｜ 源码 `src/geo/crs/CRS.js` ｜ 模块 04 第 01/02 节（数学基础）
> 🎯 CRS 是 Leaflet 的"投影引擎"——`{z}/{x}/{y}` 瓦片怎么贴到屏幕，全靠它换算。

## 一、这一节的目标

1. 掌握 CRS 的四个核心职责（投影/瓦片尺度/原点/范围）
2. 精通内置三种：EPSG3857 / EPSG4326 / Simple
3. 掌握自定义 CRS 的两个实战场景：图片地图、天地图 4490
4. 能解释"Leaflet 为什么把 3857 设为默认"

---

## 二、CRS 的四个职责

Leaflet 里 CRS（Coordinate Reference System）不只是"投影定义"，它包办了瓦片渲染的全部坐标约定：

```js
L.CRS.EPSG3857 的核心成员：
projection: L.Projection.SphericalMercator   // ① 投影：经纬度 ↔ 平面米（模块 04 公式）
transformation: new L.Transformation(0.5 / Math.PI, 0.5, -0.5 / Math.PI, 0.5)
                                             // ② 变换：平面米 → [0,1] 归一化坐标
scale(zoom) { return 256 * 2 ** zoom; }      // ③ 尺度：级别 z 下"世界"的像素总宽
zoom(scale)  { return Math.log(scale / 256) / Math.LN2; }   // ③' 反算（支持缩放动画的连续值）
infinite: false                              // ④ 是否无限平铺（经度可绕圈？）
bounds: [[-85.05, -180], [85.05, 180]]       // 有效范围（极区截断的代码形态）
```

**渲染链路**：`经纬度 → projection 投影到米 → transformation 归一化 → scale(zoom) 缩放到像素`——模块 04 第 02 节手算的公式在这里"连成了流水线"。

---

## 三、内置三种 CRS

| CRS | 投影 | 配套瓦片 | 场景 |
|---|---|---|---|
| `L.CRS.EPSG3857`（默认） | 球面墨卡托 | OSM/天地图 w/高德/几乎所有 Web 底图 | 99% 的项目 |
| `L.CRS.EPSG4326` | 无投影（经纬度直当平面） | 天地图 c 系（经纬度切图）/ WMS 图 | 天地图经纬度切片、WMS 直连 |
| `L.CRS.Simple` | y 轴向下的平面坐标 | 无瓦片 | **图片地图**（游戏地图/楼层图/扫描件标注） |

```js
// Simple CRS：把一张图片当"世界"——超大图片标注的免费方案！
const map = L.map('map', {
  crs: L.CRS.Simple,                     // 1 单位 = 1 像素（y 向下）
  minZoom: -2,                           // 允许"缩小到图片很小"（负级别！）
});
L.imageOverlay('map.jpg', [[0, 0], [2400, 3600]]).addTo(map);   // 图片四角坐标（像素）
L.marker([1200, 1800]).addTo(map);      // 图片中点放标记——像素即坐标
```

---

## 四、自定义 CRS 两个实战场景

**场景 ①：天地图/自家 4490 经纬度瓦片**

```js
// EPSG:4326 瓦片（天地图 c 系）直接用内置：
const map = L.map('map', { crs: L.CRS.EPSG4326, center: [30.59, 114.31], zoom: 10 });
L.tileLayer('…tianditu…TileMatrix={z}&TileRow={y}&TileCol={x}…').addTo(map);
// 注意：c 系瓦片的 {z} 与 3857 瓦片的 {z} 编号不同（分辨率定义不同），数据别混用
```

**场景 ②：非标准投影（如高斯克吕格 4546）——proj4leaflet**

```js
// Leaflet 核心只内置三大 CRS；任意投影需要插件 proj4leaflet（或 OL，模块 06 原生支持）
L.CRS.EPSG4546 = new L.Proj.CRS('EPSG:4546',
  '+proj=tmerc +lat_0=0 +lon_0=114 +k=1 +x_0=38500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
  {
    origin: [-500000, 4000000],          // 瓦片原点（与切片服务约定一致！）
    resolutions: [8, 4, 2, 1, 0.5, ...], // 各级分辨率数组（WMTS 能力文档里查）
  });
// ⚠️ 自定义 CRS 瓦片服务的三大匹配项：origin / resolutions / matrix（层级定义）
//    ——与发布方（GeoServer/WMTS 能力文档）严格对齐，错一个就是"瓦片错位"
```

---

## 五、自测题

1. CRS 四大职责？
2. 渲染链路四步（经纬度到像素）？
3. Simple CRS 的典型场景？坐标单位是什么？
4. 天地图 3857 版（w 系）与 4326 版（c 系）瓦片能混用吗？
5. 自定义 CRS 对接瓦片服务要对齐哪三项？

### 参考答案

1. 投影定义 / 归一化变换 / 各级尺度（scale/zoom 互算）/ 范围与无限性。
2. 投影到米 → Transformation 归一化 → scale(zoom) 放大到像素。
3. 图片/平面图标注；坐标单位=像素（y 向下），支持负缩放级别。
4. 不能——两者层级定义（分辨率表）不同，同 z 尺寸不同，混用错位。
5. origin（原点）/ resolutions（各级分辨率）/ 瓦片矩阵层级定义——与服务发布方严格一致。

---

## 六、下一步

坐标引擎吃透 → **第 11 节：渲染器原理**——SVG 与 Canvas 渲染器的分工。
