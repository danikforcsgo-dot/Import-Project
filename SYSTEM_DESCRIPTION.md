# KokojamboTrade — Полное описание системы

> Версия: март 2026 | Для AI-агентов и разработчиков

---

## 1. ОБЩАЯ АРХИТЕКТУРА

```
┌─────────────────────────────────────────────────────────────┐
│                     REPLIT (GCE Reserved VM)                │
│                                                             │
│  ┌───────────────┐    ┌─────────────────┐                  │
│  │  scanner.py   │───▶│  API Server     │◀──── Dashboard   │
│  │  (Python)     │    │  (Express/TS)   │      (React/Vite) │
│  └──────┬────────┘    └────────┬────────┘                  │
│         │                      │                            │
│         ▼                      ▼                            │
│   BingX Futures API      PostgreSQL DB                      │
│   Telegram Bot API       live_trading.json (файл-кэш)       │
└─────────────────────────────────────────────────────────────┘
```

**Три процесса на одной машине:**
- `scanner.py` — Python-процесс, ядро системы. Сканирует биржу, открывает/закрывает позиции, шлёт Telegram.
- `API Server` — Express.js (TypeScript), Node.js. Прокси между дашбордом и базой данных + прямые BingX-запросы.
- `Dashboard` — React + Vite SPA. Дашборд управления. Только для просмотра и ручных команд.

**Деплой:** `start-production.sh` запускает API-сервер, затем `scanner.py` как фоновый процесс.

---

## 2. ТОРГОВАЯ СТРАТЕГИЯ

### Таймфрейм
**4H (4-часовые свечи)** — каждая закрытая 4H свеча проверяется на сигнал.

### Индикаторы (все вычисляются на Python / pandas)

| Индикатор | Параметр | Назначение |
|-----------|----------|------------|
| EMA Fast | 20 | Быстрая экспоненциальная скользящая средняя |
| EMA Slow | 80 | Медленная EMA |
| ADX | 14 | Average Directional Index — сила тренда |
| ATR | 14 | Average True Range — волатильность |
| RSI | 14 | Relative Strength Index (используется для скоринга) |

### Сигналы входа

**LONG (BUY):**
```
1. EMA20 > EMA80               (апстренд)
2. Предыдущая свеча: close ≤ EMA20
   Текущая свеча:   close > EMA20   (crossover снизу вверх)
3. ADX ≥ 15                    (сильный тренд)
```

**SHORT (SELL):**
```
1. EMA20 < EMA80               (даунтренд)
2. Предыдущая свеча: close ≥ EMA20
   Текущая свеча:   close < EMA20   (crossover сверху вниз)
3. ADX ≥ 15                    (сильный тренд)
```

> ВАЖНО: сигнал вычисляется на свече `iloc[-2]` (последняя ЗАКРЫТАЯ свеча), чтобы исключить репейнтинг.

### Стоп-лосс и Тейк-профит (ATR-based)

```
LONG:  SL = entry - 5.5 × ATR
       TP = entry + 7.0 × ATR

SHORT: SL = entry + 5.5 × ATR
       TP = entry - 7.0 × ATR
```

Соотношение Risk/Reward = **1 : 1.27** (7.0 / 5.5)

### Leverage и размер позиции
- **Плечо: ×15** (изолированная маржа на BingX Futures)
- **Размер каждого входа: 10% баланса** (`POSITION_SIZE_PCT = 0.10`)
- **Максимум позиций одновременно: 2** (`MAX_POSITIONS = 2`)

### Условие открытия второй позиции
Новая позиция открывается только если уже открытая позиция находится **в плюсе** (unrealized P&L > 0). Если первая позиция убыточна — новые сделки не открываются.

---

## 3. DCA (Dollar Cost Averaging)

DCA = усреднение позиции при движении цены против нас.

