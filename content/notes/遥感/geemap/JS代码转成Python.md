---
title: "JS代码转成Python"
date: "2026-02-06"
category: "遥感"
chapter: "geemap"
---

# JS代码转成Python

> **分类**：GIS / GEEMAP

> **最后修改时间**：2026-02-06 09:32:13.204

---

## 控件，转换工具
![](/uploads/20260901-743fb0.png)
## 代码
```python
snippet = """
#javascript代码
"""
geemap.js_snippet_to_py(snippet, add_new_cell=True, import_ee=False)
```
![](/uploads/20260901-f57b90.png)
### 批量转换
![](/uploads/20260901-f3e9a3.png)
