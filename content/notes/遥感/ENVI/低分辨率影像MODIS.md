---
title: "低分辨率影像预处理"
date: "2026-01-17"
category: "遥感"
chapter: "ENVI"
---

# 低分辨率影像预处理

> **分类**：ENVI / 遥感影像处理

> **最后修改时间**：2026-01-17 15:42:50.603

---

# 1. MODISL1B级数据
MODIS L1B数据有经纬度数据，所以可以进行几何校正
## 几何校正
![](/uploads/20260901-7bbff9.png)
![](/uploads/20260901-50f7ed.png)
# 2. MOD 14产品数据
MOD14产品数据没有经纬度数据，只能通过MOD03数据的经纬度文件构建查找表，再对MOD14进行几何校正（地理定位）

### 获取MOD3的经纬度文件
![](/uploads/20260901-01b25d.png)
![](/uploads/20260901-af5005.png)
![](/uploads/20260901-dcab63.png)
<columns>
	<column ratio="50">
		![](/uploads/20260901-4c0999.png)
	</column>
	<column ratio="50">
		![](/uploads/20260901-82f47d.png)
	</column>
</columns>
### 利用GLT地理查找表对MOD14数据进行地理定位
![](/uploads/20260901-82b1d0.png)
![](/uploads/20260901-873827.png)
