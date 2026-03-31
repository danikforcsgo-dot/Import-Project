#!/bin/sh
# Запускает API сервер, ждёт пока он поднимется, затем стартует сканер.

WORKSPACE="/home/runner/workspace"
cd "$WORKSPACE"

echo "▶ Запуск API сервера..."
node --enable-source-maps artifacts/api-server/dist/index.cjs &
API_PID=$!
echo "  API сервер PID=$API_PID"

# Ждём пока API поднимется (health check)
echo "⏳ Ожидание API сервера..."
for i in $(seq 1 30); do
  sleep 2
  if curl -sf "http://localhost:8080/api/healthz" >/dev/null 2>&1; then
    echo "✅ API сервер готов (попытка $i)"
    break
  fi
  echo "  ждём... ($i/30)"
done

# Проверяем наличие Python
if command -v python3 >/dev/null 2>&1; then
  echo "📦 Установка Python-пакетов..."
  python3 -m pip install --quiet --disable-pip-version-check \
    ccxt pandas ta requests psycopg2-binary pytz 2>&1 | tail -3 || true

  echo "▶ Запуск scanner.py в фоне..."
  cd "$WORKSPACE"
  python3 scanner.py >> /tmp/scanner.log 2>&1 &
  SCANNER_PID=$!
  echo "  scanner.py PID=$SCANNER_PID"

  echo "▶ Запуск scanner_elliott.py в фоне..."
  python3 scanner_elliott.py >> /tmp/scanner_elliott.log 2>&1 &
  SCANNER_ELLIOTT_PID=$!
  echo "  scanner_elliott.py PID=$SCANNER_ELLIOTT_PID"
else
  echo "⚠️  Python3 не найден — сканеры не будут запущены"
  SCANNER_PID=""
  SCANNER_ELLIOTT_PID=""
fi

# Ждём завершения API (основной процесс)
# При выходе — останавливаем сканеры
cleanup() {
  echo "⏹ Остановка..."
  [ -n "$SCANNER_PID" ]         && kill $SCANNER_PID 2>/dev/null
  [ -n "$SCANNER_ELLIOTT_PID" ] && kill $SCANNER_ELLIOTT_PID 2>/dev/null
  wait $API_PID 2>/dev/null
}
trap cleanup EXIT INT TERM

wait $API_PID
