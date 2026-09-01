---
title: "geopandas"
date: "2026-04-28"
category: "Python"
tags: ["python"]
---

# geopandas

> **分类**：Python

> **最后修改时间**：2026-04-28 14:42:32.024

---

# 创建gpd的数据框
## 创建一个pd数据框
![](/uploads/20260901-a6d0a9.png)
## pd数据框传入gpd
类似于，arcmap里面，导入csv/txt，设置X/Y
df就是pd的一个数据框，geometry是几何属性，调用points_from_xy，传入df中的lon和lat作为两个坐标参数
![](/uploads/20260901-122919.png)
geopandas独有的数据类型：geometry
![](/uploads/20260901-7fb47c.png)
## 数据读取
**gdb.read_file()  可以填url，也可以填file path**
数据可以是geojson、shp、csv……
![](/uploads/20260901-5eb531.png)
## 数据导出
**gdf.to_file()，参数分别是导出后的文件名称，导出类型driver，可以有geojson\\shp\\csv等等，driver也可以不写，根据文件名自动识别**
导出的数据只允许有一个geometry属性，不能有多个
![](/uploads/20260901-6750fa.png)
## geojson和shp相互转换
geojson只有一个文件，就是用字典储存各个字段的名称、值，最主要的就是geometry属性里面的坐标，还可以用文本文档打开，数据占用少，比shp更适合传输，储存
gpkg文件是geopackage，比geojson的空间更小

![](/uploads/20260901-3539d9.png)
# 分析
## 设置索引
默认索引是0,1,2,3,4……
**set_index(’’)可以把属性表中某一列作为索引**
![](/uploads/20260901-aca44a.png)
## 计算面积
**gdf.area可以计算面积，gdf\[’Area’\] = gdf.area可以创建新列，计算面积并添加到属性表中**
![](/uploads/20260901-3e8ec1.png)
## 计算边界、中心
![](/uploads/20260901-6aeb5a.png)
## 选择、索引要素
每个shp或geojson中的某一行，也就是每个要素，或者是每条记录
可以通过**gdf.loc\[’’\]选择、查看**
![](/uploads/20260901-eb967a.png)
要选择某条记录的某个属性时，可以通过嵌套索引
<columns>
	<column ratio="50">
		![](/uploads/20260901-2f30d9.png)
	</column>
	<column ratio="50">
		![](/uploads/20260901-572c65.png)
	</column>
</columns>
## 计算到某点距离
可以用**gdf\[’所有点的坐标’\].distance(’某个点的坐标’)计算所有点到某个点的距离**
![](/uploads/20260901-023514.png)
### 计算平均距离
![](/uploads/20260901-305a08.png)
## 删除列
![](/uploads/20260901-1d2076.png)
## 缓冲区
gdf.buffer()创建缓冲区，参数是缓冲区大小
![](/uploads/20260901-9bed5b.png)
## 矢量叠加分析
## 查看坐标系
EPSG代表不同坐标系的唯一代码
![](/uploads/20260901-1c054d.png)
## 变换投影
![](/uploads/20260901-b734a0.png)
# 可视化
**gdf.plot()第一个参数是可视化的内容**
![](/uploads/20260901-804068.png)
可以添加多个geometry属性，叠加。需要再**plot(**)里面添加ax=另一个图  这个属性
![](/uploads/20260901-d03e1b.png)
![](/uploads/20260901-6c76c9.png)
