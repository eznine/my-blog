---
title: "rasterio"
date: "2026-04-28"
category: "Python"
tags: ["python"]
---

# rasterio

> **分类**：Python

> **最后修改时间**：2026-04-28 14:42:35.168

---

# 打开栅格数据
![](/uploads/20260901-2e45c4.png)
## 查看名字、打开模式
![](/uploads/20260901-b5a3da.png)
## 查看元数据
width和height表示的是列、行数
count表示多少波段
transform变换矩阵，把每个像素映射到投影上
a,e对应空间分辨率，b,d代表旋转，c,f表示图像左上角，c,f很重要
指定了图的左上角在哪里，确定的栅格图像在投影下的位置，否则只是一张图像
![](/uploads/20260901-790a9b.png)
![](/uploads/20260901-57c3a2.png)
## 查看边界
![](/uploads/20260901-ce64f4.png)
# 可视化
![](/uploads/20260901-384272.png)
## 选择可视化的波段
rasterio中的索引是从1开始的，不是0
![](/uploads/20260901-81a527.png)
## 自定义颜色映射表
![](/uploads/20260901-d8f1ea.png)

# 导入矢量
使用geopandas导入矢量边界
注意坐标系的一致，可以使用**gdf.to_crs(src.crs)直接统一坐标系**
![](/uploads/20260901-f0c5ce.png)
![](/uploads/20260901-296f2a.png)
# 添加图例、标题
如果用**plt.imshow()就会丢失坐标信息**
只有用**rasterio.plot.show()画图，才会在坐标轴上显示坐标**
![](/uploads/20260901-358b48.png)
# 多光谱数据
## 导入、查看
![](/uploads/20260901-12cbfa.png)
## 波段命名
![](/uploads/20260901-d77342.png)
## 可视化
![](/uploads/20260901-5f8124.png)
### 显示多个波段
![](/uploads/20260901-c99c9a.png)
## flatten展开
**axes = axes.flatten()表示把画布展开，比如两行三列是**
	fig,axes=plt.subplots(2,3)索引时间要用axes\[0\]\[1\]或者axes\[1,2\]
	展开后只需要用axes\[0\]或axes\[1\]或axes\[2\]….或axes\[5\]
## 波段合成
用np.dstack((band1,band2,band3))进行合成
.clip(0,1)是为了去除异常值
![](/uploads/20260901-5cac81.png)
# 波段计算
## NDVI
.clip()去除异常值
![](/uploads/20260901-29a2ff.png)
## NDWI
![](/uploads/20260901-e265fe.png)
# 数据导出
## 导出单波段
在经过波段运算后的数据，比如nvdi，ndwi，都变成了数组，**没有地理信息**，所以要用
**rasterio.open()打开栅格元数据profile，里面有driver：gtiff，count：7，crs等波段、坐标信息**
再用**`profile.update(...)`****修改元数据profile的属性以适应新生成的数据，比如**
count=1指ndvi一个波段，compress=‘lzw’，LZW是一种压缩算法
最后以**rasterio.open（output_raster_path，’w’）以写入的方式打开栅格（因为没有output，所以相当于创建）**
再用  **.write()写入**
`**profile` 将 `profile` 字典中的所有键值对展开为函数的参数。
\*\*profile就相当于是width=2485,height=2563,count=1,dtype=’float32’,csr=’’所以信息
所以每次保存都应该线打开原始栅格，然后更新，并且导出时要用原始栅格的信息
![](/uploads/20260901-363e5d.png)
## 导出多波段
导出3个波段的rgb影像
![](/uploads/20260901-ffe3e1.png)
# 栅格裁剪
## 按范围裁剪
![](/uploads/20260901-38f4a8.png)
## 按矢量边界裁剪
![](/uploads/20260901-cb0f8a.png)
