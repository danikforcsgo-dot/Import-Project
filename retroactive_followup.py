"""
Одноразовый скрипт: берёт сигналы за последние 2 часа,
считает текущий P&L и отправляет сводку в Telegram.
"""
import os, json, time, requests, ccxt
from datetime import datetime, timezone

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID   = os.environ.get("TELEGRAM_CHAT_ID", "")
DATABASE_URL       = os.environ.get("DATABASE_URL", "")
LEVERAGE           = 15
LOOKBACK_HOURS     = 2

def get_price(exchange, token):
    try:
        bars = exchange.fetch_ohlcv(token, timeframe='1m', limit=2)
        return float(bars[-1][4]) if bars else None
    except Exception as e:
        print(f"  ⚠️ Цена {token}: {e}")
        return None

def send_tg(text):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("Telegram не настроен")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    requests.post(url, data={"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"}, timeout=10)

def main():
    import psycopg2
    conn = psycopg2.connect(DATABASE_URL)
    cur  = conn.cursor()
    cur.execute("""
        SELECT DISTINCT ON (symbol, signal_type)
               symbol, signal_type, price, created_at
          FROM signals
         WHERE created_at > NOW() - INTERVAL '%s hours'
      ORDER BY symbol, signal_type, created_at DESC
    """, (LOOKBACK_HOURS,))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        print("Нет сигналов за последние 2 часа")
        return

    print(f"Найдено {len(rows)} сигналов — получаем текущие цены...")

    exchange = ccxt.bingx({
        "options": {"defaultType": "swap", "adjustForTimeDifference": True}
    })

    lines = [
        f"📊 <b>Ретроспектива сигналов за {LOOKBACK_HOURS}ч</b>",
        f"🕐 Сейчас: {datetime.now(timezone.utc).strftime('%H:%M UTC  %d.%m.%Y')}",
        "━━━━━━━━━━━━━━━━━━━━",
    ]

    for symbol, signal_type, entry_price, created_at in rows:
        current_price = get_price(exchange, symbol)
        sym_clean = symbol.replace("/USDT:USDT","").replace("/USDC:USDC","")
        is_long   = signal_type == "BUY"
        dir_label = "ЛОНГ 🟢" if is_long else "ШОРТ 🔴"

        # Возраст сигнала
        age_min = int((datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)).total_seconds() / 60)
        age_str = f"{age_min//60}ч {age_min%60}м" if age_min >= 60 else f"{age_min}м"

        if current_price is None:
            lines.append(f"❓ <b>{sym_clean}</b> {dir_label}  @${entry_price:.4f}  (цена недоступна)")
            time.sleep(0.3)
            continue

        pnl_raw = (current_price - entry_price) / entry_price * 100 if is_long \
                  else (entry_price - current_price) / entry_price * 100
        pnl_lev = pnl_raw * LEVERAGE
        emoji   = "✅" if pnl_lev >= 0 else "❌"

        lines.append(
            f"{emoji} <b>{sym_clean}</b> {dir_label} ({age_str} назад)\n"
            f"   Вход: ${entry_price:.4f}  →  Сейчас: ${current_price:.4f}\n"
            f"   P&L x{LEVERAGE}: <b>{'+' if pnl_lev>=0 else ''}{pnl_lev:.1f}%</b>  "
            f"(без плеча: {'+' if pnl_raw>=0 else ''}{pnl_raw:.2f}%)"
        )
        time.sleep(0.3)

    message = "\n".join(lines)
    print(message)
    send_tg(message)
    print("\n✅ Отправлено в Telegram!")

if __name__ == "__main__":
    main()
