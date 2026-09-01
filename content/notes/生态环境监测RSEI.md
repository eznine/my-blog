---
title: "生态环境监测RSEI"
date: "2026-09-01"
---


# 生态环境监测RSEI

> **分类**：ENVI

> **最后修改时间**：2026-01-30 18:28:59.751

---

![](/uploads/20260901-9779d8.png)
# 哨兵2
**Sentinel-2 Level-1C（L1C）是表观反射率（TOA）/10000，数值\*0.0001才是表观反射率，已经做过辐射定标，只需要做大气校正。**
**Sentinel-2 Level-2A（L2A）是地表反射率（SR），不需要辐射定标和大气校正**
# 波段合成（研究区范围）
10m数据只有4个波段，短红外波段在20m数据中，所以如果需要10m的短红外波段数据，就要合成
![](/uploads/20260901-4f3cb7.png)
研究区范围合成图像如下：
![](/uploads/20260901-eff46d.png)
# 图像镶嵌（拼接）
- 接缝线（几何偏差），羽化
- 云色处理
![](/uploads/20260901-2108ab.png)
波段\*0.0001，得到地表反射率（TOA）
<columns>
	<column ratio="50">
		![](/uploads/20260901-09ca00.png)
	</column>
	<column ratio="50">
		![](/uploads/20260901-2d17fc.png)
	</column>
</columns>
# 不规则裁剪（ROI）
![](/uploads/20260901-40c4ef.png)
## 得到研究区表观反射率
![](/uploads/20260901-b8722d.png)

# 生态因子计算
# 计算绿度指标NDVI
![](/uploads/20260901-da1147.png)
![](/uploads/20260901-6226d9.png)
# 计算湿度指标WET
## Band Math
![](/uploads/20260901-27150d.png)
![](/uploads/20260901-2c1ed1.png)
# 计算干度指标（NDBSI）
![](/uploads/20260901-4b7f43.png)
## 分别计算裸土指数SI和建筑指数IBI
![](/uploads/20260901-764187.png)
## 计算SI和IBI平均值
![](/uploads/20260901-043e3b.png)

# 计算热度指标（LST）
![](/uploads/20260901-ba97a7.png)
传感器接受到的热量有两部分
- 云顶辐射能量（太阳照射云反射）
- 地表辐射能量（除去经过大气下行反射和透过大气被吸收的热量）
也就是通过计算大气透过率、大气上行辐射、大气下行辐射，反演地表温度
![](/uploads/20260901-e00a8b.png)
### 重采样
![](/uploads/20260901-5c9a72.png)
### 裁剪
![](/uploads/20260901-604b30.png)

## 生态因子归一化
![](/uploads/20260901-d7527e.png)
![](/uploads/20260901-3b05db.png)
![](/uploads/20260901-9518ed.png)
![](/uploads/20260901-334c58.png)
把2%最小值变成0，2%最大值变成1
波段计算器
![](/uploads/20260901-7b0c31.png)
## 生态指数计算RSEI
将四个因子波段合成一个波段
<br>
![](/uploads/20260901-4c08f4.png)
## 主成分分析
![](/uploads/20260901-629258.png)
![](/uploads/20260901-41b75b.png)
![](/uploads/20260901-85e45f.png)
PCA1，第一波段作为生态指标
![](/uploads/20260901-2e22ef.png)
## PCA主成分归一化
![](/uploads/20260901-31d454.png)
## 显示结果
可以拉伸，可以重分类分级
<columns>
	<column ratio="50">
		![](/uploads/20260901-6b1660.png)
	</column>
	<column ratio="50">
		![](/uploads/20260901-5ca4fe.png)
	</column>
</columns>
![](/uploads/20260901-3e895e.png)
导出分类结果
## 导出为图像
![](/uploads/20260901-661652.png)
