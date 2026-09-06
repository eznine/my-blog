---
title: "第 03 节 · VS Code 与插件"
date: "2026-09-06"
category: "WebGIS 开发"
chapter: "环境与工具链"
order: 103
tags: ["vscode","tool"]
code: "/code/03-settings.json"
codeLabel: "03-settings.json · VS Code 推荐配置"
---



# 第 03 节 · VS Code 与插件

> 📌 版本信息：基于 VS Code **1.136.1**（2026-09-05 核对，本机实测版本；VS Code 约每月更新，插件版本以扩展市场实时版本为准）
> 📚 来源：[VS Code 官网](https://code.visualstudio.com/) ｜ [VS Code 官方文档](https://code.visualstudio.com/docs) ｜ [VS Code 快捷键表](https://code.visualstudio.com/docs/getstarted/keybindings)

## 一、从记事本到驾驶舱

第 01、02 节的大部分操作发生在终端：装 Node、验证版本、`git clone`、`git commit`。但真正的日常开发里，终端只占一小部分：改项目文件时要在文件树里找文件，写代码时要有语法高亮、自动补全和错误提示，看 Git 状态时不希望切到另一个窗口敲命令。

如果有人至今还在用记事本打开 `main.js` 修改地图代码，会立即碰到一串问题：

- 项目有上百个文件，靠文件管理器一层层翻很慢
- 写错一个括号，等浏览器报错才意识到
- 函数定义在哪、从哪里被调用，完全靠记忆
- 终端、编辑器、浏览器三个窗口来回切换，上下文频繁断掉

VS Code 解决的就是这些问题的集合：一个窗口里完成文件浏览、代码编辑、格式化、终端执行、Git 操作和调试，并且通过插件按需扩展能力。

## 二、这一节讲什么，学完能做什么

这一节把 VS Code 安装好，认识界面五大区域，装齐入门必装插件，写入一份统一的用户配置，过一遍最高频快捷键，最后把 Git Bash 集成进编辑器终端。

学完本节能做到：

1. 用专业名词说清 VS Code 的界面区域和工作区概念
2. 独立安装必要插件，并说清每个插件负责什么
3. 读懂并修改 `settings.json` 的常用配置
4. 脱离“记事本 + 黑框终端”的工作方式，单窗口完成编辑、格式化、运行和 Git 操作
5. 记住 10 个高频快捷键，形成肌肉记忆

## 三、核心概念

### 3.1 编辑器、IDE 与插件的关系

代码编辑器（code editor）负责“编辑文本”，IDE（集成开发环境）把编辑、构建、调试、版本控制等集成到一起。传统 IDE 功能齐全但体积大；VS Code 走中间路线：核心是一个轻量编辑器，能力依靠插件组合出来，需要什么就装什么。

三个概念需要分清：

| 概念 | 是什么 | 例子 |
|---|---|---|
| 编辑器核心 | 文本编辑本身：高亮、多光标、搜索 | VS Code |
| 插件 | 按需附加的能力包 | ESLint、Prettier、Live Server |
| 工作区 | VS Code 打开的一个/一组项目文件夹 | `F:\learn_webgis` |

“VS Code 打开文件夹”时，本质是创建了一个工作区；文件树、搜索、Git 面板都以这个文件夹为边界运行。

### 3.2 settings.json：配置的本质

VS Code 里几乎所有界面设置，最终都存在 JSON 文件里。常见有两层：

- **用户设置**（User Settings）：所有项目通用，位置在用户目录下的 `User/settings.json`
- **工作区设置**（Workspace Settings）：随项目存在 `.vscode/settings.json`，可随代码库分享

工作区设置优先级高于用户设置。因此同一个项目里配置 `editor.tabSize: 4`，会覆盖用户设置中的 2；随仓库共享的工作区配置，也可能影响其他打开该项目的人。读配置、改配置，是以后读任何框架项目的基本功。

### 3.3 为什么是 VS Code

| 工具 | 特点 | 结论 |
|---|---|---|
| VS Code | 免费、轻量、插件生态最全、前端社区事实标准 | 本路线主编辑器 |
| WebStorm | 功能强、开箱即用、商用收费 | 有预算可体验，但非必选 |
| 记事本 / 记事本++ | 没有代码补全、调试、Git 集成 | 只适合临时改配置 |
| Vim | 上手曲线陡、无图形界面优势 | 进阶兴趣项，不必入门就学 |

选择 VS Code 还有一层实际原因：后续 React、Vite、Leaflet、Cesium 的文档、教程、团队项目里，几乎都能看到 `.vscode/` 推荐配置和扩展清单，熟悉它就是熟悉行业通用工作流。

## 四、安装、界面与基础配置

### 4.1 安装

从 [code.visualstudio.com](https://code.visualstudio.com/) 下载 Windows 安装包。安装向导中勾选两个右键菜单选项：

- **Open with Code**（通过 Code 打开）
- **Add 'Open with Code' action to Windows Explorer file context menu**

这样可以在资源管理器里直接右键文件夹 → Open with Code。若勾选了“添加到 PATH”，安装后终端也能用 `code` 命令。

安装完成后新开终端验证：

```powershell
code --version
```

输出版本号即安装成功。以后在终端里进入任意项目目录并执行 `code .`，就会用 VS Code 打开当前文件夹。

### 4.2 界面五大区域

```text
┌────────┬────────────────────┬──────────────────┐
│ 活动栏  │       侧边栏        │     编辑器区      │
│ 最左侧  │  资源管理器/搜索/Git │  写代码的主舞台   │
│ 图标列  │                    │                  │
│        │                    ├──────────────────┤
│        │                    │    面板           │
│        │                    │  终端/问题/输出    │
└────────┴────────────────────┴──────────────────┘
                        状态栏（底部蓝条）
```

五个区域各管一件事：

| 区域 | 作用 |
|---|---|
| 活动栏 | 切换资源管理器、搜索、源代码管理、运行与调试、扩展 |
| 侧边栏 | 显示所选工具的详细内容：文件树、Git 改动列表、扩展列表 |
| 编辑器区 | 打开并编辑文件的主区域 |
| 面板 | 展示集成终端、问题、输出、调试控制台 |
| 状态栏 | 显示分支名、错误数量、编码、行号等信息 |

### 4.3 推荐用户配置

按 `Ctrl+Shift+P` 打开命令面板，输入 `settings json`，选择 **Preferences: Open User Settings (JSON)**，粘贴下面的配置：（复制粘贴前将注释删掉）

```jsonc
{
  // 自动保存：焦点离开文件时就保存
  "files.autoSave": "onFocusChange",
  // 保存时用 Prettier 自动格式化
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  // 前端惯例：2 空格缩进
  "editor.tabSize": 2,
  // 显示空白符边界，缩进问题一眼可见
  "editor.renderWhitespace": "boundary",
  // 括号配对染色，嵌套层级更清楚
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true,
  // 统一 UTF-8，避免中文乱码
  "files.encoding": "utf8",
  // 文件树里的彩色图标
  "workbench.iconTheme": "vs-seti",
  // 嵌套文件夹不自动折叠成一行
  "explorer.compactFolders": false,
  // 集成终端默认用 Git Bash
  "terminal.integrated.defaultProfile.windows": "Git Bash"
}
```

逐个理解关键项：

- `files.autoSave`：改动自动落盘。配合第 02 节的 Git，存盘越勤，后续回滚颗粒度越细。
- `editor.formatOnSave` + `editor.defaultFormatter`：保存时把代码按 Prettier 规则整理，统一引号、缩进和换行。
- `terminal.integrated.defaultProfile.windows`：在 VS Code 内部指定 Git Bash 为默认终端，从这里运行 `git`、`node`、`npm`。
- `editor.renderWhitespace: boundary`：只在行首、行尾等关键位置显示空白标记，不影响正常观感。

### 4.4 用户设置与工作区设置怎么选

- 个人习惯、编辑器外观 → 用户设置
- 团队规范、项目强制规则 → 工作区设置 `.vscode/settings.json`

本练习使用用户设置，避免把个人偏好写进共享工作区后顺带提交。

## 五、必装插件清单

按 `Ctrl+Shift+X` 打开扩展面板，搜索插件名或 ID 安装。入门先装下面 9 个，装完知道每个是干什么的，再按项目需要扩展。

| 插件 | 扩展 ID | 做什么 | 为什么需要 |
|---|---|---|---|
| Chinese (Simplified) | `ms-ceintl.vscode-language-pack-zh-hans` | 中文界面 | 降低初期上手成本，界面术语不再需要猜 |
| ESLint | `dbaeumer.vscode-eslint` | JavaScript 语法与规范检查 | 写错变量、漏加分号时实时标红线 |
| Prettier | `esbenp.prettier-vscode` | 代码格式化 | 保存即统一格式，人和 AI 协作都不为换行吵架 |
| Live Server | `ritwickdey.liveserver` | 本地静态服务器 | 右键 HTML 一键启动，改完自动刷新 |
| GitLens | `eamodio.gitlens` | Git 历史增强 | 鼠标停在某行代码上，能看这行是哪个提交改的 |
| Error Lens | `usernamehw.errorlens` | 错误内联显示 | 报错直接显示在出错行尾，不用悬停和下滑 |
| Path Intellisense | `christian-kohler.path-intellisense` | 路径自动补全 | 写 `import './...'` 时自动提示文件路径 |
| Code Spell Checker | `streetsidesoftware.code-spell-checker` | 英文拼写检查 | 变量名 `lable` 写成 `label` 这类静默 bug 更早暴露 |
| Markdown All in One | `yzhang.markdown-all-in-one` | Markdown 增强 | 本工作区全是笔记，编辑、预览、目录都顺 |

插件不是越多越好。装几十个会让状态栏、右键菜单、启动速度都变拥挤；需要什么装什么，是更可持续的策略。

## 六、10 个高频快捷键

| 快捷键 | 作用 |
|---|---|
| `Ctrl+P` | 按文件名快速打开文件 |
| `Ctrl+Shift+P` | 命令面板，所有功能的统一入口 |
| `Ctrl+`` ` | 打开/关闭集成终端 |
| `Ctrl+S` | 保存当前文件 |
| `Ctrl+/` | 注释/取消注释当前行 |
| `Ctrl+B` | 显示/隐藏侧边栏 |
| `Ctrl+W` | 关闭当前标签页 |
| `Alt+↑/↓` | 整行上移/下移 |
| `Shift+Alt+F` | 手动格式化当前文件 |
| `Ctrl+D` | 选中下一个相同词，批量多光标修改 |

用法举例：想打开 `01-check-env.js`，按 `Ctrl+P` 输入文件名片段回车即可；忘了某个功能快捷键，按 `Ctrl+Shift+P` 搜中文或英文关键词。

## 七、易错点：为什么错，怎么办

| 现象 | 原因 | 解决 |
|---|---|---|
| 装了 Prettier，格式化仍不生效 | 没设为默认格式化器，或同时有多个格式化器 | 在用户设置中显式写 `editor.defaultFormatter: "esbenp.prettier-vscode"` |
| 终端里输入 `code` 提示找不到命令 | 安装时未勾选 Add to PATH，或终端是旧窗口 | 重新安装勾选 PATH；新开终端；或改用右键 Open with Code |
| 打开某个 `.html` 文件，Live Server 右键菜单没有 | 只打开文件、没打开文件夹 | 用 File → Open Folder 打开项目根目录 |
| 中文显示成问号/乱码 | 终端默认编码不是 UTF-8 | 集成终端默认切到 Git Bash，或把文件统一保存为 UTF-8 |
| 改的配置“没生效” | 改在了错误层级 | 用户设置与工作区设置二选一并确认优先级：工作区 > 用户 |
| 插件装了太多，启动变慢 | 扩展面板长期堆积 | 定期停用不用的扩展，保留能说出用途的 |
| 格式化后与团队风格不一致 | 每个项目格式规范可能不同 | 项目自带 `.vscode/settings.json` 时，以工作区设置为准 |

## 八、动手练习：把工作区接进 VS Code

配套文件：[03-settings.json](/code/03-settings.json)，内容即上文的推荐用户配置。

### 练习目标

把 `F:\learn_webgis` 作为一个工作区打开，装齐 9 个插件，写入用户配置，让集成终端稳定运行第 01 节的检查脚本。

### 练习步骤

1. 打开 VS Code，File → Open Folder，选择 `F:\learn_webgis`。终端里也可以执行：

```powershell
code F:\learn_webgis
```

2. 按 `Ctrl+Shift+X`，安装第五节列出的 9 个插件。每装一个，先在资源管理器里新建一个临时文件测试它是否生效，再删掉临时文件。

3. 按 `Ctrl+Shift+P` → `settings json` → 打开用户设置 JSON，把 [03-settings.json](/code/03-settings.json) 的内容合并进去。

4. 按 `Ctrl+Shift+P`，执行 `Terminal: Select Default Profile`，选择 **Git Bash**。之后每次按 `Ctrl+`` ` 打开的终端都是 Git Bash。

5. 按 `Ctrl+P`，输入 `01-check-env`，打开第 01 节脚本，在集成终端里执行：

```bash
node 01-check-env.js
```

6. 打开任意 Markdown 笔记（如 [02-Git与远程仓库.md](02-Git与远程仓库.md)），按 `Shift+Alt+F`，观察格式化后无报错提示。

### 验收标准

- [ ] 左侧文件树可见 `01-env/`、`examples/` 等全部模块目录
- [ ] `Ctrl+P` 能 3 秒内打开任意已知文件
- [ ] 集成终端默认是 Git Bash，且 `node -v`、`git --version` 都有正常输出
- [ ] 第 01 节脚本输出四项检查全 ✓
- [ ] `Shift+Alt+F` 格式化 Markdown 不报错

### 可以自己试的修改

把 `editor.tabSize` 改成 4，格式化一个 JS 文件，观察缩进从 2 空格变成 4 空格；改回 2 再格式化一次。结论是：**缩进由配置决定，不是手敲空格**，项目规范要求什么就配什么。前端主流生态默认 2 空格，所以推荐配置保留 `2`。

## 九、自测题

1. VS Code 的五个界面区域分别是什么？
2. `Ctrl+P` 和 `Ctrl+Shift+P` 的用途有什么区别？
3. 为什么打开“文件夹”而不是打开“单个文件”是正确的使用姿势？
4. ESLint 和 Prettier 分工有何不同？各自管什么场景？
5. 用户设置与工作区设置谁优先？什么内容适合放进工作区设置？

### 参考答案

1. 活动栏、侧边栏、编辑器区、面板、状态栏。
2. `Ctrl+P` 按文件名快速打开文件；`Ctrl+Shift+P` 打开命令面板，执行任意功能。
3. VS Code 以工作区为边界运行：文件树、全局搜索、相对路径跳转、Git 集成都依赖整个文件夹，而不是只打开一个文件。
4. ESLint 管代码“对不对”：语法错误、未使用变量、不推荐写法；Prettier 管“好不好看”：缩进、引号、换行等统一格式。
5. 工作区设置优先。适合放项目级规范：格式化器、缩进、语言相关配置；个人习惯（字号、主题、自动保存）放用户设置。

## 十、下一步

编辑器和终端已经装进同一个窗口，下一步进浏览器：**第 04 节 · 浏览器开发者工具**，第一次亲眼看清地图页面从服务器请求了哪些瓦片、报错从哪一行产生。
