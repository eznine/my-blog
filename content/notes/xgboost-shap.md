---
title: "XGBoost + SHAP：地理问题的可解释机器学习工作流"
date: 2026-08-12
category: 编程
tags: [XGBoost, SHAP, 机器学习, 可解释性]
summary: "用 XGBoost 建模地理因变量时如何避免精度虚高、如何用 SHAP 把'黑箱'翻译成地理语言，附完整 Python 代码。"
---

在地理研究里，机器学习常被当黑箱用——精度很高但讲不出机理。XGBoost + SHAP 的组合能把"哪些因素、怎样影响"讲清楚，这篇笔记整理成可复用的工作流。

## 第一步：把数据泄漏堵住

地理数据带空间自相关，随机 train_test_split 会把相邻样本同时切进训练集和测试集，精度虚高。**必须按空间划分**：

```python
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

df = pd.read_csv("subsidence_drivers.csv")

# 用格网单元做分组，同一单元的样本不跨集
df["grid_id"] = (np.round(df.lon / 0.1).astype(str) + "_" +
                 np.round(df.lat / 0.1).astype(str))

gkf = GroupKFold(n_splits=5)
splits = gkf.split(df.drop(columns="subsidence_rate"),
                   df["subsidence_rate"], groups=df["grid_id"])
```

## 第二步：XGBoost 训练

```python
import xgboost as xgb

features = ["groundwater", "building_density", "coal_mining_dist",
            "fault_dist", "loess_thickness", "slope", "ndvi"]

model = xgb.XGBRegressor(
    n_estimators=800, learning_rate=0.03, max_depth=6,
    subsample=0.8, colsample_bytree=0.8,
    early_stopping_rounds=50, eval_metric="rmse",
)
model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
```

调参用 Optuna 搜 100 次左右即可，别把精力全花在刷分上——地理研究里 0.02 的 R² 提升不如一个干净的 SHAP 分析。

## 第三步：SHAP 解释

```python
import shap

explainer = shap.TreeExplainer(model)
shap_values = explainer(X_test)

# 全局重要性
shap.plots.bar(shap_values, max_display=10)

# 单因素依赖图：非线性关系一目了然
shap.plots.scatter(shap_values[:, "groundwater"], color=shap_values)
```

## 把 SHAP 说成地理语言

三个层次的解读模板：

1. **全局（bar 图）**：「地下水开采强度是研究区地表形变的首要驱动因子，贡献占比 42%」；
2. **依赖（scatter 图）**：「形变速率随地下水开采强度增加而增大，且在开采量超过 X 后出现阈值效应」；
3. **空间化**：把每个样本的 SHAP 值映射回点位做地图，得到"驱动机制空间分异图"——这是论文里最出彩的一张。

## 注意事项

- SHAP 解释的是**相关性结构**，不能直接宣称因果；
- 特征共线性强时（如坡度与高程），重要性会被分摊，先看相关矩阵；
- 报告精度时同时给出随机划分与空间划分两组结果，差异大恰恰说明模型学到了空间结构而非机理。
