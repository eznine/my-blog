---
title: "MapLibre GL JS 入门：矢量瓦片地图的正确打开方式"
date: 2026-06-02
category: WebGIS
tags: [MapLibre, 矢量瓦片, 前端, JavaScript]
summary: "从初始化地图到加载自定义矢量瓦片源、图层样式与交互事件，整理 WebGIS 前端开发的起步模板与关键概念。"
---

MapLibre GL JS 是 Mapbox GL JS 的开源分支，渲染矢量瓦片（MVT）流畅且可完全自托管。做校园地图项目时我把它跑通了全流程，记录如下。

## 最小可运行地图

```html
<div id="map" style="height: 100vh;"></div>

<script>
  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
    center: [108.94, 34.26],   // [lng, lat]
    zoom: 14,
  });
  map.addControl(new maplibregl.NavigationControl(), 'top-right');
</script>
```

## 核心概念：style 是一切的入口

`style` 对象定义了数据源（sources）与绘制规则（layers）：

```javascript
const style = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    campus: {
      type: 'vector',
      tiles: ['https://example.com/tiles/campus/{z}/{x}/{y}.pbf'],
    },
  },
  layers: [
    {
      id: 'building-fill',
      type: 'fill',
      source: 'campus',
      'source-layer': 'building',
      paint: {
        'fill-color': '#d9c9a8',
        'fill-opacity': 0.85,
      },
    },
  ],
};
```

图层 type 决定渲染方式：`fill`（面）、`line`（线）、`circle`（点）、`symbol`（图标/文字）、`fill-extrusion`（白模三维）。

## 数据驱动样式与交互

按属性控制颜色（DDP，data-driven paint）：

```javascript
'fill-color': [
  'match',
  ['get', 'type'],
  '教学楼', '#c9a26b',
  '宿舍',   '#a8b8c9',
  '绿地',   '#7aa87a',
  '#cccccc',
],
```

点击查询要素：

```javascript
map.on('click', 'building-fill', (e) => {
  const f = e.features[0];
  new maplibregl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(`<strong>${f.properties.name}</strong>`)
    .addTo(map);
});
```

## 实用经验

- **坐标系**：MapLibre 内部使用 EPSG:3857，`lngLat` 传 EPSG:4326，框架自动转换；
- **GCJ-02 偏移**：叠加国内商业底图要自己做坐标偏移转换，开源库 `gcoord` 可用；
- **瓦片生产**：小范围数据用 `tippecanoe` 从 GeoJSON 切片，一条命令足够；
- **性能**：点位超过 1 万考虑聚合（cluster）或转成矢量瓦片，别用 GeoJSON source 硬扛。
