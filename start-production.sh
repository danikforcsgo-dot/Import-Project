#!/bin/sh
# Запускает сканер (Python) в фоне + API сервер на переднем плане.
# Используется только в продакшне (artifact.toml).

WORKSPACE="/home/runner/workspace"
cd "$WORKSPACE"

# Проверяем наличие Python
if command -v python3 >/dev/null 2>&1; then
  echo "📦 Установка Python-пакетов для scanner..."
  python3 -m pip install --quiet --disable-pip-version-check \
    ccxt pandas ta requests psycopg2-binary pytz 2>&1 | tail -3 || true

  echo "▶ Запуск scanner.py в фоновом режиме..."
  python3 scanner.py >> /tmp/scanner.log 2>&1 &
  SCANNER_PID=$!
  echo "  scanner.py PID=$SCANNER_PID"

  # При выходе API сервера — останавливаем сканер тоже
  trap 'echo "⏹ Останавливаем сканер PID=$SCANNER_PID"; kill $SCANNER_PID 2>/dev/null; wait $SCANNER_PID 2>/dev/null' EXIT INT TERM
else
  echo "⚠️  Python3 не найден — scanner.py не будет запущен"
fi

echo "▶ Запуск API сервера..."
exec node --enable-source-maps artifacts/api-server/dist/index.cjs