### Параметры
```python
MAX_DCA_ENTRIES    = 10    # максимум входов (включая первый)
DCA_MIN_INTERVAL   = 3600  # минимум 1 час между DCA
DCA_PRICE_DROP_PCT = 0.01  # триггер: цена ушла на 1% от среднего входа
POSITION_SIZE_PCT  = 0.10  # каждый DCA — 10% баланса
```

### Логика DCA

| Вход | Условие по времени | Условие по цене |
|------|--------------------|-----------------|
| #1 (открытие) | Сигнал свечи | — |
| #2 (первый DCA) | ❌ нет | цена -1% от avg_entry |
| #3…#10 | ≥ 1 часа с предыдущего DCA | цена -1% от avg_entry |

**Почему первый DCA без задержки:** первый DCA должен зайти быстро пока движение ещё актуально. Последующие — с часовым ограничением чтобы не скупать бесконечно в один момент.

### Поле `dca_entries` в объекте позиции
- `dca_entries = 1` — только начальный вход
- `dca_entries = 3` — начальный + 2 DCA

При DCA сканер также пересчитывает `avg_entry_price` (средневзвешенная по qty):
```python
total_qty   = old_qty + new_qty
avg_price   = (old_avg * old_qty + new_price * new_qty) / total_qty
```

---

## 4. СПИСОК ТОКЕНОВ (109 пар)

Все пары — USDT-Perpual Futures на BingX. Формат в коде: `BTC/USDT:USDT` (ccxt), формат для BingX API: `BTC-USDT`.

Группы:
- **Mega caps:** BTC, ETH, BNB, XRP, SOL, ADA, DOGE, AVAX, HYPE
- **Large caps:** LINK, DOT, UNI, AAVE, LTC, BCH, NEAR, SUI, APT, INJ, OP, ARB, TRX, FIL, ATOM, HBAR, XLM, ENA, LDO
- **Mid caps / DeFi:** CRV, GMX, PENDLE, RUNE, IMX, ZK, JUP, PYTH, POL, SEI, FET, RENDER, VIRTUAL, ONDO, CFX, ZRO...
- **Группа А:** TAO, ENJ, KAITO, BERA, STX, AIXBT, KAS, MOVE
- **Группа Б:** W, ETHFI, IO, ORCA, API3, DRIFT, ZORA, CATI
- и другие (PENGU, XPL, REZ, SIREN, GMX, BANANAS31 и пр.)

---

## 5. ОСНОВНОЙ ЦИКЛ СКАНЕРА (`scanner.py`)

### Потоки (Threads)

```
main thread        — основной цикл: ждёт 4H свечи, сканирует 109 пар
monitor_thread     — каждые 5 сек: check_live_position() + DCA
daily_thread       — ежедневно в 23:59 МСК: итоговый отчёт
followup_thread    — через 1 час после сигнала: P&L апдейт в Telegram
retrospective_thread — каждые 12ч (00:00 и 12:00 UTC): ретроспективный анализ
```

### Основной цикл (упрощённо)

```
1. Вычисляем timestamp текущей 4H свечи (_cur_candle_ts)
2. Проверяем: не сканировали ли уже эту свечу?
   - если да → sleep до следующей 4H свечи
3. Редактируем Telegram-сообщение предыдущего рейтинга с P&L
4. Записываем _cur_candle_ts в файл и БД (защита от дублей при краше)
5. Ждём 60 секунд (чтобы биржа финализировала данные свечи)
6. Параллельно сканируем все 109 токенов (ThreadPoolExecutor)
   → check_signal(token) для каждого
7. Фильтруем: сигналы с ADX ≥ 15, нет повторного сигнала за 4H
8. Сортируем по ADX (убыв.) + скоринг
9. Отправляем Telegram-рейтинг лучших сигналов
10. Для каждого сигнала:
    a. Проверяем pending (5-минутная задержка перед входом)
    b. Если confirmed → open_live_position()
11. Сохраняем состояние в БД
12. Sleep до следующей 4H свечи
```

