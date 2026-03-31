"""
elliott_backtest_1d.py — Бэктест Elliott Wave стратегии на 1D за последние 7 дней.

Алгоритм:
  1. Загружает 300 x 1D свечей на каждый токен (1 запрос на токен)
  2. Для каждой из 7 дневных свечей прошлой недели симулирует скан
  3. Записывает найденные сигналы + трекает движение до 30 дней вперёд
  4. Считает P&L (с плечом 15x), % попаданий в TP цели
  5. Отправляет итоговый отчёт в Telegram
"""

import ccxt
import pandas as pd
import numpy as np
import requests
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta

# ===== НАСТРОЙКИ (копия из scanner_elliott.py) =====
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID   = os.environ.get('TELEGRAM_CHAT_ID', '')

TIMEFRAME      = '1d'
CANDLE_LIMIT   = 300   # 200 контекст + 7 неделя + запас для трекинга
WEEK_BARS      = 7     # 7 дней = 7 дневных свечей
MIN_CONTEXT    = 80    # минимум свечей для поиска волн (меньше чем 4H — 1D чище)
ZZ_DEPTH       = 5
MAX_W4_AGE     = 6
MAX_DRIFT      = 0.04
FIB_W2_MIN     = 0.236
FIB_W2_MAX     = 0.886
FIB_W4_MIN     = 0.146
FIB_W4_MAX     = 0.764
LEVERAGE       = 15
SCAN_WORKERS   = 12
COOLDOWN_BARS  = 2     # на 1D кулдаун 2 дня
TRACK_BARS     = 30    # трекаем до 30 дней вперёд

TZ_MOSCOW = timezone(timedelta(hours=3))

TOKENS = [
    'BTC/USDT:USDT', 'ETH/USDT:USDT', 'BNB/USDT:USDT', 'XRP/USDT:USDT',
    'SOL/USDT:USDT', 'ADA/USDT:USDT', 'DOGE/USDT:USDT', 'AVAX/USDT:USDT',
    'HYPE/USDT:USDT', 'LINK/USDT:USDT', 'DOT/USDT:USDT', 'UNI/USDT:USDT',
    'AAVE/USDT:USDT', 'LTC/USDT:USDT', 'BCH/USDT:USDT', 'NEAR/USDT:USDT',
    'SUI/USDT:USDT', 'APT/USDT:USDT', 'INJ/USDT:USDT', 'OP/USDT:USDT',
    'ARB/USDT:USDT', 'ZEC/USDT:USDT', 'XMR/USDT:USDT', 'PAXG/USDT:USDT',
    'TRX/USDT:USDT', 'FIL/USDT:USDT', 'ATOM/USDT:USDT', 'HBAR/USDT:USDT',
    'XLM/USDT:USDT', 'ENA/USDT:USDT', 'LDO/USDT:USDT', 'CRV/USDT:USDT',
    'GMX/USDT:USDT', 'PENDLE/USDT:USDT', 'RUNE/USDT:USDT', 'IMX/USDT:USDT',
    'ZK/USDT:USDT', 'JUP/USDT:USDT', 'PYTH/USDT:USDT', 'POL/USDT:USDT',
    'SEI/USDT:USDT', 'FET/USDT:USDT', 'RENDER/USDT:USDT', 'VIRTUAL/USDT:USDT',
    'ONDO/USDT:USDT', 'CFX/USDT:USDT', 'ZRO/USDT:USDT', 'TIA/USDT:USDT',
    'ALGO/USDT:USDT', 'ICP/USDT:USDT', 'WLD/USDT:USDT', 'WIF/USDT:USDT',
    'FARTCOIN/USDT:USDT', 'FLOKI/USDT:USDT', 'PNUT/USDT:USDT', 'POPCAT/USDT:USDT',
    'MAGIC/USDT:USDT', '1000BONK/USDT:USDT', '1000PEPE/USDT:USDT', 'AXS/USDT:USDT',
    'PENGU/USDT:USDT', 'GRASS/USDT:USDT', 'PUMP/USDT:USDT', 'XAN/USDT:USDT',
    'RESOLV/USDT:USDT', 'REZ/USDT:USDT', 'KITE/USDT:USDT', 'ARIA/USDT:USDT',
    'ENSO/USDT:USDT', 'SIGN/USDT:USDT', 'IP/USDT:USDT', 'CC/USDT:USDT',
    'OPN/USDT:USDT', 'SAHARA/USDT:USDT', 'UAI/USDT:USDT', 'BARD/USDT:USDT',
    'PIPPIN/USDT:USDT', 'RIVER/USDT:USDT', 'ASTER/USDT:USDT', 'POWER/USDT:USDT',
    'APR/USDT:USDT', 'BEAT/USDT:USDT', 'XPL/USDT:USDT', 'C/USDT:USDT',
    'BANANAS31/USDT:USDT', 'TAO/USDT:USDT', 'ENJ/USDT:USDT', 'KAITO/USDT:USDT',
    'BERA/USDT:USDT', 'STX/USDT:USDT', 'AIXBT/USDT:USDT', 'KAS/USDT:USDT',
    'MOVE/USDT:USDT', 'W/USDT:USDT', 'ETHFI/USDT:USDT', 'IO/USDT:USDT',
    'ORCA/USDT:USDT', 'API3/USDT:USDT', 'DRIFT/USDT:USDT', 'ZORA/USDT:USDT',
    'CATI/USDT:USDT',
]


