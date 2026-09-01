---
title: "NumPy"
date: "2026-04-29"
category: "Python"
tags: ["python"]
---

# NumPy

> **分类**：Python

> **最后修改时间**：2026-04-29 17:26:22.875

---

# **NumPy**简介
## **为什么要使用 NumPy**
Python **列表**可以包含各种类型的元素，而且当用于对少量元素执行单个操作时，速度非常快。
根据数据的特性和需要执行的操作类型，**数组**可能更合适在 CPU 上处理大量“同质”（相同类型）数据时，NumPy 的优势尤为突出。
## 什么是数组
数组是一种用于存储和检索数据的结构。我们通常把数组想象成空间中的一个网格，每个单元格存储一个数据元素。例如，如果数据的每个元素都是一个数字，我们可以把数组想象成一个“一维”数组
- 一维数组就像一个列表一样
- 二维数组就像一张表格
- 三维数组就像一组表格，或许像打印在不同的页面上一样堆叠起来。
在 NumPy 中，这个概念被推广到任意维度，因此基本的数组类被称为 `ndarray` ：它表示一个“N 维数组”。
## **数组基础知识**
# **导入NumPy**
```python
import numpy as np
```
# **创建数组**
## 一维数组
```python
arr_1D = np.array([1, 2, 3, 4, 5])
```
## 二维数组
```python
arr_2D = np.array([[1, 2, 3], [4, 5, 6]])
```
## 三维数组
```python
arr_3D = np.array([[[1, 2, 3], [4, 5, 6]], [[7, 8, 9], [10, 11, 12]]])
```
## 全0/1/full数组
```python
arr0 = np.zeros((2, 3))
arr0   #array([[0., 0., 0.],
       #      [0., 0., 0.]])
arr1=np.ones((2, 5))
arr1   #array([[1., 1., 1.],
       #      [1., 1., 1.]])
arr6=np.full((2, 4), 6)
arr6    #array([[6., 6., 6.],
        #      [6., 6., 6.]])
```
## 范围 `arange`
为了创建数字序列，NumPy 提供了 `arange` 函数，它类似于 Python 内置的 `range` 函数，但返回的是一个数组。
	arange(范围)，arange(起始，结束，步长)
```python
np.arange(10, 30, 5)    #array([10, 15, 20, 25])
np.arange(0, 2, 0.3)    #array([0. , 0.3, 0.6, 0.9, 1.2, 1.5, 1.8])
# it accepts float arguments
```
当使用浮点参数时，由于浮点精度有限，通常无法预测得到的元素数量。因此，通常最好使用函数 `linspace` ，该函数接收所需的元素数量作为参数，而不是使用步长：
```python
# 9 numbers from 0 to 2
np.linspace(0, 2, 9)    #array([0.  , 0.25, 0.5 , 0.75, 1.  , 1.25, 1.5 , 1.75, 2.  ])
# useful to evaluate function at lots of points
x = np.linspace(0, 2 * pi, 100)
f = np.sin(x)
```
# 数组属性
- `ndim` ：维度数
- `shape` ：形状
- `size` ：元素的总数
- `dtype`：元素的数据类型
```python
a = np.array([1,2,3,4,5])
#维度数
a.ndim  #2
#形状
a.shape  #(3, 4)
len(a.shape) == a.ndim  #True
#元素的总数
a.size  #12
import math
a.size == math.prod(a.shape)   #True
#元素的数据类型
a.dtype   #dtype('int64')
```
# 索引**和切片**
可以像对 Python 列表进行切片一样，对 NumPy 数组进行索引和切片。
提取数组的一部分或特定元素，以便进行进一步的分析或其他操作，对数组进行子集化、切片和/或索引操作。
**前闭后开**
```python
data = np.array([1, 2, 3])

data[1]     #2
data[0:2]   #array([1, 2])
data[1:]    #array([2, 3])
data[-2:]   #array([2, 3])

#二维
arr = np.array([[1,2,3],[4,5,6]])
arr[1,2]  #np.int64(6)
#或
arr[1][1]   #np.int64(5)

```
![](/uploads/20260901-7551ce.png)
从数组中选择满足特定条件的值
可以使用 `&` 和 `|` 选择满足两个条件的元素
```python
a = np.array([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]])
print(a[a < 5])   #[1 2 3 4]
five_up = (a >= 5)
print(a[five_up])   #[ 5  6  7  8  9 10 11 12]
divisible_by_2 = a[a%2==0]
print(divisible_by_2)   #[ 2  4  6  8 10 12]
c = a[(a > 2) & (a < 11)]
print(c)   #[ 3  4  5  6  7  8  9 10]
```
还可以使用逻辑运算符 **&** 和 **\|** 来返回布尔值，以指定数组中的值是否满足特定条件。这对于包含名称或其他类别值的数组非常有用。
```python
five_up = (a > 5) | (a == 5)
print(five_up)
#[[False False False False]
#[ True  True  True  True]
#[ True  True  True True]]
```
可以使用 `np.nonzero()` 从数组中选择元素或索引。
```python
a = np.array([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]])
b = np.nonzero(a < 5)
print(b)  #(array([0, 0, 0, 0]), array([0, 1, 2, 3]))
```
返回的是一个数组元组：每个维度对应一个数组。第一个数组表示这些值所在的行索引，第二个数组表示这些值所在的列索引。
还可以使用 `np.nonzero()` 来打印数组中小于 5 的元素。
```python
print(a[b])   #[1 2 3 4]
```
如果要查找的元素不存在于数组中，则返回的索引数组将为空。
```python
not_there = np.nonzero(a == 42)
print(not_there)  #(array([], dtype=int64), array([], dtype=int64))
```

