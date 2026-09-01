---
title: "MCR"
date: "2026-09-01"
---


# MCR

> **分类**：GIS / 生态

> **最后修改时间**：2026-03-21 03:37:01.222

---

最小累计阻力模型
# 数据
## 五个指标
根据不同地区，不同要求，可以选择不同要素作为阻力面
**有利的因素阻力面数值小，有害的要素阻力面数值大**
<columns>
	<column ratio="50">
		![](/uploads/20260901-a4b342.png)
	</column>
	<column ratio="50">
		![](/uploads/20260901-9b1023.png)
	</column>
</columns>
**道路距离**
根据路网做距离分析得到道路距离（注意并行处理0、掩膜、捕捉栅格）
![](/uploads/20260901-ece363.png)
## 无量纲化（分级赋值、标准化）
![](/uploads/20260901-577ba4.png)
选用正向化/逆向化
**栅格计算器或模糊隶属度工具**
![](/uploads/20260901-f54b11.png)
![](/uploads/20260901-06eb45.png)
土地利用是离散数据，所以只能先赋值**（重分类），再标准化**
参考
![](/uploads/20260901-38ecd5.png)
<columns>
	<column ratio="50">
		![](/uploads/20260901-747384.png)
	</column>
	<column ratio="50">
		![](/uploads/20260901-81e918.png)
	</column>
</columns>
## 权重累加
<columns>
	<column ratio="12.5">
		参考
	</column>
	<column ratio="87.5">
		![](/uploads/20260901-a4b342.png)
	</column>
</columns>
使用栅格计算器或者加权总和
<columns>
	<column ratio="50">
		![](/uploads/20260901-fcbe26.png)
	</column>
	<column ratio="50">
		![](/uploads/20260901-f8edbc.png)
	</column>
</columns>
# 分析
## 成本连通性
源地中心连接斑块
![](/uploads/20260901-7b6a12.png)
## 成本路径
源地边界连接斑块
### 源地

导出一个源地作为源地1，其他的导出作为目的地1
计算成本距离，得到成本距离和回溯链接
![](/uploads/20260901-ca4d57.png)
![](/uploads/20260901-e2122d.png)
### 栅格转面
![](/uploads/20260901-7b62f1.png)
### 融合
![](/uploads/20260901-6710de.png)
