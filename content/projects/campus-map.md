---
title: "校园交互地图：MapLibre 矢量瓦片方案"
date: 2026-02-14
category: WebGIS
tags: [MapLibre, 矢量瓦片, 校园地图, POI 检索]
summary: "用 tippecanoe 切片 + MapLibre GL JS 渲染 + 部署到 GitHub Pages 的完整校园地图，支持楼栋检索、路径浏览与移动端适配。"
tech: [MapLibre GL JS, tippecanoe, TypeScript, GitHub Pages]
demo: https://yourname.github.io/campus-map
github: https://github.com/yourname/campus-map
---

## 项目简介

给学校做的一个交互式校园地图：楼栋点击查看信息、按类别筛选 POI、教学区/生活区/运动区分层显示。全静态部署，没有后端，构建一次到处能跑。

## 功能

- 矢量瓦片渲染，缩放旋转流畅，Retina 屏清晰；
- POI 分类筛选（教学楼、宿舍、食堂、体育设施、服务点）；
- 楼栋名称模糊搜索，点击定位 + Popup 详情；
- 移动端单手操作布局与定位跟随。

## 技术要点

### 数据生产

收集校园要素（数字化自影像+实地核对）→ GeoJSON 规范化（字段：name/type/floors/height）→ tippecanoe 切片：

```bash
tippecanoe -o campus.mbtiles -z16 -Z12 \
  --drop-densest-as-needed campus.geojson
tile-join -e tiles/ campus.mbtiles
```

### 前端渲染

style.json 里用 `match` 表达式按 type 字段给建筑配色；`fill-extrusion` 图层按 height 拉伸做"轻量白模"，比整园三维模型轻得多。

### 交互实现

搜索用简单的拼音首字母 + 名称 includes 匹配（几百个 POI 用不着搜索引擎）；点击事件委托在 `map.on('click', layerId)` 上，命中后 `easeTo` 平移。

## 踩过的坑

1. 中文标注乱码 → glyphs 必须包含 CJK 字体集（自托管思源黑体 PBF）；
2. GeoJSON 坐标是 GCJ-02，切片前先用 gcoord 转 WGS84；
3. 手机上 60fps 掉帧 → 关闭不必要的 `symbol` 图层碰撞检测、瓦片 overzoom 限制在 2 级。

## 成果

- 校内实际使用，覆盖约 300 个 POI；
- 构建产物 < 15 MB（含瓦片），GitHub Pages 免费托管；
- 全流程写成教程发在本站 Notes：MapLibre 入门笔记。