# 修改、删除、添加、排序
## 修改
```python
arr = np.array([[1,2,3],[4,5,6]])
arr
#array([[1, 2, 3],
#       [4, 5, 6]])
arr[1][2]=99
arr
#array([[1, 2, 3],
#       [4, 5, 99]])
```
## 删除
要从数组中删除元素，只需使用索引选择要保留的元素即可
## 添加
```python
a = np.array([1, 2, 3, 4])
b = np.array([5, 6, 7, 8])
#可以使用 np.concatenate() 将它们连接起来
np.concatenate((a, b))   #array([1, 2, 3, 4, 5, 6, 7, 8])

x = np.array([[1, 2], [3, 4]])
y = np.array([[5, 6]])
#可以将它们连接起来
np.concatenate((x, y), axis=0)
#array([[1, 2],
#       [3, 4],
#       [5, 6]])
```
## 排序
使用 `np.sort()` 对数组进行排序，调用该函数时，可以指定轴、种类和顺序。
```python
arr = np.array([2, 1, 5, 3, 7, 4, 6, 8])
np.sort(arr)   #array([1, 2, 3, 4, 5, 6, 7, 8])
```
# **重塑数组**
使用 `arr.reshape()` 方法可以改变数组的形状，而不会改变数据本身。
```python
a = np.arange(6)
print(a)   #[0 1 2 3 4 5]

b = a.reshape(3, 2)
print(b)   #[[0 1]
					 #[2 3]
					 #[4 5]]

np.reshape(a, shape=(1, 6), order='C')   #array([[0, 1, 2, 3, 4, 5]])
```
# **现有数据创建数组**
## 切片
```python
a = np.array([1,  2,  3,  4,  5,  6,  7,  8,  9, 10])
arr1 = a[3:8]
arr1    #array([4, 5, 6, 7, 8])   不包括位置 8 本身
```
## 堆叠
```python
a1 = np.array([[1, 1],
               [2, 2]])

a2 = np.array([[3, 3],
               [4, 4]])
#可以用 vstack 将它们垂直堆叠起来
np.vstack((a1, a2))    #array([[1, 1],
#                             [2, 2],
#                             [3, 3],
#                             [4, 4]])
#或者将它们水平堆叠，并用 hstack 分隔
np.hstack((a1, a2))    #array([[1, 1, 3, 3],
#                             [2, 2, 4, 4]])
```
## 分割
可以使用 `hsplit` 将一个数组分割成多个较小的数组，可以指定要返回的等形状数组的数量，也可以指定分割发生的列数。
```python
x = np.arange(1, 25).reshape(2, 12)
x
```
![](/uploads/20260901-43588f.png)
## 视图
使用 `view` 方法创建一个新的数组对象，该对象查看与原始数组相同的数据（浅拷贝）。
- 视图是 NumPy 的一个重要概念！NumPy 函数以及索引和切片等操作都会尽可能返回视图。这可以节省内存并提高速度（无需复制数据）。但是，需要注意的是，修改视图中的数据也会修改原始数组！
```python
a = np.array([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]])
```
通过对 `a` 进行切片来创建一个数组 `b1` ，并修改 `b1` 的第一个元素。这也会修改 `a` 中对应的元素
![](/uploads/20260901-cfebcb.png)
## 复制
使用 `copy` 方法将对数组及其数据进行完整复制（深拷贝）。
```python
b2 = a.copy()
```
# **添加新轴**
**轴（axis）是由外向内嵌套排序的**
比如一维数组轴0是水平x轴；二维数组轴0是竖直y轴，轴1是水平x轴；三维数组轴0是垂直z轴，轴1是竖直y轴，轴2是水平x轴。
## **将一维数组转换为二维数组**
可以使用 `np.newaxis` 和 `np.expand_dims` 来增加现有数组的维度。
使用 `np.newaxis` 会将数组的维度增加一维。这意味着一维数组会变成二维数组，二维数组会变成三维数组，依此类推。
```python
a = np.array([1, 2, 3, 4, 5, 6])
a.shape   #(6,)
#使用 np.newaxis 添加新轴：
a2 = a[np.newaxis, :]
a2.shape    #(1, 6)
#将一维数组显式转换为行向量或列向量：
row_vector = a[np.newaxis, :]
row_vector.shape   #(1, 6)
#对于列向量，可以沿第二个维度插入一个轴：
col_vector = a[:, np.newaxis]
col_vector.shape   #(6, 1)
```
可以通过在指定位置插入新轴 `np.expand_dims` 来扩展数组。
![](/uploads/20260901-df1cb1.png)
# **基本数组操作**
## 加减乘除
![](/uploads/20260901-606dfd.png)
```python
data = np.array([1, 2])
ones = np.ones(2, dtype=int)
#加减乘除
data + ones    #array([2, 3])
data - ones    #array([0, 1])
data * data    #array([1, 4])
data / data    #array([1., 1.])
```
![](/uploads/20260901-0257aa.png)
NumPy 还支持聚合函数。除了 `min` 、 `max` 和 `sum` 之外，您还可以轻松运行 `mean` 来计算平均值， `prod` 来计算元素相乘的结果， `std` 来计算标准差，等等
## 求和
计算数组中所有元素的总和，可以使用 `sum()` 。这适用于一维数组、二维数组以及更高维度的数组。
```python
a = np.array([1, 2, 3, 4])
a.sum()    #10
```
可以使用以下命令对行轴求和:
```python
b = np.array([[1, 1], [2, 2]])
b.sum(axis=0)    #array([3, 3])
```
可以使用以下代码对各列的坐标轴求和：
```python
b.sum(axis=1)    #array([2, 4])
```
## 最值
```python
data = np.array([1, 2, 3])
data.max()   #3
data.min()   #1
data.sum()   #6
```
可以指定要计算聚合函数的轴。例如，您可以通过指定 `axis=0` 来查找每一列中的最小值。
```python
a.min(axis=0)    #array([0.12697628, 0.05093587, 0.26590556, 0.5510652 ])
```
## 平均值、中位数、标准差
mean、median、std
# 广播
需要对数组和单个数字（也称为向量和标量）之间或两个不同大小的数组进行运算。
如：以英里为单位的距离信息，将其转换为公里，可以使用以下方法执行此操作：
```python
data = np.array([1.0, 2.0])
data * 1.6    #array([1.6, 3.2])
```
NumPy 能够识别每个单元格都应该进行乘法运算。这种机制称为广播。广播机制允许 NumPy 对不同形状的数组执行操作。数组的维度必须兼容，例如，两个数组的维度必须相等，或者其中一个数组的维度必须为 1。如果维度不兼容，则会返回 `ValueError`
# 随机数
**`numpy.random`** 模块实现了伪随机数生成器（简称 PRNG 或 RNG），能够从各种概率分布中抽取样本。通常，用户会使用 **`default_rng`** 创建一个 **`Generator`** 实例，并调用其各种方法来获取不同分布的样本。
![](/uploads/20260901-4a258d.png)
![](/uploads/20260901-174ca9.png)
# 唯一值
可以使用 `np.unique` 来打印数组中的唯一值
```python
a = np.array([11, 11, 12, 13, 14, 15, 16, 17, 12, 13, 11, 14, 18, 19, 20])
unique_values = np.unique(a)
print(unique_values)    #[11 12 13 14 15 16 17 18 19 20]
```
要获取 NumPy 数组中唯一值的索引（即数组中唯一值的第一个索引位置的数组），只需传递 `return_index` 即可。 `np.unique()` 中的参数以及你的数组。
```python
unique_values, indices_list = np.unique(a, return_index=True)
print(indices_list)   #[ 0  2  3  4  5  6  7 12 13 14]
```
**二维数组:**
如果没有传递 axis 参数，则二维数组将被展平。
如果要获取唯一行或列，请确保传递 `axis` 参数。要查找唯一行，请指定 `axis=0` 要查找列，请指定 axis=0。 `axis=1` 。
```python
unique_rows = np.unique(a_2d, axis=0)
print(unique_rows)   #[[ 1  2  3  4]
 #                    [ 5  6  7  8]
 #                    [ 9 10 11 12]]
```
# **转置和重塑**
 `reshape` 方法就派上用场了。您只需传入所需的新矩阵维度即可。
![](/uploads/20260901-e02a9b.png)
![](/uploads/20260901-f41e45.png)
# **反转数组**
使用`np.flip()`
二维数组可以使用以下命令反转所有行和所有列的内容：
![](/uploads/20260901-6253f5.png)
![](/uploads/20260901-1099b6.png)
# 扁平化
有两种常用的方法来扁平化数组： `.flatten()` 和 `.ravel()` 。 两者之间的主要区别在于，使用以下方法创建的新数组： `ravel()` 实际上指向父数组（即“视图”）的引用。这意味着对新数组的任何更改都会影响父数组。由于 `ravel` 不会创建副本，因此它非常节省内存。
![](/uploads/20260901-b9be33.png)
