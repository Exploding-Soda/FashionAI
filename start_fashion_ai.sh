#!/bin/bash
set -eu

# === FashionAI 一键启停脚本（生产模式） ===
# 用法：
#   ./fashion_ai.sh start     # 启动全部服务
#   ./fashion_ai.sh stop      # 停止全部服务
#   ./fashion_ai.sh restart   # 重启全部服务
#   ./fashion_ai.sh status    # 查看运行状态
# ===============================================

FRONTEND_DIR="/home/appadmin/FashionAI/comfyui-clothing"
RUNNINGHUB_DIR="/home/appadmin/FashionAI/comfyui-runninghub"
TENANT_DIR="/home/appadmin/FashionAI/comfyui-tenant-service"
PORTS=(3000 8080 8081)

# ---- 函数：停止所有服务 ----
stop_all() {
  echo "=== 🧹 停止 FashionAI 全部服务 ==="
  for port in "${PORTS[@]}"; do
    pids=$(lsof -t -i:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "🛑 停止端口 $port (PID: $pids)"
      kill -9 $pids || true
    else
      echo "✅ 端口 $port 没有进程"
    fi
  done
  echo "✅ 所有服务已停止"
}

# ---- 函数：查看运行状态 ----
status_all() {
  echo "=== 📊 FashionAI 服务状态 ==="
  for port in "${PORTS[@]}"; do
    pid=$(lsof -t -i:$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
      echo "✅ 端口 $port 正在运行 (PID: $pid)"
    else
      echo "❌ 端口 $port 未启动"
    fi
  done
}

# ---- 函数：启动所有服务 ----
start_all() {
  echo "=== 🚀 启动 FashionAI 全部服务（生产模式） ==="

  # Step 0: 清理旧端口
  for port in "${PORTS[@]}"; do
    pids=$(lsof -t -i:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "⚠️ 端口 $port 被占用 (PID: $pids)，正在杀死..."
      kill -9 $pids || true
    fi
  done

  # Step 1: 启动 RunningHub
  echo "[RunningHub] 启动 FastAPI 后端 (8080)..."
  cd "$RUNNINGHUB_DIR" || { echo "❌ 无法进入 $RUNNINGHUB_DIR"; exit 1; }
  if [ ! -f ".venv/bin/activate" ]; then
    echo "❌ 缺少虚拟环境 (.venv)"
    exit 1
  fi
  source .venv/bin/activate
  nohup uvicorn app.main:app --host 0.0.0.0 --port 8080 > uvicorn.log 2>&1 &
  deactivate
  echo "✅ RunningHub 已启动 (端口:8080)"

  # Step 2: 启动 Tenant
  echo "[Tenant] 启动 FastAPI 租户服务 (8081)..."
  cd "$TENANT_DIR" || { echo "❌ 无法进入 $TENANT_DIR"; exit 1; }
  if [ ! -f ".venv/bin/activate" ]; then
    echo "❌ 缺少虚拟环境 (.venv)"
    exit 1
  fi
  source .venv/bin/activate
  nohup uvicorn app.main:app --host 0.0.0.0 --port 8081 > uvicorn.log 2>&1 &
  deactivate
  echo "✅ Tenant 已启动 (端口:8081)"

  # Step 3: 启动 FrontEnd（生产模式）
  echo "[FrontEnd] 启动 Next.js 前端 (生产模式)..."
  cd "$FRONTEND_DIR" || { echo "❌ 无法进入 $FRONTEND_DIR"; exit 1; }

  echo "🧹 清理旧构建缓存..."
  rm -rf .next || true

  echo "⚙️ 正在构建前端..."
  if ! npm run build > build.log 2>&1; then
    echo "❌ 前端构建失败，请查看 build.log"
    tail -n 20 build.log
    exit 1
  fi

  echo "🚀 启动 Next.js 服务..."
  nohup npm start > output.log 2>&1 &
  echo "✅ FrontEnd 已启动 (端口:3000)"
  echo "📜 日志文件: $FRONTEND_DIR/output.log"

  echo ""
  echo "🎉 所有服务已启动完毕！"
  echo "🌐 前端地址:     http://localhost:3000"
  echo "📘 RunningHub:   http://localhost:8080/docs"
  echo "📘 Tenant:       http://localhost:8081/docs"
}

# ---- 主逻辑 ----
case "${1:-}" in
  start)
    start_all
    ;;
  stop)
    stop_all
    ;;
  restart)
    stop_all
    sleep 2
    start_all
    ;;
  status)
    status_all
    ;;
  *)
    echo "用法: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
