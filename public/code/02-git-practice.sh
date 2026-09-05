#!/usr/bin/env bash
# 第 02 节动手练习：自动走一遍 Git 本地提交循环
# 运行：bash 01-env/examples/02-git-practice.sh
# 脚本会在 examples 下新建 02-git-demo.XXXXXX 临时仓库，结尾打印路径留作远程推送。

set -euo pipefail

# 首次使用前要先完成 git config，否则提交没有作者信息
if ! git config --get user.name >/dev/null 2>&1; then
  echo "还没有配置 user.name，请先执行："
  echo "  git config --global user.name \"名字\""
  echo "  git config --global user.email \"邮箱@example.com\""
  exit 1
fi

demo_dir="$(mktemp -d "$(dirname "$0")/02-git-demo.XXXXXX")"
cd "$demo_dir"

git init -b main >/dev/null

# 演示仓库统一用 LF，避免 Windows 反复提示 CRLF 转换
git config core.autocrlf false

# 第一批文件：README、示例 JS、忽略规则
cat > README.md <<'EOF'
# 第一次提交

这是 Git 练习仓库的起点。
EOF

mkdir -p src
cat > src/map.js <<'EOF'
// 准备在 Leaflet 中放置的标记坐标
const markers = [
  [39.9042, 116.4074],
];
EOF

cat > .gitignore <<'EOF'
node_modules/
dist/
.env
EOF

echo "── 第一次 status：新文件都处于未跟踪状态"
git status --short

git add .
git commit -m "第一次提交：初始化练习仓库" >/dev/null
echo ""
echo "── 第一次提交完成"

# 故意制造一个“不该提交”的文件，验证忽略规则
mkdir -p node_modules
touch node_modules/fake.txt
echo ""
echo "── 创建 node_modules/fake.txt 后的 status（应没有 node_modules 条目）"
git status --short
echo "上面为空白说明 .gitignore 拦截生效"

# 第二次改动：新增一个城市坐标
cat >> src/map.js <<'EOF'

// 第二次改动：增加第二个城市
markers.push([31.2304, 121.4737]);
EOF

git add src/map.js
git commit -m "第二次提交：增加上海坐标" >/dev/null
echo ""
echo "── 提交历史"
git log --oneline

echo ""
echo "── 演示目录：$demo_dir"
echo "下一步：在 Gitee 新建空仓库后执行"
echo "  git remote add origin git@gitee.com:用户名/my-first-repo.git"
echo "  git push -u origin main"
