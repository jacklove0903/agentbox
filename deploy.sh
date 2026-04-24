#!/usr/bin/env bash
#
# AgentBox 一键部署脚本（生产服务器用）
# 用法：
#   chmod +x deploy.sh
#   ./deploy.sh            # 完整流程
#   ./deploy.sh --skip-db  # 跳过 migration（比如你已经手动跑过了）
#   ./deploy.sh --no-cache # 构建时不使用缓存（更彻底，但更慢）
#
set -euo pipefail

# ---------- 可按需修改 ----------
COMPOSE_FILE="docker-compose.prod.yml"
DB_CONTAINER="agentbox-db"
DB_USER="postgres"
DB_NAME="agentbox"
BACKEND_CONTAINER="agentbox-backend"
# --------------------------------

SKIP_DB=0
NO_CACHE=""
for arg in "$@"; do
  case "$arg" in
    --skip-db)   SKIP_DB=1 ;;
    --no-cache)  NO_CACHE="--no-cache" ;;
    *) echo "未知参数: $arg"; exit 1 ;;
  esac
done

log() { echo -e "\n\033[1;34m==>\033[0m \033[1m$*\033[0m"; }

log "1/5  拉取最新代码"
git pull --ff-only origin main

if [[ $SKIP_DB -eq 0 ]]; then
  log "2/5  执行数据库 migrations（已存在的列/表会报错，可忽略）"
  for f in migration_v9_uploaded_files.sql \
           migration_v10_vision_flag.sql \
           migration_v11_messages_images.sql; do
    if [[ -f "$f" ]]; then
      echo "  -> $f"
      cat "$f" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" || true
    else
      echo "  -> 跳过 $f（文件不存在）"
    fi
  done
else
  log "2/5  已跳过数据库 migration（--skip-db）"
fi

log "3/5  停止 backend / frontend / nginx"
docker compose -f "$COMPOSE_FILE" stop backend frontend nginx

log "4/5  重新构建镜像 $NO_CACHE"
docker compose -f "$COMPOSE_FILE" build $NO_CACHE backend frontend

log "5/5  启动服务"
docker compose -f "$COMPOSE_FILE" up -d

echo ""
log "部署完成 ✅"
echo ""
echo "查看后端日志： docker logs -f --tail 200 $BACKEND_CONTAINER"
echo "查看所有容器： docker ps"
echo ""
# 顺便显示容器状态
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
