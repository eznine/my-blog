#!/bin/bash
# =====================================================================
# 方案 C（eznine.xyz 动态 standalone）部署脚本 —— 在服务器上运行：
#   sudo bash /srv/my-blog/scripts/deploy-c2.sh
#
# 关键点：
#   1. standalone 里的 content / public/uploads / public/content-images
#      一律用【符号链接】指向仓库根目录的真实目录——后台改文案/传图片
#      立即生效（standalone 里若是复制副本，改动永远不会反映）。
#   2. 全部目录归 eznine:eznine（web 服务以 eznine 运行，root 属主会
#      导致运行时写图片 EACCES 500）。
# =====================================================================
set -e
cd /srv/my-blog

echo "==> [1/6] git 拉取 dynamic"
git checkout -- public/feed.xml public/sitemap.xml 2>/dev/null || true
git checkout dynamic
git pull --ff-only origin dynamic

echo "==> [2/6] 安装依赖（如有变化）"
npm install --no-audit --no-fund --loglevel=error

echo "==> [3/6] 构建 standalone"
NEXT_PUBLIC_ADMIN_API=/api NODE_OPTIONS='--max-old-space-size=2048' npx next build

echo "==> [4/6] 组装 standalone（静态资源复制 + 内容目录符号链接）"
S=.next/standalone
# 静态资源必须复制（带内容哈希，每次构建都变）
rm -rf $S/.next/static
cp -r .next/static $S/.next/static
# public：先整体复制，再把三个"活目录"换成符号链接
rm -rf $S/public
cp -r public $S/public
mkdir -p content public/uploads public/content-images
rm -rf $S/content
ln -sfn ../../content $S/content
rm -rf $S/public/uploads
ln -sfn ../../../public/uploads $S/public/uploads
rm -rf $S/public/content-images
ln -sfn ../../../public/content-images $S/public/content-images

echo "==> [5/6] 修正属主（web 服务以 eznine 运行）"
chown -R eznine:eznine .next public/uploads public/content-images 2>/dev/null || true

echo "==> [6/6] 重启 web 服务与后台服务"
systemctl restart my-blog-web.service
systemctl restart my-blog-admin.service
sleep 2
systemctl is-active my-blog-web.service
systemctl is-active my-blog-admin.service

echo "=== 验证 ==="
echo -n "web3210:"; curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3210/
echo -n " nginx:";  curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:80/
echo
echo -n "version api: "; curl -s http://127.0.0.1:3001/api/version
echo
echo "==> 完成"
