#!/bin/sh
set -e

echo "📦 Установка Python-пакетов для scanner..."
pip3 install --quiet ccxt pandas ta requests psycopg2-binary pytz

echo "🏗️ Сборка API сервера..."
pnpm --filter @workspace/api-server run build

echo "✅ Сборка завершена"
