#!/bin/bash
# =====================================================================
# DEM 下载器在线部署（eznine.xyz 服务器专用，2026-09-03）
# 运行方式：
#   sudo bash scripts/deploy-dem.sh
#
# 前置条件：
#   dem-app.tar.gz 已放到 /home/eznine/（本地打包：web_app/ + DEM_downloader/src/，
#   前端已相对路径化，排除 downloads/ 历史与 __pycache__）
#
# 职责：
#   1. 安装 Python 依赖（gdal/numpy/requests/dotenv/geopandas）
#   2. 解压 dem-app.tar.gz 到 /srv/dem-down
#   3. 注册 systemd 服务 my-blog-dem（127.0.0.1:8081，仅本机）
#   4. Nginx /dem/ 反代已内嵌进 deploy-c2.sh 的声明式配置，本脚本只验证；
#      若站点配置还没包含 /dem/，提示先跑 deploy-c2.sh
#
# 架构：
#   DEM 前端改造为相对路径（/api/x → api/x），页面位于 /dem/ 下时自动
#   解析为 /dem/api/x，Nginx 剥掉 /dem/ 前缀转发到 127.0.0.1:8081 ——
#   与博客后台占用的 /api/（→3001）井水不犯河水。
# =====================================================================
set -e

DEM_TARBALL="${DEM_TARBALL:-/home/eznine/dem-app.tar.gz}"
DEM_ROOT="/srv/dem-down"
DEM_PORT=8081

AS_EZNINE() {
  if [ "$(id -u)" = "0" ]; then
    runuser -u eznine -- "$@"
  else
    "$@"
  fi
}

echo "==> [1/5] 安装 Python 依赖"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3-gdal gdal-bin python3-numpy python3-requests python3-dotenv python3-geopandas >/dev/null
echo "    OK"

echo "==> [2/5] 解压应用到 $DEM_ROOT"
mkdir -p "$DEM_ROOT"
if [ ! -f "$DEM_TARBALL" ]; then
  echo "!! 未找到 $DEM_TARBALL"
  echo "   本地打包并上传："
  echo "     tar -czf dem-app.tar.gz -C F:/TOOLS/DEM_DOWN --exclude=web_app/downloads --exclude='*/__pycache__' web_app DEM_downloader/src"
  echo "     scp dem-app.tar.gz eznine:/home/eznine/"
  exit 1
fi
tar -xzf "$DEM_TARBALL" -C "$DEM_ROOT"
chown -R eznine:eznine "$DEM_ROOT"
echo "    OK"

echo "==> [3/5] 快速验证 Python 依赖可导入"
AS_EZNINE python3 - <<PYEOF
import sys
sys.path.insert(0, "$DEM_ROOT")
sys.path.insert(0, "$DEM_ROOT/DEM_downloader")
from osgeo import gdal
import numpy, requests, dotenv
print("    gdal", gdal.__version__, "| numpy", numpy.__version__, "| OK")
PYEOF

echo "==> [4/5] 注册 systemd 服务 my-blog-dem（127.0.0.1:${DEM_PORT}）"
cat > /etc/systemd/system/my-blog-dem.service <<UNIT
[Unit]
Description=EZNINE DEM Downloader (127.0.0.1:${DEM_PORT})
After=network.target

[Service]
User=eznine
Group=eznine
WorkingDirectory=${DEM_ROOT}/web_app
ExecStart=/usr/bin/python3 ${DEM_ROOT}/web_app/web_server.py ${DEM_PORT}
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable my-blog-dem >/dev/null 2>&1 || true
systemctl restart my-blog-dem
sleep 2
if [ "$(systemctl is-active my-blog-dem)" != "active" ]; then
  echo "!! my-blog-dem 启动失败，日志："
  journalctl -u my-blog-dem -n 20 --no-pager || true
  exit 1
fi
echo "    OK"

echo "==> [5/5] 验证 Nginx 反代与前台"
if grep -q 'location /dem/' /etc/nginx/sites-available/my-blog 2>/dev/null; then
  echo -n "dem-nginx(/dem/): "; curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/dem/
  echo -n "dem-direct(8081): "; curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:${DEM_PORT}/
  echo -n "dem-api(经nginx): "; curl -s http://127.0.0.1/dem/api/health | head -c 120; echo
else
  echo "!! 站点 Nginx 配置还没有 /dem/ 反代——请跑一次 deploy-c2.sh（其 Nginx 配置已内置 /dem/）："
  echo "    sudo bash /srv/my-blog/scripts/deploy-c2.sh"
fi

echo "==> 完成。前台访问：http://eznine.xyz/dem/（工具页自动嵌入）"