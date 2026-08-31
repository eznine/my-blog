---
title: "空间自相关与 Moran's I：空间不是独立的"
date: 2026-05-18
category: 空间分析
tags: [空间统计, Moran's I, LISA, Python]
summary: "为什么经典统计在空间数据上会翻车：空间自相关的概念、全局/局部 Moran's I 的计算与解读，附 PySAL 代码。"
---

Tobler 地理学第一定律："任何事物都与其他事物相关，但相近的事物关联更紧密。"这句话是空间统计的起点——它意味着**样本不独立**，经典统计的 i.i.d. 假设在空间数据上直接破产。

## 全局 Moran's I

度量整个研究区某属性的空间聚集程度：

```text
I = (n / W) × ΣΣ w_ij (x_i - x̄)(x_j - x̄) / Σ (x_i - x̄)²
```

取值 [-1, 1]：接近 1 为高高聚集，接近 -1 为高低相间（棋盘状），0 为随机。**必须做显著性检验**（置换检验 999 次），否则没有解释权。

```python
import libpysal
import geopandas as gpd
from esda.moran import Moran, Moran_Local

gdf = gpd.read_file("landuse_stats.shp")
w = libpysal.weights.Queen.from_dataframe(gdf)  # 邻接权重
w.transform = "r"                                # 行标准化

moran = Moran(gdf["ndvi"], w, permutations=999)
print(f"I = {moran.I:.3f}, p = {moran.p_sim:.4f}")
```

## 局部 Moran's I（LISA）

全局值只回答"有没有聚集"，LISA 回答"**哪里**聚集"，并分出四类像元：

| 类型 | 含值 | 含义 |
| --- | --- | --- |
| High-High | 高值被高值包围 | 热点（如核心林区） |
| Low-Low | 低值被低值包围 | 冷点（如城建区 NDVI） |
| High-Low / Low-High | 高低相间 | 空间异常值 |

```python
lisa = Moran_Local(gdf["ndvi"], w, permutations=999)
# lisa.q: 1=HH, 2=LH, 3=LL, 4=HL；lisa.p_sim 给出显著性
```

## 在生态研究里的用法

我的使用场景：NDVI / 生境质量的空间聚集结构——HH 区常与生态源地重合，LL 区对应建设扩张区；把 LISA 显著类型作为生态安全格局"源地识别"的辅助证据，比单看数值分位数更有说服力。

## 常见坑

- 权重矩阵选择（Queen/Rook/K 近邻/距离阈值）会改变结果，做敏感性分析；
- 样本量太小（< 30 个面元）时置换检验不稳定；
- Moran's I 只检测**一阶**聚集，不能替代半变异函数分析。
