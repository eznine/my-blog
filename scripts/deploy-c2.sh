#!/bin/bash
# =====================================================================
# 方案 C（eznine.xyz 动态 standalone）部署脚本 —— 在服务器上运行：
#   sudo bash /srv/my-blog/scripts/deploy-c2.sh
#
# 关键点：
#   1. standalone 里的 content / public/uploads / public/content-images
#      一律用【符号链接】指向仓库根目录的真实目录——后台改文案/传图片
#      立即生效（standalone 里若是复制副本，改动永远不会反映）。
#   2. git / npm / build 一律以 eznine 身份执行（runuser），不再产生
#      root 属主文件——之前 sudo 直接跑导致 .git/.next 归 root，
#      git pull 失败、运行时写图片 EACCES 500。
#   3. 启动时自愈：把 .git/.next/content 等属主修正为 eznine。
#   4. 自愈 systemd：确保 my-blog-admin 以 eznine 运行（曾以 root 跑，
#      写出的文件归 root，后续 git/运行时写入报权限错误）。
# =====================================================================
set -e
cd /srv/my-blog

{ # ← 整个脚本体包在复合命令里：bash 会先整体解析再执行，
  #   避免 [1/8] git pull 更新本文件后执行位置错乱

# 以 eznine 身份执行命令（脚本通常被 sudo 调用，避免再写出 root 文件）
AS_EZNINE() {
  if [ "$(id -u)" = "0" ]; then
    runuser -u eznine -- "$@"
  else
    "$@"
  fi
}

echo "==> [0/8] 自愈：修正历史 sudo 遗留的 root 属主 + admin 服务身份"
if [ "$(id -u)" = "0" ]; then
  # 全仓归 eznine（含 package*.json / node_modules——历史 sudo 装依赖会留下 root 属主，
  # 导致后续 npm install 以 eznine 身份写 package-lock.json 时 EACCES）
  chown -R eznine:eznine . 2>/dev/null || true
  # git 安全目录白名单（以 eznine 跑 git 时避免 dubious ownership 拦截）
  runuser -u eznine -- git config --global --add safe.directory /srv/my-blog 2>/dev/null || true
  # admin 服务必须以 eznine 运行（drop-in 覆盖，不动原 unit 文件）
  mkdir -p /etc/systemd/system/my-blog-admin.service.d
  printf '[Service]\nUser=eznine\nGroup=eznine\n' > /etc/systemd/system/my-blog-admin.service.d/user.conf
  systemctl daemon-reload
fi

echo "==> [1/8] git 拉取 dynamic（未提交的内容改动自动 stash 保护，拉完恢复）"
AS_EZNINE git checkout -- public/feed.xml public/sitemap.xml 2>/dev/null || true
AS_EZNINE git checkout dynamic
# 后台（admin）改的是 content/ 与 public/ 下的 tracked 文件，且从不 commit。
# 部署前若不清掉它们，git pull 会和远端改动冲突中止。先 stash 暂存（不丢），
# 拉完再 pop 恢复——这样「网上后台改的内容」永远不会被「代码更新」吞掉。
HAS_LOCAL=$(AS_EZNINE git status --porcelain --untracked-files=no -- content public | wc -l)
if [ "$HAS_LOCAL" -gt 0 ]; then
  echo "    检测到 ${HAS_LOCAL} 个未提交内容改动，先 stash 保护，拉完自动恢复"
  AS_EZNINE git stash push -m "deploy:auto-protect $(date +%s)" -- content public || true
fi
AS_EZNINE git pull --ff-only origin dynamic
if [ "$HAS_LOCAL" -gt 0 ]; then
  echo "    恢复 stash 的内容改动"
  if ! AS_EZNINE git stash pop; then
    echo "    ⚠ stash 恢复有冲突（远端也改了同一文件）。请手动处理："
    echo "       cd /srv/my-blog && git stash list && git status"
    exit 1
  fi
fi

echo "==> [2/8] 安装依赖（如有变化）"
AS_EZNINE npm install --no-audit --no-fund --loglevel=error

echo "==> [3/8] 构建 standalone"
AS_EZNINE env NEXT_PUBLIC_ADMIN_API=/api NODE_OPTIONS='--max-old-space-size=2048' npx next build

echo "==> [4/8] 组装 standalone（静态资源复制 + 内容目录符号链接）"
S=.next/standalone
# 静态资源必须复制（带内容哈希，每次构建都变）
rm -rf $S/.next/static
cp -r .next/static $S/.next/static
# public：先整体复制，再将三个"活目录"换成符号链接
rm -rf $S/public
cp -r public $S/public
mkdir -p content public/uploads public/content-images
rm -rf $S/content
ln -sfn ../../content $S/content
rm -rf $S/public/uploads
ln -sfn ../../../public/uploads $S/public/uploads
rm -rf $S/public/content-images
ln -sfn ../../../public/content-images $S/public/content-images

echo "==> [5/8] 修正属主（web 服务以 eznine 运行）"
if [ "$(id -u)" = "0" ]; then
  chown -R eznine:eznine .next public/uploads public/content-images 2>/dev/null || true
fi

echo "==> [6/8] 写入 Nginx 站点配置（/uploads/ 与 /content-images/ 由 Nginx 直连仓库目录，"
echo "          绕开 Next 静态服务——Next 对服务启动后新增的图片文件会 404）"
if [ "$(id -u)" = "0" ]; then
  cat > /etc/nginx/sites-available/my-blog <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # 批量导入/上传图片允许大 body（默认 1m 会直接 413 拒掉带图 md 导入）
    client_max_body_size 64m;

    location / {
        proxy_pass http://127.0.0.1:3210;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 600s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 600s;
    }

    # DEM 下载器（独立 Python 服务 127.0.0.1:8081，相对路径前端）
    # 无尾斜杠的 /dem 重定向补斜杠，避免相对路径解析错乱
    location = /dem { return 308 /dem/; }

    location /dem/ {
        proxy_pass http://127.0.0.1:8081/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 600s;
    }

    location /uploads/ {
        alias /srv/my-blog/public/uploads/;
        expires 7d;
    }

    location /content-images/ {
        alias /srv/my-blog/public/content-images/;
        expires 30d;
    }
}
NGINX
  ln -sfn /etc/nginx/sites-available/my-blog /etc/nginx/sites-enabled/my-blog
  nginx -t
fi

echo "==> [7/8] 重启 web 服务与后台服务 + 重载 Nginx"
systemctl restart my-blog-web.service
systemctl restart my-blog-admin.service
[ "$(id -u)" = "0" ] && systemctl reload nginx
sleep 2
systemctl is-active my-blog-web.service
systemctl is-active my-blog-admin.service

echo "==> [8/8] 预热页面（避免访客第一次打开吃冷启动渲染）"
for pg in / /notes/ /research/ /projects/ /archive/ /search/ /about/; do
  curl -sL -o /dev/null --max-time 30 "http://127.0.0.1:3210$pg" || true
done

echo "=== 验证 ==="
echo -n "web3210:"; curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3210/
echo -n " nginx:";  curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:80/
echo
echo -n "version api: "; curl -s http://127.0.0.1:3001/api/version
echo
echo "==> 完成"

} # ← 复合命令结束
