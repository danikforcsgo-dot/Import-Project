# KokojamboTrade — Лог разработки (краткое содержание сессий)

> Это автоматически восстановленная сводка по сессиям разработки.
> Полный сырой чат-лог в Replit не сохраняется — агент работает только с итоговыми сводками.

---

## Сводка прогресса

### DCA параметры
- **DCA_LOSS_PCT = 20%** — триггер срабатывает при нереализованном убытке ≥ 20% от залога позиции
- При плече 15× это ~1.33% движения цены против позиции
- Если `pos['collateral']` не задан — DCA пропускается (fallback убран)
- `DCA_MIN_INTERVAL = 3600s` (1 час между усреднениями)
- `MAX_DCA = 10` входов на позицию

### Telegram сообщения
- Блок DCA-анализа показывает процент убытка от залога (`-{current_loss_pct:.1f}% от залога`)
- Показывает оставшиеся USDT до следующего триггера
- Следующая цена DCA рассчитывается через: `entry_price ± target_loss_usdt / qty`

### Reconcile (синхронизация с BingX)
- Эндпоинт: `POST /api/live-trading/reconcile`
- Читает реальные позиции с BingX, удаляет закрытые из БД
- Синхронизирует: `qty` (positionAmt), `collateral` (initialMargin), `entry_price` (avgPrice), `unrealized` (unrealizedProfit)
- Кнопка в дашборде: иконка RefreshCw (↻) в заголовке "Active Position"
- Хук: `useReconcilePositions` в `use-kokojambo.ts`
- Пропс: `onReconcile`/`isReconciling` в BotPanel

### Стратегия (константы)
```
EMA_FAST = 20
EMA_SLOW = 80
ADX_MIN = 15        # для генерации сигнала
OPEN_MIN_ADX = 25   # для реального открытия позиции
SL_ATR = 5.5
TP_ATR = 7.0
LEVERAGE = 15
POSITION_SIZE_PCT = 10%
MAX_DCA = 10
MAX_POSITIONS = 2
TIMEFRAME = 4H
TOKENS_SCANNED = 109
```

### База данных
- `trading_state` (id='live') — источник истины для API-сервера
- `live_trading_state` (id=1) — резервная копия для сканера

### BingX income types (для PnL)
- Включены: `REALIZED_PNL`, `TRADING_FEE`, `FUNDING_FEE`
- Исключены: `TRANSFER`, `TRIAL_FUND`

### Production
- URL: `kokojambotrade1.replit.app` (GCE Reserved VM)
- Запуск: `bash start-production.sh`

---

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `scanner.py` | Основной Python-сканер, логика стратегии и DCA |
| `artifacts/api-server/src/routes/trading.ts` | REST API, reconcile эндпоинт |
| `artifacts/dashboard/src/components/BotPanel.tsx` | Компонент панели бота |
| `artifacts/dashboard/src/hooks/use-kokojambo.ts` | React Query хуки, useReconcilePositions |
| `artifacts/dashboard/src/pages/Dashboard.tsx` | Главная страница дашборда |
| `SYSTEM_DESCRIPTION.md` | Полное описание системы |

---

## Слайды (artifacts/kokojambo-presentation)

Создана презентация из 10 слайдов (Tech Product Dark, Space Grotesk + JetBrains Mono, акцент #00d4aa):

1. Титул — KokojamboTrade
2. Архитектура — Scanner / API Server / Dashboard
3. Торговая стратегия — EMA + ADX + ATR на 4H
4. Управление рисками — SL/TP/R&R/плечо
5. DCA стратегия — 10 входов, триггер 20%
6. Сканер рынка — 109 токенов, asyncio
7. Telegram уведомления — примеры сообщений
8. Dashboard и API — панели и эндпоинты
9. Параметры системы — все константы
10. Tech Stack — закрывающий слайд

---

## Обсуждалось (не реализовано)
- Tinkoff/Мосбиржа бот: обсуждалась feasibility, пользователь сказал "пока не начинать"
