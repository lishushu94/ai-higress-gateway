#!/bin/bash
# 从根目录 .env 同步前端需要的环境变量到 frontend/.env.local

set -e

# 获取脚本所在目录的父目录（项目根目录）
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_ENV="$PROJECT_ROOT/.env"
FRONTEND_ENV="$PROJECT_ROOT/frontend/.env.local"

echo "同步环境变量: $ROOT_ENV -> $FRONTEND_ENV"

# 检查根目录 .env 是否存在
if [ ! -f "$ROOT_ENV" ]; then
    echo "错误: 根目录 .env 文件不存在: $ROOT_ENV"
    exit 1
fi

# 从根目录 .env 中提取需要的变量
# 1. 从 CORS_ALLOW_ORIGINS 推断前端地址
CORS_ORIGINS=$(grep "^CORS_ALLOW_ORIGINS=" "$ROOT_ENV" | cut -d'=' -f2- | tr -d ' ')
FRONTEND_URL=$(echo "$CORS_ORIGINS" | cut -d',' -f1)

# 2. 从 FRONTEND_URL 推断后端 API 地址（替换端口 3000 为 8000）
if [ -n "$FRONTEND_URL" ]; then
    API_BASE_URL=$(echo "$FRONTEND_URL" | sed 's/:3000/:8000/g')
else
    # 默认值
    API_BASE_URL="http://localhost:8000"
fi

# 3. 生成 frontend/.env.local
cat > "$FRONTEND_ENV" << EOF
# 此文件由 scripts/sync-frontend-env.sh 自动生成
# 请勿手动编辑，修改请编辑根目录的 .env 文件后重新运行此脚本

# API 地址（从根目录 .env 的 CORS_ALLOW_ORIGINS 推断）
NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL

# 分析开关
ANALYZE=false

# 类型检查开关
SKIP_TYPE_CHECK=false
EOF

echo "✓ 环境变量同步完成"
echo "  NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL"
echo ""
echo "如需修改，请编辑根目录的 .env 文件，然后重新运行:"
echo "  bash scripts/sync-frontend-env.sh"
echo ""
echo "修改后需要重启前端开发服务器:"
echo "  cd frontend && bun run dev"
