---
title: "DInSAR-形变监测"
date: "2026-02-25"
category: "遥感"
chapter: "SAR"
---

# DInSAR-形变监测

> **分类**：ENVI / SAR

> **最后修改时间**：2026-02-25 12:30:11.970

---

![](/uploads/20260901-bb6d90.png)
# 基线估算
![](/uploads/20260901-d494ac.png)
# 数据导入
sentinal-1数据导入
## 选取研究范围
### 先导入再裁剪 {toggle="true"}
	### 确定研究区
	导入的sar数据是没有地理坐标的
	所以要确定研究区，可以选择：
	- 先做一下地理编码，通过坐标确定研究区
	- 通过preview中的kml文件在google earth中确定位置，然后在sar数据中确定大概位置
	![](/uploads/20260901-58111d.png)
	### 创建研究区矢量
	![](/uploads/20260901-95b745.png)
	导出矢量shp
	### 裁剪
	![](/uploads/20260901-6c0626.png)
	![](/uploads/20260901-2d685b.png)

### 导入时进行裁剪
<columns>
	<column ratio="50">
		![](/uploads/20260901-5e83ed.png)
	</column>
	<column ratio="50">
		![](/uploads/20260901-a08384.png)
	</column>
</columns>
### 研究区矢量
研究区矢量获取的方法是，在arcmap中对行政区shp进行裁剪，可以用编辑工具切割面，将研究区裁出，然后导出为shp
# 工作流
打开/SARscape/Interferometry/**DInSAR Displacement Workflow** 工具
## 文件输入
![](/uploads/20260901-49530f.png)
## 干涉图生成
<columns>
	<column ratio="50">
		![](/uploads/20260901-b2dfb9.png)
	</column>
	<column ratio="50">
		![](/uploads/20260901-be5ee3.png)
	</column>
</columns>
![](/uploads/20260901-89969c.png)
![](/uploads/20260901-852402.png)
![](/uploads/20260901-f4eb49.png)
## 滤波和相干性计算
![](/uploads/20260901-19cde3.png)
![](/uploads/20260901-38a37c.png)
这一步处理之后生成的结果有：
- INTERF_out _fint：滤波后的干涉图
- INTERF_out _cc：相干性系数图
## 相位解缠
Phase Unwrapping：相位的变化是以 2π为周期的，所以只要相位变化超过了 2π，相位就会重新开始和循环。相位解缠是对去平和滤波后的相位进行解缠处理，使之与线性变化的地形信息对应，解决 2π模糊的问题
### 参数
解缠方法一般选**Minimum Cost Flow**
最小**相干性阈值越小，解缠的像元越多，解缠效果越好，但不能太小**
![](/uploads/20260901-5cc9d0.png)
## 轨道精炼和重去平
![](/uploads/20260901-2eb041.png)
![](/uploads/20260901-ffc854.png)
![](/uploads/20260901-88c12b.png)
![](/uploads/20260901-e7815f.png)
## 相位转形变以及地理编码
![](/uploads/20260901-eb6eaa.png)
![](/uploads/20260901-07bf73.png)
