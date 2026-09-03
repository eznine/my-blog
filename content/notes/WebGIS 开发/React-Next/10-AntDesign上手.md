---
title: "第 10 节 · 组件库 Ant Design 上手"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "React-Next"
order: 34
tags: ["web"]
---









# 第 10 节 · 组件库 Ant Design 上手

> 📌 **版本信息**：Ant Design 5.x（2026-08-29 核对；v5 起 CSS-in-JS 主题化，v4 的 less 定制方式已过时）
> 📚 来源：[Ant Design 官网](https://ant.design/index-cn) ｜ [快速开始](https://ant.design/docs/react/getting-started-cn)

## 一、这一节的目标

1. 理解组件库的价值：UI 件的"拿来主义"（你的路线就是"AI 写你读 + 现成组件"）
2. 装上 AntD 并完成中文/locale 配置
3. 掌握本课程高频 8 个组件：Layout / Table / Form / Input.Select / Button / Modal / message / Statistic
4. 把第 09 节拆好的地震面板"AntD 化"——体会专业 UI 组件与手搓的差距

---

## 二、组件库为什么是"正解"

从第 10 节（Tailwind 组件化）的结论延伸：**重复 → 提取组件**。表格排序、分页、弹窗、表单校验、消息提示……这些每一处都有大量细节（无障碍、边界、交互态），自己搓要花掉 80% 时间却只有 20% 的差异化价值。**业务才是你的差异点**——所以 UI 用现成组件库，脑力留给 GIS 功能。

**为什么选 AntD**：国内生态最强、文档中文、表格/表单能力顶级；GIS 行业项目大量使用（超图/Mars3D 的官方示例界面就是 AntD 风格）。

---

## 三、接入（Vite + React）

```bash
npm install antd
```

```jsx
// main.jsx：ConfigProvider 提供中文语言包（组件内置文案默认英文）
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

<ConfigProvider locale={zhCN}>
  <App />
</ConfigProvider>
```

> 💡 AntD v5 组件样式按需自动加载，无需额外配置。主题定制走 `ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}`（改品牌色一处生效——第 30 节 CSS 变量思想的组件库版）。

---

## 四、高频 8 组件速览（每个都有"最短可用代码"）

```jsx
// ① Layout：管理系统的"骨架"（顶栏+侧栏+内容）
<Layout><Sider>侧栏</Sider><Layout><Header/><Content/></Layout></Layout>

// ② Table：数据表格——排序/分页/自适应全内置（GIS 数据面板主角）
<Table
  columns={[
    { title: '地点', dataIndex: 'place' },
    { title: '震级', dataIndex: 'mag', sorter: (a, b) => a.mag - b.mag },  // 点击表头即排序！
  ]}
  dataSource={quakes}
  rowKey="id"
  pagination={{ pageSize: 10 }}
/>

// ③ Form：表单容器——声明式字段 + 校验 + 取值
<Form onFinish={handleSubmit} initialValues={{ minMag: 0 }}>
  <Form.Item name="place" label="地点" rules={[{ required: true, message: '必填' }]}>
    <Input />
  </Form.Item>
  <Button type="primary" htmlType="submit">提交</Button>
</Form>
// 提交时 onFinish(values) 直接拿到全部字段值——不用手动维护受控 state！

// ④ Input / ⑤ Select：配合 Form.Item 用
// ⑥ Button：type="primary|default|link|text"，danger 属性标危险操作
// ⑦ Modal：对话框
<Modal open={open} onOk={handleOk} onCancel={() => setOpen(false)} title="详情">
  <p>{detail}</p>
</Modal>

// ⑧ message / Statistic：轻提示与统计数字
message.success('已保存');
<Statistic title="平均震级" value={avg.toFixed(2)} />
```

**学习方式**：AntD 有几百个组件——**按需查文档**，不要通读。本节的 8 个覆盖了 C-03a/C-06/W 系列的 90% 界面需求。

---

## 五、动手跟练：10 · AntD 改造列表页

配套文件夹：`03-react-nextjs/examples/10-AntD改造列表页/`（依赖里已加 antd，`npm i && npm run dev`）

**步骤：**

1. 对照读：左右两个 Tab——"手搓版"（第 09 节拆好的组件）与 "AntD 版"（同一功能、AntD 组件实现）
2. 重点对比：Table 的内置排序分页 vs 手写的 40 行；Form 校验 vs 手写 if；message vs 手写 toast
3. 完成 5 个 TODO：给 Table 加"深度"列并支持排序、Table 行点击打开 Modal 详情、Form 加日期范围校验、message 操作反馈、主题 token 换品牌色
4. 思考题：AntD Table 的 dataSource 要求"引用变化才重渲染"——和你第 03 节学的不可变更新是什么关系？

**通关标准：**

- [ ] AntD 版功能 ≥ 手搓版（排序/分页/校验/反馈全齐）
- [ ] 8 个高频组件都亲手用过一次
- [ ] 能说出"组件库省的是什么、不能替你做的是什么"

---

## 六、自测题

1. AntD v5 的主题定制入口？改主色的配置项？
2. Table 点击表头排序需要自己写排序逻辑吗？
3. Form 的 onFinish 拿到什么？相比手动受控省了什么？
4. message 和 Modal 的适用场景区别？
5. 为什么说"UI 用组件库、脑力留给业务"？

### 参考答案

1. ConfigProvider 的 theme prop；token.colorPrimary（还有 borderRadius 等设计令牌）。
2. 不用——给 column 配 sorter 函数即可，Table 内部处理状态与动画。
3. 拿到全部字段值对象；省掉了每字段的 value/onChange 受控样板与手写校验。
4. message 轻量提示不打断（操作反馈）；Modal 阻断式对话框（需要用户决策/展示详情）。
5. 省的是无差异化的通用 UI 工程（表格/表单/弹窗细节）；不能替的是业务逻辑与 GIS 功能——你的价值所在。

---

## 七、下一步

装备齐了 → **第 11 节：React 生态地图**，认识 axios/Zustand 等高频邻居，然后你就可以独立开工 **C-03a 城市信息小站**。
