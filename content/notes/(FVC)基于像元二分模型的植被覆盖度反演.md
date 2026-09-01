---
title: "(FVC)基于像元二分模型的植被覆盖度反演"
date: "2026-09-01"
---


# (FVC)基于像元二分模型的植被覆盖度反演

> **分类**：ENVI

> **最后修改时间**：2026-02-21 08:33:26.431

---

# 像元二分法模型
![](/uploads/20260901-732284.png)
![](/uploads/20260901-3581a3.png)
# 预处理
## 辐射定标
## 图像镶嵌
## 大气校正

# 数据分析
## 计算NDVI
### 去除异常值
![](/uploads/20260901-e2d280.png)

## 分类统计
![](/uploads/20260901-971a04.png)
获取不同土地类型的NDVI最大值和最小值
![](/uploads/20260901-03faa4.png)
![](/uploads/20260901-b25e1b.png)
<columns>
	<column ratio="50">
		![](/uploads/20260901-9728c7.png)
	</column>
	<column ratio="50">
		![](/uploads/20260901-47f56b.png)
	</column>
</columns>
确定2%和98%对应值为最小值和最大值
<columns>
	<column ratio="50">
		![](/uploads/20260901-1e474e.png)
	</column>
	<column ratio="50">
		![](/uploads/20260901-4a83f9.png)
	</column>
</columns>
得到各土地类型NDVI的最小值和最大值
![](/uploads/20260901-241dba.png)
波段运算得到整体的NDVI最小值（soil）和最大值（veg）

![](/uploads/20260901-d9c0ae.png)
![](/uploads/20260901-a338d7.png)
##  植被覆盖度估算<br>
![](/uploads/20260901-92d3ec.png)
去除FVC异常值
![](/uploads/20260901-3fa473.png)
结果如图，进行密度分割
![](/uploads/20260901-e64e40.png)
