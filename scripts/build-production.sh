#!/bin/sh
set -e

echo "🏗️ Сборка API сервера..."
pnpm --filter @workspace/api-server run build

echo "✅ Сборка завершена"
