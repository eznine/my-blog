---
title: "GEE 土地利用变化监测：随机森林分类与转移矩阵"
date: 2025-12-20
category: 遥感应用
tags: [GEE, 随机森林, 土地利用, 转移矩阵]
summary: "在 Google Earth Engine 上对研究区 2000—2025 年土地利用做随机森林分类，输出转移矩阵与变化热点图，为生态研究提供本底数据。"
tech: [Google Earth Engine, JavaScript, Random Forest, Sentinel-2]
github: https://github.com/yourname/gee-landuse-change
---

## 项目简介

生态安全格局研究的第一步是可靠的土地利用本底。这个项目在 GEE 上完成了研究区五期（2000/2005/2010/2015/2025）土地利用分类与变化分析，全部云端完成，本地零计算。

## 功能

- 多时相合成（去云 + 中值合成）自动生成分类底图；
- 随机森林分类（一级 6 类：耕地/林地/草地/水域/建设用地/未利用地）；
- 转移矩阵、动态度、变化热点制图一键导出；
- 分类精度报告（总体精度、Kappa、混淆矩阵）。

## 技术要点

### 样本与特征

样本来源：高分影像目视解译 +野外核查点，每类 ≥ 400 个，70/30 划分训练验证。

特征不只是波段，加上纹理与指数显著提升建设用地精度：

```javascript
var bands = ['B2','B3','B4','B8','B11','B12'];
var ndvi = composite.normalizedDifference(['B8','B4']).rename('NDVI');
var ndbi = composite.normalizedDifference(['B11','B8']).rename('NDBI');
var mndwi = composite.normalizedDifference(['B3','B11']).rename('MNDWI');

var features = composite.select(bands).addBands([ndvi, ndbi, mndwi]);

var classifier = ee.Classifier.smileRandomForest(300)
  .train({features: training, classProperty: 'type', inputProperties: bands.concat(['NDVI','NDBI','MNDWI'])});
```

### 精度

五期总体精度 88%~92%，Kappa 0.85+。误差集中在草地/未利用地混淆——后续用 DEM+坡度做规则后处理修正。

### 转移矩阵

`ee.Image.pairwise` 旧版已弃用，改用两期分类图 `multiply` 编码后 `reduceRegion` 直方图，一行代码得到 CROSSTAB。

## 成果

- 研究区 25 年建设用地扩张 2.4 倍，主要侵占耕地与草地；
- 产出直接支撑了两项研究的数据底图；
- 脚本模块化，改 ROI 与年份即可复用到其他区域。
