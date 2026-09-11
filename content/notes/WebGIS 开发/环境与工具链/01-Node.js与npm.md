---
title: "第 01 节 · Node.js 与 npm"
date: "2026-09-06"
category: "WebGIS 开发"
chapter: "环境与工具"
order: 101
tags: ["node","npm"]
code: "/code/01-check-env.js"
codeLabel: "01-check-env.js · 环境检查"
---




# 第 01 节 · Node.js 与 npm

> 📌 版本信息：基于 Node.js **v24 LTS**（2026-09-05 核对，最新补丁 24.20.0，官方支持至 2028-04）· npm 11.x（Node 24 自带）/ 12.0.2（官方最新）· pnpm 11.25 / 12.3
> 📚 来源：[Node.js 官方发布页](https://nodejs.org/en/about/previous-releases) ｜ [npm 官方文档](https://docs.npmjs.com/) ｜ [pnpm 安装文档](https://pnpm.io/installation) ｜ [npmmirror](https://npmmirror.com/)
> 🖥️ 本机实测：Node v24.14.0 · npm 11.9.0。下面的输出以本机为准，具体版本号不同不影响学习。

## 一、从一行报错说起

假设从 GitHub 上拿到一个"React + Leaflet 旅行足迹地图"项目。作者在 README 里写了两句话：`npm install` 安装依赖，`npm run dev` 启动开发服务器。按说明执行，终端却回了一句：

```text
'npm' 不是内部或外部命令，也不是可运行的程序或批处理文件。
```

更常见的情况是：照着 Vite 官网复制官方创建命令 `npm create vite@latest`，结果同样跑不起来。

此时缺的不是代码，而是两个"地基工具"：

- **Node.js**：让 JavaScript 程序能在电脑和服务器上直接运行的"运行时"（runtime）
- **npm**：Node.js 自带的"包管理器"，负责下载、安装、管理别人写好的 JS 库

为什么说它们是地基？因为后面整个 WebGIS 路线里的工具链，本质都是 Node 程序或 npm 包：

| 工具 | 是什么 | 本质 |
|---|---|---|
| Vite | 开发服务器 + 打包器 | 一个 Node 程序 |
| React | 界面库 | 一个 npm 包 |
| Leaflet / OpenLayers | 地图库 | npm 包 |
| Cesium / deck.gl | 三维 / 大数据可视化 | npm 包 |
| ESLint / Prettier | 代码检查与格式化 | npm 包 |

所以这一节不是"装个软件"这么简单：**装好 Node.js，等于给电脑装上整条前端工具链的运行时。**

## 二、这一节讲什么，学完能做什么

这一节解决"第一次打开终端时两眼一抹黑"的问题：先搞清楚 Node.js 和 npm 到底各管什么事，然后在 Windows 上把它们装好、配好，最后跑通第一个 Node 程序。

学完本节，应该能做到：

1. 用自己的话说清楚 Node.js、npm、`package.json` 三者的分工
2. 在 Windows 上安装 Node.js LTS，并验证 `node -v` / `npm -v` 成功
3. 配置国内镜像源，让 `npm install` 不再因为网络卡死
4. 看懂 `package.json` 的常用字段，以及 `^1.9.4` 这类版本号的含义
5. 熟练敲出 `npm install`、`npm run dev` 等常用命令
6. 运行并读懂配套的 `01-check-env.js` 环境检查脚本

一句话验收：**拿到任何 JS/前端项目，知道第一步该做什么，并且能解释为什么。**

## 三、核心概念

### 3.1 Node.js：给 JavaScript 盖一栋"普通房子"

JavaScript 原本是浏览器里的语言。浏览器像一个**玻璃房**：JS 能在这个房间里干活，但边界很清楚——它主要能操作页面、发网络请求，不能随便读写电脑上的文件。

2009 年 Node.js 出现，等于给 JS 盖了一栋**普通房子**：它把 V8 引擎（Chrome 的 JS 引擎）从浏览器里搬出来，配上文件系统、网络、进程等能力，让 JS 能脱离浏览器运行。

```text
2009 年之前：JS 只能活在浏览器里（玻璃房）
2009 年 Node.js 出现：JS 有了自己的运行环境（普通房子）
今天：前端工具链几乎全部跑在 Node 之上
```

也许有人会问："不写后端，只做地图页面，为什么要装它？"答案在第一节的表格里：Vite、ESLint、打包器这些**开发工具**本身就是 Node 程序。浏览器是最终跑页面代码的地方，但"把代码变成页面"的整条流水线，跑在 Node 上。

> 💡 顺带说清：Node.js 也能写后端（Express、NestJS 等）。本学习计划的后端主线定的是 Python/FastAPI，但要清楚这条路存在——很多纯前端团队的全栈就是 Node（后面会讲这个生态）。

**类似的运行时**：Bun、Deno 是近年出现的替代品，更快、体验更现代，但生态和行业默认仍是 Node。学习阶段选 Node，因为它是最低风险的公约数。

### 3.2 npm：JS 世界的"应用商店 + 依赖账本"

npm 有两个身份：

- **应用商店**：npmjs.com 上有几百万个包，别人写好的 Leaflet、dayjs、axios，一条命令就能装进来，不用自己造轮子。
- **依赖账本**：项目用了哪些包、什么版本，全记在 `package.json` 里。别人拿到项目，照着账本一条命令就能把所有依赖装齐。

类比开餐厅：不需要自己养牛种菜（每个功能都自己写），去超市（npm 仓库）采购；采购清单贴在墙上（`package.json`），任何接手的人照着清单补货就行；而 `package-lock.json` 是更精确的"本次采购订单"，后面会讲。

**类似工具**：pnpm、yarn 和 npm 干的是同一件事（都是包管理器），账本格式相同，只是安装策略和速度不同。pnpm 通过硬链接共享包，速度更快、更省磁盘；本课程默认用 npm，原因很简单：**Node 自带、教程统一、减少变量**。pnpm 认识即可，以后在真实项目里看到能看懂。

### 3.3 package.json 与 package-lock.json：账本与订单

| 文件 | 角色 | 谁维护 | 要不要提交 Git |
|---|---|---|---|
| `package.json` | 人看的"采购清单 + 项目身份证" | 手动改或 `npm install` 自动更新 | ✅ 提交 |
| `package-lock.json` | 机器生成的"精确订单" | npm 自动生成，别手动改 | ✅ 提交 |
| `node_modules/` | 实际下载的"货物" | npm 自动生成 | ❌ 绝不提交 |

`package-lock.json` 的意义在于：`^1.9.4` 这类范围写法允许版本浮动，而 lock 文件把每一层依赖的精确版本都锁死。这样"一台电脑上能跑，另一台也能跑"——团队协作和部署全靠它。

### 3.4 版本号：主版本.次版本.修订号

npm 的版本遵循**语义化版本**（Semantic Versioning），格式是 `主版本.次版本.修订号`：

- `1.9.4` 里，`1` 是主版本，`9` 是次版本，`4` 是修订号
- 主版本变化 = 可能有破坏性改动（升级要小心）
- 次版本变化 = 新增功能，向后兼容
- 修订号变化 = 修 bug，向后兼容

写依赖时常见的三种写法：

| 写法 | 含义 | 允许装到的范围 |
|---|---|---|
| `^1.9.4` | 允许次版本内升级 | `1.9.4 <= x < 2.0.0` |
| `~1.9.4` | 只允许补丁级升级 | `1.9.4 <= x < 1.10.0` |
| `1.9.4` | 锁死 | 只有 `1.9.4` |

> 💡 行业默认用 `^`：既不吃破坏性改动，又能吃到小版本修复。

### 3.5 LTS 与 Current：为什么行业默认选 LTS

打开 nodejs.org 会看到两个版本按钮：

- **LTS（Long Term Support，长期支持版）**：官方承诺多年维护，修 bug、修安全漏洞，是整个行业的"公约数" ← 选这个
- **Current（尝鲜版）**：最新功能，但工具链生态需要时间适配，风险更高

为什么不选最新？因为 Vite 插件、各种 npm 包往往跟着 LTS 验证。

## 四、Windows 安装、配置与常用命令

### 第一步：下载并安装 Node.js LTS

打开 [https://nodejs.org/zh-cn](https://nodejs.org/zh-cn)，下载 `node-v24.x-x64.msi`（写作时是 24.20.0），双击后**一路下一步**即可。唯一要注意的是安装界面默认勾选的 **"Add to PATH" 不要取消**。

为什么 PATH 这么关键？PATH 是系统找命令的"通讯录"。敲 `node` 时，Windows 按 PATH 里登记的目录逐个找 `node.exe`；取消勾选，就等于命令有了但通讯录里没登记，终端永远找不到它。

### 第二步：验证安装

安装完成后**新开一个终端**（`Win + R` → 输入 `cmd` 回车），执行：

```bash
node -v
# 预期输出类似：v24.14.0（装到 24.20.0 也正常）

npm -v
# 预期输出类似：11.9.0（Node 24 自带 npm 11.x）
```

两条命令都能出版本号，安装成功。

> ⚠️ 第一次装完就在旧终端敲 `node -v`，系统说"不是内部或外部命令"。不是装坏了，是**环境变量只对之后新开的终端生效**，关掉旧窗口重开一次就好了。

### 第三步：配置国内镜像源

npm 的官方仓库服务器在国外，国内直连经常卡在 `fetch metadata`。把下载源换成国内同步镜像（npmmirror，原淘宝镜像）：

```bash
npm config set registry https://registry.npmmirror.com
```

验证是否生效：

```bash
npm config get registry
# 预期输出：https://registry.npmmirror.com/
```

这个配置只改"从哪下载"，不影响任何功能和版本语义。以后如果要发布开源包，再切回官方源：

```bash
npm config set registry https://registry.npmjs.org
```

现阶段不用管发布这件事，配好镜像即可。

### 第四步：常用 npm 命令

```bash
# ① 创建项目账本：在当前目录生成 package.json
npm init -y
# -y 表示全部用默认值，不一个个提问；生成后可以手动改字段

# ② 安装生产依赖（项目运行时真正需要的库）
npm install leaflet
# 简写：npm i leaflet
# 效果：下载 leaflet → 写进 dependencies → 生成 node_modules/ 和 package-lock.json

# ③ 安装开发依赖（只在开发/构建时用的工具）
npm install -D vite
# 简写：npm i -D vite；-D = --save-dev

# ④ 照着账本一次性装齐所有依赖（拿到别人项目后第一件事）
npm install

# ⑤ 运行 scripts 里定义的命令
npm run dev
# 等价于执行 package.json 里 scripts.dev 的值（比如 vite），没有可以直接加
# 特例：npm start 可以省掉 run，等价于 npm run start

# ⑥ 卸载某个包
npm uninstall leaflet

# ⑦ 临时执行一个包的命令而不装进项目
npx create-vite@latest my-app
# npx 用完即走，适合一次性脚手架；create-vite 的 @latest 表示用最新版
```

每条命令背后的逻辑都是同一个模型：**npm 先读账本，再操作货物，最后更新账本**。`npm install leaflet` 是"进货并登记"；`npm install` 是"照着账本把货补齐"；`npm run dev` 是"从账本里取出 dev 这条命令去执行"。

### node_modules：可以随时删的"货物"

`npm install` 后出现的 `node_modules/` 是依赖包的实际代码，它的脾气是：

1. **巨大**：几十到几百 MB 很正常，不用惊讶
2. **可以随时删**：删了再 `npm install` 就完整恢复
3. **绝不提交进 Git**：下一节会把它写进 `.gitignore`

记住公式：**`package.json`（账本，提交）+ `node_modules/`（货物，不提交）**。凡是遇到说不清原因的报错，先删货物再重新进货，往往就好了（见下一节）。

## 五、易错点：为什么错，怎么办

| 坑 | 现象 | 为什么 | 解法 |
|---|---|---|---|
| 没重启终端 | 装完 `node` 仍提示找不到命令 | PATH 是安装时写入的，旧终端的环境变量是启动那一刻快照 | 新开一个终端再试 |
| 项目路径含中文/空格 | 某些工具莫名报错，查不到原因 | 部分工具链对非 ASCII 和带空格路径处理不完整 | 项目目录用全英文、无空格（`F:\learn_webgis` 就是好例子） |
| 装包慢/超时 | 卡在 `fetch metadata` | 官方仓库服务器在境外，国内网络链路差 | 配 npmmirror 镜像源 |
| 依赖状态异常 | 代码没改却突然报错 | `node_modules` 或 lock 文件与当前环境状态不一致 | 删 `node_modules/` + `package-lock.json`，重新 `npm install` |
| Node 版本太新/太旧 | 某些包直接拒绝安装（ERESOLVE 等） | 包的 peer 依赖要求特定版本范围 | 用 LTS；想多版本切换可装 nvm-windows（进阶可选） |

这五条里，前两条是"环境层面"，后三条是"依赖层面"。遇到报错先别改代码，**先确认环境状态**：版本对不对、镜像通不通、货物干不干净。

## 六、动手练习：跑通第一个 Node 程序

配套文件：[01-check-env.js](/code/01-check-env.js)（单文件练习，不需要安装任何包）

这个练习的目的：让 Node 检查整台电脑的开发环境是否就绪——Node、npm、镜像源、Git（下一节的主角）。

```bash
# 1. 打开终端，进入练习目录
cd F:\learn_webgis\01-env\examples

# 2. 直接用 node 运行
node 01-check-env.js
```

预期输出（版本号以实际安装为准）：

```text
========== 开发环境检查 ==========
✓ Node.js  v24.14.0  （要求 ≥ 24，LTS）
✓ npm      11.9.0
✓ npm 镜像源  https://registry.npmmirror.com
✗ Git 未安装（第 02 节装）
==================================
全部 ✓ 则环境就绪，可以继续下一节。
```

Git 显示 ✗ 是正常的，第 02 节会安装它；如果这台机器已经装过 Git（比如现在这台），它会显示 `✓ Git git version ...`，同样正常。重点在理解脚本本身。

### 主要代码逐段看

```js
// 从 Node 内置模块里解构出 execSync：执行一条系统命令
const { execSync } = require('child_process');
```

这里没有 `npm install`，因为 `child_process` 是 Node 内置模块，Node 装好的那一刻它就在。`require` 是 Node 的 CommonJS 加载语法，ES Module 写法（`import`）会在模块化那节细讲。

```js
function run(cmd) {
  try {
    return execSync(cmd).toString('utf8').trim();
  } catch (err) {
    return null;
  }
}
```

`run()` 是这个脚本的核心：执行一条命令，成功就返回输出去掉首尾空白后的文本，失败就返回 `null`。为什么用 `try/catch`？因为命令不存在时 `execSync` 会抛异常，不兜住的话整个脚本会直接崩溃；返回 `null` 后，调用方用 `if (nodeVer)` 就能判断"装了"还是"没装"。

为什么用同步的 `execSync` 而不是异步的 `exec`？因为这里的检查必须**按顺序**执行，而且每步之间没有依赖关系以外的复杂并发需求。脚本简单，同步写法最直白；真实工具里异步和并发控制才值得引入。

```js
const nodeVer = run('node -v');
if (nodeVer) {
  const major = Number(nodeVer.slice(1).split('.')[0]);
  const isLTSLevel = major >= 24;
  console.log(`${isLTSLevel ? OK : BAD} Node.js  ${nodeVer}  （要求 ≥ 24，LTS）`);
}
```

`nodeVer` 形如 `v24.14.0`：`slice(1)` 去掉开头的 `v`，`split('.')` 按点拆成数组，取第一项转成数字就是主版本。`major >= 24` 表示只要主版本是 24 及以上就算通过——这样补丁版本更新不用改脚本。后面的模板字符串 `${变量}` 把标记、版本号拼成一行输出。

### 通关标准

- [ ] `node 01-check-env.js` 能正常运行，Node/npm/镜像源三项全 ✓
- [ ] 能指着 `run()` 讲出：成功返回什么、失败为什么返回 `null`
- [ ] 能解释为什么这个脚本不需要 `npm install`

## 七、自测题

1. Node.js 解决了 JavaScript 的什么限制？用自己的话说，别背定义。
2. `dependencies` 和 `devDependencies` 的区别？`leaflet` 和 `vite` 各该放哪个？
3. `npm install`（不带包名）时会依次发生哪三件事？
4. `^1.9.4` 允许安装哪些版本？`package-lock.json` 是干什么的、要不要提交 Git？
5. 项目路径为什么不要带中文和空格？（开放题，先猜再验证）

### 参考答案

1. 让 JavaScript 脱离浏览器运行，能读写文件、起服务、当开发工具——也就是给了 JS 一个通用的"运行时"。
2. 生产依赖是项目运行时需要的，`leaflet` 放 `dependencies`；开发依赖只在开发/构建时用，`vite` 放 `devDependencies`。
3. 读 `package.json` 账本 → 把依赖下载到 `node_modules/` → 生成/更新 `package-lock.json`。
4. 允许 `1.9.4 <= 版本 < 2.0.0`；lock 文件锁定每一层依赖的精确版本，保证环境一致，要提交 Git。
5. 部分工具链对非 ASCII 路径和带空格路径处理不佳，会出现难以排查的莫名报错；从源头避免最省事。

## 八、下一步

环境有了 Node 和 npm，代码还是"孤本"：没有版本记录，没有云端备份，改错了没法回退 → **第 02 节：Git 与远程仓库**，让代码进入受控版本管理。