### Защита от дублей при рестарте
Timestamp последней просканированной свечи хранится:
- В PostgreSQL (`scanner_status` таблица)
- В файле `last_scanned_candle.txt` (на диске)
- При старте берётся `max(DB_value, file_value)` → если сервер упал и перезапустился в середине периода — та же свеча не сканируется дважды.

---

## 6. ОТКРЫТИЕ ПОЗИЦИИ (`open_live_position`)

```
1. Проверяем: enabled=True в стейте
2. Проверяем: кол-во открытых позиций < MAX_POSITIONS (2)
3. Проверяем: если позиции уже есть — все ли они в плюсе?
4. Устанавливаем leverage: POST /openApi/swap/v2/trade/leverage
5. Вычисляем qty = (balance × POSITION_SIZE_PCT × leverage) / entry_price
6. Размещаем рыночный ордер: POST /openApi/swap/v2/trade/order
   {symbol, side: BUY/SELL, positionSide: LONG/SHORT, type: MARKET, quantity}
7. Получаем среднюю цену заполнения из трейдов
8. Создаём объект позиции в open_positions
9. Отправляем Telegram-уведомление об открытии
10. Сохраняем стейт (save_live)
```

**Объект позиции:**
```json
{
  "token": "CFX/USDT:USDT",
  "bingx_symbol": "CFX-USDT",
  "direction": "BUY",
  "entry_price": 0.0612,
  "qty": 1000.0,
  "collateral": 27.5,
  "position_value": 412.5,
  "dca_entries": 1,
  "last_dca_at": null,
  "missing_on_bingx": 0,
  "sl": 0.0400,
  "tp": 0.0812,
  "best_price": 0.0612,
  "opened_at": "2026-03-24T13:00:00+03:00"
}
```

---

## 7. МОНИТОРИНГ ПОЗИЦИЙ (`_do_check_live_position`)

Вызывается **каждые 5 секунд** из `monitor_thread`.

### Алгоритм для каждой открытой позиции

```
1. Пропускаем если позиция < 30 сек (защита от race condition при открытии)
2. GET /openApi/swap/v2/user/positions?symbol=CFX-USDT
3. Если API вернул ошибку → keep position, continue
4. Если позиция НЕ найдена:
   a. Ждём 5 секунд, повторный запрос
   b. Если снова не найдена → missing_on_bingx += 1
   c. Если missing_on_bingx < 1 → keep position (ждём следующего цикла)
   d. Если missing_on_bingx ≥ 1 (2 проверки подряд) → закрыть позицию
5. Если позиция найдена → missing_on_bingx = 0
6. Проверяем совпадение сторон (LONG/SHORT). Если не совпадает → recover
7. Логируем текущий P&L
```

> ЗАЩИТА от ложных закрытий: требуется ДВА последовательных пустых ответа + немедленный повтор. Это защищает от API-глюков BingX (однажды вернул balance=0, equity=0 — бот неверно закрыл позиции CFX и KAS).

---

## 8. ЗАКРЫТИЕ ПОЗИЦИИ (`_close_single_position`)

Вызывается когда:
- BingX подтвердил что позиция закрыта (TP/SL сработал или вручную)
- Пользователь нажал кнопку "Закрыть" в дашборде

```
1. Вычисляем P&L = (exit - entry) / entry × 100% × leverage
2. Обновляем баланс из BingX
3. Перемещаем позицию из open_positions → trade_history
4. Обновляем статистику (wins/losses, total_pnl)
5. Telegram: уведомление о закрытии с P&L
6. save_live()
```

**Ручное закрытие через кнопку дашборда:**
```
POST /api/live-trading/close-position {token: "CFX/USDT:USDT"}
1. Получаем bingx_symbol из позиции
2. DELETE /openApi/swap/v2/trade/allOpenOrders (отменяем TP/SL ордера)
3. POST /openApi/swap/v2/trade/order (рыночный ордер на закрытие)
4. Убираем позицию из open_positions в БД
```

---

## 9. TELEGRAM БОТ

### Типы сообщений

