---
title: "Cesium 三维校园场景：3D Tiles 与地形集成"
date: 2026-04-25
category: 3D GIS
tags: [Cesium, 3D Tiles, glTF, 数字孪生]
summary: "用 CesiumJS 搭建可交互三维校园：倾斜摄影转 3D Tiles、建筑白模分层、地下管线展示与飞行漫游。"
tech: [CesiumJS, 3D Tiles, glTF, obj2gltf]
github: https://github.com/yourname/cesium-campus-3d
---

## 项目简介

在二维校园地图之上做的三维版本：无人机倾斜摄影 + 楼栋分层白模 + 管线，统一加载进 Cesium 场景，支持飞行漫游与单体化点击。

## 功能

- 倾斜摄影模型（OSGB → 3D Tiles）流畅加载，LOD 自动调度；
- 建筑白模按楼层"单体化"，点击高亮并显示属性；
- 地下半透明模式展示管线网络；
- 预设相机路径漫游（校门 → 图书馆 → 体育场）。

## 技术过程

### 模型生产链路

```text
无人机航飞 (大疆精灵4 RTK)
  → ContextCapture 重建 OSGB
  → osgb2tiles / 3dtiles 转换
  → Cesium Ion 或自托管
```

白模部分：shp 拉伸（ArcGIS Pro 导出 multipatch）→ `obj2gltf -i building.obj -o building.glb` → `gltf-pipeline` 转 b3dm，配 batchTable 承载属性，实现单体化。

### 关键配置

```javascript
const tileset = await Cesium.Cesium3DTileset.fromUrl('./tiles/campus/tileset.json');
viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

// 地形
viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
  'https://your-cdn.com/terrain'
);
```

### 单体化点击

3D Tiles 本身没有"要素"概念，靠 batchTable 属性 + `viewer.scene.pick` 返回的 `batchId` 反查楼栋信息。

## 效果与经验

- 首屏加载控制在 3s 内（第一级 LOD 很小 + 视锥裁剪）；
- 倾斜摄影与白模不要叠在同一位置，透明度切换打架；
- Cesium 的 token/ion 服务在国内不稳定，最终全部资源自托管 + Nginx。

## 后续计划

- 接入实时数据（教室占用、能耗）做轻量数字孪生；
- 加载校园 InSAR 形变监测结果做三维叠加展示（与研究工作联动）。