# ===== БИРЖА =====
_exchange = None
def get_exchange():
    global _exchange
    if _exchange is None:
        _exchange = ccxt.bingx({'options': {'defaultType': 'swap'}})
    return _exchange


def send_telegram(msg: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print(msg)
        return
    try:
        requests.post(
            f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage',
            json={'chat_id': TELEGRAM_CHAT_ID, 'text': msg,
                  'parse_mode': 'HTML', 'disable_web_page_preview': True},
            timeout=15
        )
    except Exception as e:
        print(f"Telegram error: {e}")


# ===== ЗИГЗАГ =====
def build_zigzag(highs, lows, depth=ZZ_DEPTH):
    pivots = []
    n = len(highs)
    last_type = None
    last_idx  = 0

    for i in range(depth, n - depth):
        is_high = all(highs[i] >= highs[i-j] for j in range(1, depth+1)) and \
                  all(highs[i] >= highs[i+j] for j in range(1, depth+1))
        is_low  = all(lows[i]  <= lows[i-j]  for j in range(1, depth+1)) and \
                  all(lows[i]  <= lows[i+j]   for j in range(1, depth+1))

        if is_high and last_type != 'H':
            if pivots and pivots[-1][1] == 'H':
                if highs[i] > pivots[-1][2]:
                    pivots[-1] = (i, 'H', highs[i])
            else:
                pivots.append((i, 'H', highs[i]))
            last_type = 'H'
            last_idx  = i
        elif is_low and last_type != 'L':
            if pivots and pivots[-1][1] == 'L':
                if lows[i] < pivots[-1][2]:
                    pivots[-1] = (i, 'L', lows[i])
            else:
                pivots.append((i, 'L', lows[i]))
            last_type = 'L'
            last_idx  = i

    return pivots


# ===== ДЕТЕКТОР ВОЛН ЭЛЛИОТА =====
def detect_elliott(df_slice):
    """Принимает срез df до текущей свечи. Возвращает signal dict или None."""
    if len(df_slice) < MIN_CONTEXT:
        return None

    highs = df_slice['high'].values
    lows  = df_slice['low'].values
    close = df_slice['close'].values
    current_bar   = len(df_slice) - 1
    current_price = close[-1]

    zigzag = build_zigzag(highs, lows)
    if len(zigzag) < 5:
        return None

    for start in range(len(zigzag) - 5, -1, -1):
        pts   = zigzag[start: start + 5]
        types = [t for _, t, _ in pts]

        # БЫЧИЙ: L-H-L-H-L
        if types == ['L', 'H', 'L', 'H', 'L']:
            L0_bar, _, L0 = pts[0]
            H1_bar, _, H1 = pts[1]
            L2_bar, _, L2 = pts[2]
            H3_bar, _, H3 = pts[3]
            L4_bar, _, L4 = pts[4]

            W1 = H1 - L0; W2 = H1 - L2; W3 = H3 - L2; W4 = H3 - L4
            if W1 <= 0 or W3 <= 0:
                continue
            w2r = W2 / W1; w4r = W4 / W3
            if not (FIB_W2_MIN <= w2r <= FIB_W2_MAX): continue
            if L2 <= L0: continue
            if W3 <= W1: continue
            if H3 <= H1: continue
            if not (FIB_W4_MIN <= w4r <= FIB_W4_MAX): continue
            if L4 <= H1: continue
            if current_bar - L4_bar > MAX_W4_AGE: continue
            if current_price > L4 * (1 + MAX_DRIFT): continue

            return {
                'direction': 'LONG',
                'price':  current_price,
                'tp_min':  L4 + W1 * 0.618,
                'tp_main': L4 + W1 * 1.000,
                'tp_ext':  L4 + W1 * 1.618,
                'sl':      L4 - W1 * 0.382,
                'w2_ret':  w2r, 'w4_ret': w4r,
                'W1': W1,
            }

        # МЕДВЕЖИЙ: H-L-H-L-H
        if types == ['H', 'L', 'H', 'L', 'H']:
            H0_bar, _, H0 = pts[0]
            L1_bar, _, L1 = pts[1]
            H2_bar, _, H2 = pts[2]
            L3_bar, _, L3 = pts[3]
            H4_bar, _, H4 = pts[4]

            W1 = H0 - L1; W2 = H2 - L1; W3 = H2 - L3; W4 = H4 - L3
            if W1 <= 0 or W3 <= 0:
                continue
            w2r = W2 / W1; w4r = W4 / W3
            if not (FIB_W2_MIN <= w2r <= FIB_W2_MAX): continue
            if H2 >= H0: continue
            if W3 <= W1: continue
            if L3 >= L1: continue
            if not (FIB_W4_MIN <= w4r <= FIB_W4_MAX): continue
            if H4 >= L1: continue
            if current_bar - H4_bar > MAX_W4_AGE: continue
            if current_price < H4 * (1 - MAX_DRIFT): continue

            return {
                'direction': 'SHORT',
                'price':  current_price,
                'tp_min':  H4 - W1 * 0.618,
                'tp_main': H4 - W1 * 1.000,
                'tp_ext':  H4 - W1 * 1.618,
                'sl':      H4 + W1 * 0.382,
                'w2_ret':  w2r, 'w4_ret': w4r,
                'W1': W1,
            }

    return None


# ===== БЭКТЕСТ ОДНОГО ТОКЕНА =====
def backtest_token(token):
    sym = token.replace('/USDT:USDT', '').replace('/USDC:USDC', '')
    try:
        bars = get_exchange().fetch_ohlcv(token, timeframe=TIMEFRAME, limit=CANDLE_LIMIT)
        if not bars or len(bars) < MIN_CONTEXT + WEEK_BARS:
            return sym, []
    except Exception as e:
        print(f"⚠️ {sym}: ошибка загрузки: {e}")
        return sym, []

    df = pd.DataFrame(bars, columns=['ts', 'open', 'high', 'low', 'close', 'vol'])
    df = df.astype({'open': float, 'high': float, 'low': float, 'close': float})

    total = len(df)
    signals = []
    last_signal_bar = -999  # кулдаун

    # Сканируем каждую из 42 свечей прошлой недели
    for offset in range(WEEK_BARS, 0, -1):
        scan_idx = total - offset          # индекс "текущей" свечи в момент скана
        if scan_idx < MIN_CONTEXT:
            continue
        if scan_idx - last_signal_bar < COOLDOWN_BARS:
            continue

        df_visible = df.iloc[:scan_idx + 1].copy()
        sig = detect_elliott(df_visible)
        if not sig:
            continue

        entry_price = sig['price']
        direction   = sig['direction']
        is_long     = direction == 'LONG'

        # Будущие свечи (после сигнала)
        future = df.iloc[scan_idx + 1:scan_idx + 1 + TRACK_BARS]  # до 30 дней
        if future.empty:
            continue

        # Трекаем цели и P&L
        hit_tp1 = hit_tp2 = hit_tp3 = hit_sl = False
        max_pnl = final_pnl = 0.0

        for _, row in future.iterrows():
            h, l, c = row['high'], row['low'], row['close']
            if is_long:
                if not hit_tp1 and h >= sig['tp_min']:  hit_tp1 = True
                if not hit_tp2 and h >= sig['tp_main']: hit_tp2 = True
                if not hit_tp3 and h >= sig['tp_ext']:  hit_tp3 = True
                if not hit_sl  and l <= sig['sl']:       hit_sl  = True
                bar_pnl = (c - entry_price) / entry_price * 100
            else:
                if not hit_tp1 and l <= sig['tp_min']:  hit_tp1 = True
                if not hit_tp2 and l <= sig['tp_main']: hit_tp2 = True
                if not hit_tp3 and l <= sig['tp_ext']:  hit_tp3 = True
                if not hit_sl  and h >= sig['sl']:       hit_sl  = True
                bar_pnl = (entry_price - c) / entry_price * 100
            max_pnl   = max(max_pnl, bar_pnl)
            final_pnl = bar_pnl

        ts_ms   = int(df.iloc[scan_idx]['ts'])
        bar_dt  = datetime.fromtimestamp(ts_ms / 1000, TZ_MOSCOW)
        bar_str = bar_dt.strftime('%d.%m %H:%M')

        signals.append({
            'sym':       sym,
            'direction': direction,
            'entry':     entry_price,
            'bar_str':   bar_str,
            'tp_min':    sig['tp_min'],
            'tp_main':   sig['tp_main'],
            'tp_ext':    sig['tp_ext'],
            'sl':        sig['sl'],
            'w2_ret':    sig['w2_ret'],
            'w4_ret':    sig['w4_ret'],
            'hit_tp1':   hit_tp1,
            'hit_tp2':   hit_tp2,
            'hit_tp3':   hit_tp3,
            'hit_sl':    hit_sl,
            'max_pnl':   max_pnl,
            'final_pnl': final_pnl,
            'lev_pnl':   final_pnl * LEVERAGE,
        })
        last_signal_bar = scan_idx

    return sym, signals


# ===== ФОРМАТИРОВАНИЕ ОТЧЁТА =====
def format_report(all_signals):
    if not all_signals:
        return "〽️ <b>Elliott Backtest (7 дней)</b>\n\nСигналов не найдено."

    longs  = [s for s in all_signals if s['direction'] == 'LONG']
    shorts = [s for s in all_signals if s['direction'] == 'SHORT']
    wins   = [s for s in all_signals if s['final_pnl'] >= 0]
    tp1s   = [s for s in all_signals if s['hit_tp1']]
    tp2s   = [s for s in all_signals if s['hit_tp2']]
    tp3s   = [s for s in all_signals if s['hit_tp3']]

    total    = len(all_signals)
    win_rate = len(wins) / total * 100 if total > 0 else 0
    avg_raw  = sum(s['final_pnl'] for s in all_signals) / total if total else 0
    avg_lev  = avg_raw * LEVERAGE
    avg_max  = sum(s['max_pnl'] for s in all_signals) / total if total else 0

    sign = '+' if avg_raw >= 0 else ''
    sign_lev = '+' if avg_lev >= 0 else ''

    # Топ-5 лучших сигналов
    top5 = sorted(all_signals, key=lambda s: -s['final_pnl'])[:5]
    top_lines = []
    for s in top5:
        d_e = '🟢' if s['direction'] == 'LONG' else '🔴'
        tps = ''
        if s['hit_tp3']:   tps = ' 🎯×1.618'
        elif s['hit_tp2']: tps = ' 🎯×1.0'
        elif s['hit_tp1']: tps = ' 🎯×0.618'
        sl_e = ' ⛔SL' if s['hit_sl'] else ''
        pnl_sign = '+' if s['final_pnl'] >= 0 else ''
        top_lines.append(
            f"{d_e} <b>{s['sym']}</b> {s['bar_str']}  "
            f"{pnl_sign}{s['final_pnl']:.2f}%{tps}{sl_e}"
        )

    # Топ-5 худших
    bot5 = sorted(all_signals, key=lambda s: s['final_pnl'])[:5]
    bot_lines = []
    for s in bot5:
        d_e = '🟢' if s['direction'] == 'LONG' else '🔴'
        pnl_sign = '+' if s['final_pnl'] >= 0 else ''
        sl_e = ' ⛔SL' if s['hit_sl'] else ''
        bot_lines.append(
            f"{d_e} <b>{s['sym']}</b> {s['bar_str']}  "
            f"{pnl_sign}{s['final_pnl']:.2f}%{sl_e}"
        )

    now_str = datetime.now(TZ_MOSCOW).strftime('%H:%M  %d.%m.%Y')

    report = (
        f"〽️ <b>Elliott Backtest 1D — последние 7 дней (трекинг 30 дн.)</b>\n"
        f"⏰ {now_str}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📊 Всего сигналов: <b>{total}</b>"
        f"  (🟢 {len(longs)} лонг  /  🔴 {len(shorts)} шорт)\n"
        f"✅ Прибыльных: <b>{len(wins)}</b>  ({win_rate:.0f}%)\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"💰 Средний P&L (без плеча): {sign}{avg_raw:.2f}%\n"
        f"💰 Средний P&L (×{LEVERAGE}): <b>{sign_lev}{avg_lev:.1f}%</b>\n"
        f"📈 Ср. макс. движение в плюс: +{avg_max:.2f}%\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🎯 Достигли TP1 (0.618): {len(tp1s)} ({len(tp1s)/total*100:.0f}%)\n"
        f"🎯 Достигли TP2 (1.0×):  {len(tp2s)} ({len(tp2s)/total*100:.0f}%)\n"
        f"🎯 Достигли TP3 (1.618): {len(tp3s)} ({len(tp3s)/total*100:.0f}%)\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🏆 <b>Лучшие сигналы:</b>\n"
        + "\n".join(top_lines) + "\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"💀 <b>Худшие сигналы:</b>\n"
        + "\n".join(bot_lines)
    )
    return report


# ===== ГЛАВНАЯ ФУНКЦИЯ =====
def main():
    now_str = datetime.now(TZ_MOSCOW).strftime('%H:%M  %d.%m.%Y')
    print(f"〽️ Elliott Backtest 1D запущен | {now_str}")
    print(f"   Токенов: {len(TOKENS)} | Период: последние 7 дней (1D) | Трекинг: до 30 дней")

    send_telegram(
        f"〽️ <b>Elliott Backtest 1D запущен...</b>\n"
        f"⏰ {now_str}\n"
        f"Сканирую {len(TOKENS)} токенов × 7 дней (1D) — займёт ~1-2 мин"
    )

    all_signals = []
    done = 0
    errors = 0

    with ThreadPoolExecutor(max_workers=SCAN_WORKERS) as pool:
        future_map = {pool.submit(backtest_token, tok): tok for tok in TOKENS}
        for fut in as_completed(future_map):
            tok = future_map[fut]
            try:
                sym, signals = fut.result()
                all_signals.extend(signals)
                done += 1
                if signals:
                    print(f"  ✅ {sym}: {len(signals)} сигнал(ов)")
                else:
                    print(f"  ○  {sym}: нет сигналов")
            except Exception as e:
                errors += 1
                sym = tok.replace('/USDT:USDT', '')
                print(f"  ⚠️ {sym}: {e}")

    print(f"\n✅ Готово: {done} токенов, {len(all_signals)} сигналов, {errors} ошибок")

    report = format_report(all_signals)
    print("\n" + report.replace('<b>', '').replace('</b>', ''))
    send_telegram(report)


if __name__ == '__main__':
    main()