**1. Рейтинг сигналов (каждые 4H)**
```
📊 Рейтинг сигналов | 12:00 МСК 24.03.2026

#1 🔴 ШОРТ   XRP
   ADX: 28.4 · score: 91

#2 🔴 ШОРТ   SUI
   ADX: 24.1 · score: 87
...

⚠️ Реальных позиций: 0/2
```

Через 4H это сообщение **редактируется** — добавляется P&L каждой пары с момента сигнала:
```
#1 🔴 ШОРТ   XRP    → P&L: +18.5% (×15)
```

**2. Открытие позиции**
```
✅🟢 ЛОНГ РЕАЛЬНАЯ — ОТКРЫТА
📊 Токен: CFX
💰 Вход: $0.0612
📦 Залог: $27.50 USDT | Размер: $412.50
⏰ 13:00  24.03.2026
```

**3. DCA вход**
```
🔄🟢 ЛОНГ — DCA #2
📊 Токен: CFX
💱 Ср. вход (2×DCA): $0.0598
📦 +$27.50 | Итого: $55.00
⏰ 14:05  24.03.2026
```

**4. Закрытие позиции**
```
✅🟢 ЛОНГ РЕАЛЬНАЯ — ЗАКРЫТА 🎉
📊 Токен: CFX
💰 Ср. вход (3×DCA): $0.0580
📤 Выход: $0.0650
📈 P&L: +18.9% | +$15.23
⏰ 20:00  24.03.2026
```

**5. Ежедневный отчёт (23:59 МСК)**
```
📅 Итог дня: 24.03.2026

💰 Сделок: 3 | Побед: 2 | Поражений: 1
📈 P&L дня: +$45.30 (+16.5%)
💼 Баланс: $320.50
```

**6. Followup сигнала (через 1 час)**
```
Обновление через 1 час:
P&L (×15): +12.3%  [$0.0650 → $0.0703]
```

### Хранение ID сообщений
Все отправленные Telegram-сообщения логируются в `tg_message_ids.json` (файл) чтобы можно было редактировать их позже (для P&L обновлений рейтинга).

---

## 10. API SERVER (Express / TypeScript)

**Порт:** 8080 (или `PORT` env var)

### Ключевые эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/live-trading` | Текущий стейт (позиции, баланс, история) |
| POST | `/api/live-trading/sync` | Сканер → сохранить стейт в БД |
| POST | `/api/live-trading/toggle` | Включить/выключить торговлю |
| POST | `/api/live-trading/close-position` | Ручное закрытие позиции |
| GET | `/api/live-trading/balance` | Баланс с BingX |
| GET | `/api/live-trading/position-pnl` | Текущий P&L открытых позиций |
| GET | `/api/live-trading/pnl-analysis` | P&L за период (income API) |
| GET | `/api/scanner/status` | Статус сканера |
| POST | `/api/scanner/status` | Обновить поля статуса сканера |
| POST | `/api/scanner/sleep` | Принудительный sleep сканера |
| GET | `/api/signals` | История сигналов |
| GET | `/api/signals/stats` | Статистика (сегодня/неделя/месяц) |

### Хранение состояния

**PostgreSQL таблицы:**
- `trading_state` (id='live') — основное торговое состояние (JSON)
- `live_trading_state` (id=1) — зеркало для прямых psycopg2-записей из Python
- `scanner_status` — метаданные сканера (lastScanTime, lastScannedCandleTs, lastRankingMsgId и т.д.)
- `signals` — история всех сигналов

**Приоритет чтения:** БД → файл `live_trading.json` (fallback)

**`enabled` флаг:** управляется только через `/toggle`. Сканер не может перезаписать этот флаг через sync.

---

## 11. ДАШБОРД (React + Vite)

**Компоненты:**

