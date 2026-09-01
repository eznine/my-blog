---
title: "InSAR-制作DEM"
date: "2026-02-24"
category: "遥感"
chapter: "SAR"
---

# InSAR-制作DEM

> **分类**：ENVI / SAR

> **最后修改时间**：2026-02-24 16:01:34.809

---

![](/uploads/20260901-52af55.png)
干涉雷达（InSAR）处理是从原始的 SLC 数据对开始
**流程包括：**
- **基线估算**
- **干涉图生成**
- **干涉图去平**
- **干涉图自适应滤波和相干生成**
- **相位解缠**
- **轨道重定义**
- **高程/形变转换**
一般推荐使用流程化的工具进行 InSAR 处理
分步操作方式进行某一步的测试或者加入自己的算法
# 数据后缀
![](/uploads/20260901-3bcdce.png)
## 基线估算
![](/uploads/20260901-06bb85.png)
# 工作流
## 输入数据
<columns>
	<column ratio="50">
		![](/uploads/20260901-bcf579.png)
	</column>
	<column ratio="50">
		![](/uploads/20260901-a27016.png)
	</column>
</columns>
## 参数
![](/uploads/20260901-b715d8.png)
全局参数（Global）<br>• 生成 TIFF 数据（Generate Quick Look）：Ture，生成 TIFF 格式的中间结果，如果需要使用中间结果，如写文章时候作为插图，可以设置为 True，其他步骤类似。
![](/uploads/20260901-910a66.png)
## 干涉图生成-干涉去平
![](/uploads/20260901-42451a.png)
## 滤波-相干性估算
![](/uploads/20260901-4dbeff.png)
![](/uploads/20260901-4a4ea0.png)
## 相位解缠
相位的变化是以 2π为周期的，所以只要相位变化超过了 2π，相位就会重新开始和循环。相位解缠是对去平和滤波后的相位进行解缠处理，使之与线性变化的地形信息对应，解决 2π模糊的问题
![](/uploads/20260901-09648d.png)
![](/uploads/20260901-25e410.png)
## 轨道精炼
### 控制点选择
有的轨道有轨道残差，可以通过控制点进行优化
输入用于轨道精炼的控制点文件，可以用已有的文件也可在此选择控制点
在 Refinement GCP File（Mandatory）项中，点击望远镜按钮，自动打开流程化的控制点选择工具，并输入了相应的参考文件
![](/uploads/20260901-b0e240.png)
![](/uploads/20260901-99522a.png)
![](/uploads/20260901-ae250a.png)
![](/uploads/20260901-c7cba8.png)
### 轨道精炼和重去平
![](/uploads/20260901-9e6bb7.png)
![](/uploads/20260901-8894b2.png)
**可以把选择的控制点文件，refinement.shp加载进去**
![](/uploads/20260901-a3c43a.png)
## 地理编码
![](/uploads/20260901-9496e4.png)
![](/uploads/20260901-82f866.png)
![](/uploads/20260901-28bdb1.png)
### 空洞处理
![](/uploads/20260901-5c2d9f.png)
## 结果导出
![](/uploads/20260901-b3bae8.png)
