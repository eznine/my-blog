---
title: "第 05 节 · GeoJSON 图层（数据上地图）"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "Leaflet"
order: 21
tags: ["web","leaflet"]
---




# 第 05 节 · GeoJSON 图层（数据上地图）

> 📌 **版本信息**：Leaflet 1.9.4（2026-08-29 核对）
> 📚 来源：[Leaflet GeoJSON 教程](https://leafletjs.com/examples/geojson/) ｜ [RFC 7946](https://www.rfc-editor.org/rfc/rfc7946) ｜ 数据：[DataV GeoAtlas](https://datav.aliyun.com/portal/school/atlas/area_selector)（全国/省界 GeoJSON，CORS 开放）、[USGS GeoJSON Feed](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php)
> 🎯 **本模块含金量最高的一节**：前面是"往地图上摆东西"，这节开始是"把数据变成地图"。

## 一、这一节的目标

1. 精通 `L.geoJSON()` 的三大回调：style / pointToLayer / onEachFeature
2. 掌握"数据驱动渲染"完整模式：fetch GeoJSON → 样式映射 → 交互绑定
3. 理解 filter 过滤与 GeoJSON 图层的更新（setData）
4. 完成"省界 + 实时地震"双数据渲染

---

## 二、L.geoJSON 三大回调（本节的全部精髓）

```js
const layer = L.geoJSON(geojsonData, {
  // ① style：Vector 图层（线/面）的样式——每个要素调用一次
  //    函数参数是 feature → 可以按属性决定样式（专题图的根基！）
  style(feature) {
    return {
      color: '#1677ff',        // 线色/面边框
      weight: 2,               // 线宽
      fillOpacity: 0.1,        // 填充透明度
      // 按属性映射：人口越多填充越深（分级统计图的雏形，第 13 节正式做成专题）
      fillColor: feature.properties.value > 100 ? '#ff4d4f' : '#1677ff',
      fillOpacity: 0.4,
    };
  },

  // ② pointToLayer：Point 要素怎么渲染（默认是普通 marker）——换成圆/自定义图标
  pointToLayer(feature, latlng) {
    const mag = feature.properties.mag;
    return L.circleMarker(latlng, {       // 圆点标记（地震图标配）
      radius: 4 + mag * 1.5,              // 半径随震级
      fillColor: mag >= 5 ? '#ff4d4f' : '#faad14',
      color: '#fff', weight: 1, fillOpacity: 0.9,
    });
  },

  // ③ onEachFeature：每个要素绑交互（点击/悬停/弹窗）——要素级事件的标准位置
  onEachFeature(feature, layer) {
    const p = feature.properties;
    layer.bindPopup(`<b>${p.place}</b> M${p.mag}`);
    layer.on('mouseover', () => layer.setStyle({ weight: 4 }));
    layer.on('mouseout', () => layer.setStyle({ weight: 2 }));   // 悬停高亮：setStyle 即时生效
    layer.bindTooltip(p.name, { direction: 'top' });
  },

  // ④ filter：只要一部分要素
  filter: (feature) => feature.properties.mag >= 3,
});
layer.addTo(map);
```

**心智模型**：`L.geoJSON(数据, 配置)` = "声明式地把 GeoJSON 变成图层"。三大回调分别接管**样式、点形态、交互**——数据不变回调不变，换数据就重建图层。

---

## 三、数据驱动渲染的完整模式（真实项目流程）

```js
// ① fetch 远端 GeoJSON（模块 02 的技能）
const res = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json');  // 全国省界
const provinces = await res.json();        // DataV 出厂即 4326 GeoJSON（CORS 开放）

const quakesRes = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
const quakes = await quakesRes.json();     // USGS 当日地震（CORS 开放）

// ② 各自渲染成图层（省界：细边框面；地震：circleMarker）
const provinceLayer = L.geoJSON(provinces, { style: {...}, onEachFeature: {...} }).addTo(map);
const quakeLayer = L.geoJSON(quakes, { pointToLayer: {...} }).addTo(map);

// ③ 更新 = 重建或 setData（第 13 节"数据变了就重画"的 Leaflet 版）
quakeLayer.clearLayers().addData(newData);   // 原地更新（保留图层引用/事件）
// 或干脆 map.removeLayer(old); L.geoJSON(new).addTo(map);  （简单粗暴版）
```

---

## 四、动手跟练：05 · 省界 + 地震点渲染

配套文件：`05-leaflet/examples/05-省界+地震点渲染.html`（需联网；两个数据源都开放 CORS，直接 fetch）

**步骤：**

1. 底图 + 全国省界 GeoJSON（DataV）渲染：浅色填充 + 悬停高亮 + 点击弹省名
2. 叠加 USGS 当日地震：circleMarker 半径随震级、颜色分级（<4 黄 / ≥5 红）、Popup 详情（含"xx 小时前"——dayjs 可选）
3. 完成 6 个 TODO：省界悬停高亮（setStyle/setStyle 恢复——注意存原始样式）、点击省弹出省名与"adcode"、地震按时间过滤按钮（重建图层）、数据加载失败兜底（catch + 界面提示）、图层顺序（quakeLayer 在上——pane 概念预告第 07 节）、用一个 select 切换"全部/仅 M5+"（filter 重建）
4. 体验时刻：**打开这个页面 = 一张"中国行政区划 + 全球当日地震"专题地图**——你已经做出真实产品级的东西了

**通关标准：**

- [ ] 三大回调全部亲手实现
- [ ] 两个真实数据源 fetch 渲染成功
- [ ] 过滤重建与加载兜底齐备

---

## 五、自测题

1. 三大回调分别接管什么？每个的调用时机？
2. pointToLayer 不配时 Point 渲染成什么？
3. 悬停高亮的实现模式（含恢复）？
4. 图层更新的两种方式与取舍？
5. DataV GeoAtlas 与 USGS 两个数据源在坐标系与格式上的共同点？

### 参考答案

1. style=线面样式（每要素调用）；pointToLayer=点的渲染形态；onEachFeature=交互绑定。都在图层创建/每要素处理时调用。
2. 默认普通 marker（蓝水滴）。
3. mouseover 里 setStyle 高亮，mouseout 恢复（恢复值要么写死要么提前存 layer.options 原样式）。
4. clearLayers()+addData 原地更新（保留引用与绑定）；removeLayer+新建（简单粗暴）。交互频繁选前者。
5. 都是 WGS84 标准 GeoJSON 且开放 CORS——"交换格式用 4326 GeoJSON"的直接受益者。

---

## 六、下一步

数据上地图了 → **第 06 节：事件与交互**，把"用户的每一次点击"系统化。
