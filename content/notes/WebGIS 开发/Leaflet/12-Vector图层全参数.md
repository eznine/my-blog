---
title: "第 12 节 · Vector 图层全参数"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Leaflet"
order: 41
tags: ["web","leaflet"]
---




# 第 12 节 · Vector 图层全参数

> 📌 **版本信息**：Leaflet 1.9.4（2026-08-29 核对）
> 📚 来源：[Leaflet Path / Polyline / Polygon / CircleMarker 参考](https://leafletjs.com/reference.html#path)
> 📖 定位：**参数手册**——阶段二手册型文档，与第 13 节（控件）、API 速查一起构成"离线字典"。

## 一、Path 公共选项（所有矢量继承）

```js
{
  stroke: true,            // 是否描边
  color: '#3388ff',        // 描边色
  weight: 3,               // 描边宽(px)
  opacity: 1.0,
  lineCap: 'round',        // 线端帽：butt/round/square
  lineJoin: 'round',       // 转角连接：miter/round/bevel
  dashArray: '8, 8',       // 虚线模式（如 '10, 5, 2, 5' 点划线——测量线/规划线的经典样式）
  dashOffset: '0',
  fill: true,              // 是否填充（Polygon 默认 true，Polyline 默认 false）
  fillColor: 同 color,
  fillOpacity: 0.2,
  fillRule: 'evenodd',     // 填充规则（带洞多边形的洞识别相关）
  smoothFactor: 1.0,       // 抽稀程度：越大越平滑省点（缩小显示时降低渲染点数，≥1 良好）
  noClip: false,           // 是否裁剪到视口（false=裁剪省渲染；true=超出视口的线完整绘制）
  interactive: true,       // 是否响应交互
  bubblingMouseEvents: true, // 事件是否冒泡到地图（模块 02 第 15 节：Leaflet 实际是独立体系）
  renderer: 自定义渲染器,
  className: '',           // SVG 渲染时挂的 CSS 类
}
```

**高频组合**：

```js
// 测量线（虚线高亮）
{ color: '#ff4d4f', weight: 3, dashArray: '8 6' }
// 专题填充面
{ color: '#666', weight: 1, fillColor: '#1677ff', fillOpacity: 0.45 }
// 透明命中区（看得见的细线 + 好点的大热区：双线叠加技巧）
L.polyline(coords, { weight: 1 }).addTo(map);                        // 可见的
L.polyline(coords, { weight: 14, opacity: 0 }).addTo(map)            // 透明粗线负责点击
  .on('click', handler);
```

---

## 二、各图层的专属参数与构造

```js
// Polyline
L.polyline(latlngs, { smoothFactor: 1, noClip: false });
polyline.getLatLngs();            // 读顶点（嵌套时注意多环）
polyline.setLatLngs(新顶点);       // 整体替换
polyline.addLatLng([lat, lng]);   // 追加一点（轨迹实时追加的标准 API！）

// Polygon：比 Polyline 多自动闭合
L.polygon(latlngs, { fillRule: 'evenodd' });   // 带洞：[[外环],[内洞环]]
polygon.toGeoJSON();                            // 一键转 GeoJSON（导出功能的底座）

// Rectangle：对角两点快速建面
L.rectangle([[minLat, minLng], [maxLat, maxLng]], { color: '#ff7800', weight: 1 });
rectangle.setBounds([[...],[...]]);             // 框选功能的落点

// Circle：圆（单位米，随缩放视觉大小变化——地理真圆）
L.circle([lat, lng], { radius: 500, ...pathOptions });   // 半径 500 米
circle.setRadius(800);

// CircleMarker：像素圆（屏幕大小恒定——地震点/散点图标配！）
L.circleMarker([lat, lng], { radius: 6, ... });          // radius 单位是像素
// ⚠️ Circle(米) vs CircleMarker(像素) 是最高频混淆：半径语义完全不同
```

**实用工具方法**（Path 通用）：

```js
layer.getBounds();          // LatLngBounds（fitBounds/判断相交）
layer.isEmpty();
layer.setStyle({...});      // 动态改样式（悬停高亮/状态变化）
layer.toGeoJSON();          // 导出
layer.bringToFront();       // 置顶/置底（渲染顺序微调）
layer.bringToBack();
```

---

## 三、选型速查

| 需求 | 用什么 |
|---|---|
| 轨迹/河流/路线 | Polyline（+ dashArray 做规划线） |
| 区域/行政区/地块 | Polygon（fillOpacity 0.2~0.5） |
| 框选范围 | Rectangle |
| 半径圈（地理意义） | Circle（米） |
| 数据点标记（数量级大） | CircleMarker（px）+ preferCanvas |
| 实时追加轨迹 | Polyline.addLatLng |

---

## 四、自测题

1. Circle 与 CircleMarker 的本质区别？
2. dashArray 的值格式？举一个测量场景样式？
3. addLatLng 的典型用途？
4. 带洞多边形怎么构造？fillRule 影响？
5. "细线好点难"的交互热区技巧？

### 参考答案

1. Circle 半径是米（地理真圆，随缩放视觉变大变小）；CircleMarker 半径是像素（屏幕恒定）。
2. 逗号分隔的"线段长,间隙长"循环序列；如测量线 `{color:'#ff4d4f', dashArray:'8 6'}`。
3. 轨迹实时追加（GPS 上报一个点追加一个点，不重设全部顶点）。
4. 第二个环作为内洞（`[外环, 内洞]`）；fillRule: 'evenodd' 保证洞被正确镂空。
5. 叠加一条透明的粗线/粗面专门负责命中（opacity: 0 + weight 大）。

---

## 五、下一步

矢量参数齐 → **第 13 节：控件全解与 API 速查手册**——模块 05 收官。
