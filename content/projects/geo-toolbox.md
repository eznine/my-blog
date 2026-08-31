---
title: "Geo Toolbox：日常地理处理 Python 工具箱"
date: 2026-06-10
category: GIS 工具
tags: [Python, GeoPandas, GDAL, 批处理]
summary: "把日常重复的地理处理封装成命令行工具：批量裁剪、坐标系转换、按属性拆分、瓦片下载与简单的数据清洗，让 ArcGIS 里点到手酸的操作一条命令搞定。"
tech: [Python, GeoPandas, GDAL, Rasterio, Typer]
github: https://github.com/yourname/geo-toolbox
---

## 项目简介

做研究时每天重复的 GIS 操作：拿 30 个批次数据裁剪到研究区、统一坐标系、按行政区拆分、导出多种格式……在桌面软件里要一下午，写成工具链后一条命令几秒钟。这个仓库收集了我沉淀下来的十几个高频工具。

## 已有工具

```text
geo-toolbox
├── clip-batch      # 批量按掩膜提取（shp 掩膜 × 多栅格）
├── reproject       # 批量重投影（自动读源 CRS）
├── split-by-field  # 按属性字段拆分为多个文件
├── shp2geojson     # 格式互转 + 坐标纠偏（GCJ-02→WGS84）
├── dem2hillshade   # DEM 生成山体阴影/坡度/坡向三件套
├── tiles-fetch     # 按范围下载 XYZ 瓦片拼接成图
└── table-join      # Excel 属性表按编码批量挂接到 shp
```

## 使用方式

Typer 构建的 CLI，帮助信息自解释：

```bash
pip install geo-toolbox

geo-toolbox clip-batch --mask roi.shp --dir raw_tifs/ --out clipped/
geo-toolbox split-by-field --input city.shp --field DISTRICT --out dir/
```

## 设计取舍

- **不造 GUI**：命令行 + `--help` 对自己和小团队效率最高；
- **GeoPandas 优先**：矢量操作全部走 GeoPandas，栅格走 Rasterio/GDAL，避免混用桌面软件脚本（ArcPy 绑死环境）；
- **失败快、日志清**：每个文件处理结果一行日志，坏文件跳过并汇总，不让一个坏数据卡住整批任务。

## 成果

- 自用处理了约 200 GB 影像与矢量数据；
- 课题组同学也在用，收到过两个 PR（加分！）；
- 下一步：加一个 `validate` 工具，批量检查几何有效性、空 CRS、字段乱码。