| Компонент | Файл | Назначение |
|-----------|------|------------|
| `BotPanel` | `BotPanel.tsx` | Статус бота, кнопки управления, открытые позиции, P&L в реальном времени |
| `StatisticsPanel` | `StatisticsPanel.tsx` | P&L за сегодня/неделю/месяц в USDT и % |
| `SignalsPanel` | `SignalsPanel.tsx` | Лента сигналов с индикаторами |
| `Dashboard` | `Dashboard.tsx` | Главная страница, poll каждые 5-30 сек |

**Polling:** дашборд опрашивает API каждые 5 секунд для P&L, 30 секунд для остального.

---

## 12. ВОССТАНОВЛЕНИЕ ПОСЛЕ РЕСТАРТА

При старте сканера (`start-production.sh` → `scanner.py`):

```
1. Читаем стейт из PostgreSQL
2. Читаем list открытых позиций с BingX (get_bingx_open_positions)
3. Для каждой позиции на BingX:
   - Если нет в open_positions → RECOVER (добавляем)
   - При восстановлении берём dca_entries из trade_history
     (защита от ложных закрытий — сохраняем счётчик DCA)
4. Если были восстановлены позиции → enabled = True
5. save_live() → синхронизируем в БД
6. Telegram: уведомление "Позиция восстановлена после рестарта"
```

---

## 13. СЕКРЕТЫ И ОКРУЖЕНИЕ

| Переменная | Назначение |
|-----------|------------|
| `BINGX_API_KEY` | API ключ BingX |
| `BINGX_SECRET_KEY` | Secret для HMAC-SHA256 подписи |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота |
| `TELEGRAM_CHAT_ID` | ID чата для уведомлений |
| `DATABASE_URL` | PostgreSQL connection string |

**BingX подпись (HMAC-SHA256):**
```python
params_str = urlencode(sorted_params)
signature = hmac.new(secret.encode(), params_str.encode(), hashlib.sha256).hexdigest()
```

---

## 14. ВАЖНЫЕ КОНСТАНТЫ

```python
EMA_FAST          = 20
EMA_SLOW          = 80
ADX_MIN           = 15
ATR_PERIOD        = 14
SL_ATR_MULT       = 5.5
TP_ATR_MULT       = 7.0
TRAIL_PCT         = 0.01     # 1% трейлинг
TIMEFRAME         = '4h'
LIVE_LEVERAGE     = 15
POSITION_SIZE_PCT = 0.10     # 10% баланса на вход
MAX_DCA_ENTRIES   = 10
DCA_MIN_INTERVAL  = 3600     # секунд (1 час)
DCA_PRICE_DROP_PCT = 0.01    # 1% движение для DCA
MAX_POSITIONS     = 2
SIGNAL_COOLDOWN   = 14400    # 4 часа (одна свеча)
CONFIRM_DELAY_MIN = 5        # минут до открытия после сигнала
```

---

## 15. ИЗВЕСТНЫЕ ОСОБЕННОСТИ И БАГИ (исправлены)

1. **BingX API глюк (balance=0)** — исправлено: двойная проверка перед закрытием позиции + счётчик `missing_on_bingx`.

2. **Ложное закрытие при рестарте** — исправлено: `last_scanned_candle.txt` + `max(DB, file)` предотвращает двойной скан.

3. **DCA-счётчик теряется при восстановлении** — исправлено: при recovery читаем `dca_entries` из `trade_history`.

4. **Кнопка "Закрыть позицию" возвращала 500** — исправлено: использовать `bingx_symbol` вместо `token` (формат CFX-USDT vs CFX/USDT:USDT).

5. **Enabled-флаг перезаписывался сканером** — исправлено: при sync сканер читает enabled из БД перед записью.

---

## 16. ПРОДАКШН

- **URL:** `kokojambotrade1.replit.app`
- **Тип:** GCE Reserved VM (Always On — не выключается)
- **Деплой:** Replit Publish (Docker-образ → GCE)
- **БД:** Отдельная production PostgreSQL (не dev)
- **Логи:** `fetch_deployment_logs()` — production, workflow console — dev

---

*Документ актуален на март 2026. Создан для передачи контекста AI-агентам.*
