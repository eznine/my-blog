---
title: "Google Earth Engine 入门：Landsat 影像获取与去云完整流程"
date: "2026-05-05"
summary: "GEE 最常用的操作模板：按时间/区域筛选影像、QA 像元去云、中值合成与导出，附可直接复制的代码。"
tags: ["GEE","Landsat","去云","JavaScript"]
---


GEE 把 PB 级影像库和算力搬到云端，本地只写逻辑不存数据。下面是我最常用的 Landsat 8 处理模板。

## 影像集合的筛选三板斧

按**时间、空间、云量**三个维度过滤 `ImageCollection`：

```javascript
var roi = ee.Geometry.Rectangle([108.7, 34.1, 109.2, 34.5]); // 西安周边

var col = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(roi)
  .filterDate('2025-05-01', '2025-10-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 30));

print('影像数量:', col.size());
```

## 去云：QA_PIXEL + QA_RADSASS 双保险

Collection 2 Level-2 的质量波段是 `QA_PIXEL`（云/云影/雪）和 `QA_RADSAT`（饱和）。用位运算保留"清晰且未饱和"的像元：

```javascript
function maskClouds(img) {
  var qa = img.select('QA_PIXEL');
  var dilated = 1 << 1;   // 膨胀云
  var cirrus  = 1 << 2;   // 卷云
  var cloud   = 1 << 3;   // 云
  var shadow  = 1 << 4;   // 云影
  var mask = qa.bitwiseAnd(dilated).eq(0)
    .and(qa.bitwiseAnd(cirrus).eq(0))
    .and(qa.bitwiseAnd(cloud).eq(0))
    .and(qa.bitwiseAnd(shadow).eq(0));
  return img.updateMask(mask);
}

var clean = col.map(maskClouds);
```

## 定标 + 合成 + 导出

Surface Reflectance 产品需按比例因子缩放，然后做中值合成（比均值更抗残余云）：

```javascript
function applyScale(img) {
  var optical = img.select('SR_B.').multiply(0.0000275).subtract(0.2);
  return optical.copyProperties(img, ['system:time_start']);
}

var composite = clean.map(applyScale).median();

// 真彩色显示
Map.centerObject(roi, 9);
Map.addLayer(composite, {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 0, max: 0.3}, 'RGB');

// 导出到 Drive
Export.image.toDrive({
  image: composite,
  description: 'xian_landsat8_2025',
  region: roi,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
```

## 几点经验

- `filterMetadata('CLOUD_COVER', 'less_than', 30)` 只是整景云量，**不能代替逐像元去云**；
- 合成时段尽量对齐物候期（如生长季 5–10 月），否则年际对比没意义；
- 任务在 Tasks 面板点 RUN 才真正开始跑，大区域导出用 UTM 投影分块。
