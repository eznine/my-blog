---
title: "SBAS-InSAR"
date: "2026-09-01"
---


# SBAS-InSAR

> **分类**：ENVI / SAR

> **最后修改时间**：2026-03-03 16:31:39.657

---

![](/uploads/20260901-40b4a8.png)
# 连接图
## 参数
### 基线阈值
**对与哨兵数据来说**
- 最小空间基线 （Min Normal Baseline (%)）：0，，默认为 0。
-  最大空间基线（Max Normal Baseline (%)）：2，哨兵数据应该设为 2%，表示基线是临界基线的 2%。
-  最小时间基线（Min Temporal Baseline）：0。
- 最大时间基线（Max Temporal Baseline）：120。
如果按照默认设置会导致影像对太多，造成数据冗余
### 冗余度
**Degree of Redundancy**
默认为 Low。在考虑到最小和最大时间基线和空间基线的阈值后，通过这个冗余度进一步对像对进行选择，有两个选项：
- High 表示对所有干涉像对符合基线条件的都接受；
- Low 表示基于荣誉标准和最少连接要求，程序将最小化保持干涉图的数量。
冗余标准（Redundacy Criteria）：当冗余度选择为 Low 时，该选项激活，有三个选项：
- Min Temporal Baseline：只保留那些最短时间基线的连接。
- Min Normal Baseline：只保留那些最小空间基线的连接。
- Max Normal Baseline：只保留那些最大空间基线的连接。
### 允许孤立的像对连接
**Allow Disconnected Blocks：False**
在连接像对的时候是否允许孤立的像对连接，如果设置为 False，程序会将所有像对进行连接。
## 结果
![](/uploads/20260901-a22eab.png)
可用/SARscape/Interferometric Stacking/Stacking Tools/Plot Viewer 工具，输入 auxiliary.sml文件，显示连接图。
# 干涉处理
配准→干涉→去平→滤波→解缠
## 参数
![](/uploads/20260901-e0b693.png)
输入参考 DEM 文件
![](/uploads/20260901-1770a4.png)
## 结果
![](/uploads/20260901-ea9e97.png)
![](/uploads/20260901-a79a98.png)
![](/uploads/20260901-e6a351.png)
## 剔除
依次查看上一步生成的各个像对的相干性图（_cc）、差分干涉图（_fint）、解缠结果图（upha），若有相干性低的、干涉不理想或者解缠错误的像对，**主要是黑色部分比较多的图**，**或者干涉图没有颜色**，使用连接图编辑工具移除该像对。
/SARscape/**InterferometricStacking/Stacking Tools/SBAS Edit Connection Graph** 工具进行连接图编辑，可删除像对，每一步进行完，都可进行连接图编辑。
# 第一次反演
速率、地形残差估算→平均强度图、精度估算→二次解缠
# 第二次反演
大气相位去除、相干性和其他计算
# 地理编码
速率和精度结果地理编码、形变结果地理编码
