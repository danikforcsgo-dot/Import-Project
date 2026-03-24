#!/bin/sh
# Запускает сканер (Python) в фоне + API сервер на переднем плане.
# Используется только в продакшне (artifact.toml).

WORKSPACE="/home/runner/workspace"

echo "▶ Запуск scanner.py в фоновом режиме..."
cd "$WORKSPACE"
python3 scanner.py >> /tmp/scanner.log 2>&1 &
SCANNER_PID=$!
echo "  scanner.py PID=$SCANNER_PID"

# При выходе API сервера — останавливаем сканер тоже
trap 'echo "⏹ Останавливаем сканер PID=$SCANNER_PID"; kill $SCANNER_PID 2>/dev/null; wait $SCANNER_PID 2>/dev/null' EXIT INT TERM

echo "▶ Запуск API сервера..."
cd "$WORKSPACE"
exec node --enable-source-maps artifacts/api-server/dist/index.cjs
