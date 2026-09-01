---
title: "第 24 节 · API Routes 与部署"
date: "2026-09-01"
category: "WebGIS 开发"
chapter: "React-Next"
tags: ["web"]
---

# 第 24 节 · API Routes 与部署

> 📌 **版本信息**：Next.js 15.x Route Handlers / Vercel（2026-08-29 核对）
> 📚 来源：[Next.js · Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) ｜ [Deploying](https://nextjs.org/docs/app/building-your-application/deploying)
> ▶️ 配套练习：`examples/24-全栈小demo/`

## 一、这一节的目标

1. 掌握 Route Handler：在 Next 项目里写自己的后端接口（`route.js`）
2. 完成一个"前后端同仓"的全栈小 demo（GET/POST）
3. 掌握两条部署路线：Vercel 一键 / 自托管（`next start` 或 Docker）
4. 明确 Route Handler 的定位边界（与 FastAPI 的分工）

---

## 二、Route Handler：文件即接口

```js
// app/api/notes/route.js —— 注意文件名必须是 route.js（不是 page.js）
// GET /api/notes
import { NextResponse } from 'next/server';

const notes = [];   // 演示用内存存储（真实项目接数据库）

export async function GET() {
  return NextResponse.json({ code: 0, data: notes });
}

// POST /api/notes
export async function POST(request) {
  const body = await request.json();
  if (!body.text) {
    return NextResponse.json({ code: 1, msg: 'text 必填' }, { status: 400 });
  }
  const note = { id: crypto.randomUUID(), text: body.text, time: Date.now() };
  notes.push(note);
  return NextResponse.json({ code: 0, data: note }, { status: 201 });
}

// 动态接口：app/api/notes/[id]/route.js → export async function GET(req, { params })
```

**定位边界（重要）**：Route Handler 是"轻后端"——适合 BFF（给前端聚合/中转数据、藏密钥调第三方）、小型全栈（博客评论）。**复杂业务、事务、空间查询 → 主力后端 FastAPI**（第 13 模块），Next 只当消费方。分工清晰才不乱。

---

## 三、部署两条路

| 路线 | 命令 | 适合 | 说明 |
|---|---|---|---|
| **Vercel**（Next 母公司） | `npm i -g vercel && vercel` | 官网/博客/演示 | Git push 自动部署、全球 CDN、免费额度；Serverless 函数跑 Route Handler |
| **自托管** | `npm run build && npm start`（端口 3000）或 Docker | 国内访问/企业内网 | 需要 Node 常驻服务器；Nginx 反代（m18 实战） |

自托管 Docker 要点：`output: 'standalone'`（next.config）产出最小化独立包 → Dockerfile 多阶段构建（第 08 模块 m18 的 Dockerfile 全解会细讲）。

---

## 四、动手跟练：24 · 全栈小 demo

配套文件夹：`24-全栈小demo/`（`npm i && npm run dev`；前后端同仓）

**步骤：**

1. 结构：`app/api/notes/route.js`（后端接口）+ `app/page.js`（前端：读取与发布留言）
2. 完成 5 个 TODO：前端 fetch 自己的 `/api/notes`（注意客户端组件）、POST 提交留言并刷新列表、400 错误的前端提示、按 time 倒序显示、加 DELETE `/api/notes/[id]` 动态接口与前端删除按钮
3. 部署实验（选做）：Vercel 部署；或 `npm run build && npm start` 看生产模式
4. 观察思考：留言存内存，`npm restart` 后全没——这正是"Route Handler 定位边界"的活教材，写在注释里

**通关标准：**

- [ ] 增查（+删）全通，`/api/notes` 可直接在浏览器访问出 JSON
- [ ] 能说出 Route Handler 的定位（轻后端/BFF）与 FastAPI 的分工
- [ ] 能描述两条部署路线的取舍

---

## 五、自测题

1. route.js 与 page.js 的区别？
2. POST 里怎么读请求体与返回 JSON？
3. Route Handler 适合什么、不适合什么？
4. Vercel 部署的函数形态是什么（对国内访问意味着什么）？
5. 自托管生产模式需要哪两个命令？

### 参考答案

1. route.js 定义接口（返回数据）；page.js 定义页面（返回 UI）；同文件夹二者只能取一。
2. `const body = await request.json()`；`NextResponse.json(data, { status })`。
3. 适合 BFF/藏密钥中转/小型全栈；不适合重业务/事务/复杂空间计算（那是 FastAPI 的活）。
4. Serverless 函数（按次冷启动）；国内访问速度不稳，企业站要自托管或国内云。
5. `npm run build`（构建）+ `npm start`（起 Node 服务）。

---

## 六、下一步

Next 阶段一（19~24）完成 → **第 25 节：渲染策略全解**（阶段二），SSG/ISR/SSR/流式的终极辨析。
