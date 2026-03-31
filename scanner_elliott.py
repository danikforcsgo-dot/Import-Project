"""
scanner_elliott.py — Стратегия на основе волн Эллиота
=====================================================
Алгоритм:
  1. Строим зигзаг (чередующиеся локальные максимумы и минимумы)
  2. Ищем завершённые 4 волны импульса (L0-H1-L2-H3-L4 для быков)
  3. Валидируем по правилам Эллиота + коэффициентам Фибоначчи
  4. Входим в позицию на откате Волны 4, цель — Волна 5

Работает параллельно с основным scanner.py, использует общее состояние позиций.
"""

import ccxt
import pandas as pd
import numpy as np
import requests
import threading
import time
import os
import json
import hmac
import hashlib
from urllib.parse import urlencode
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta

TZ_MOSCOW = timezone(timedelta(hours=3))

# ===== НАСТРОЙКИ =====
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID   = os.environ.get('TELEGRAM_CHAT_ID')
API_BASE           = "http://localhost:8080"

TOKENS = [
    # --- Mega caps ---
    'BTC/USDT:USDT',
    'ETH/USDT:USDT',
    'BNB/USDT:USDT',
    'XRP/USDT:USDT',
    'SOL/USDT:USDT',
    'ADA/USDT:USDT',
    'DOGE/USDT:USDT',
    'AVAX/USDT:USDT',
    'HYPE/USDT:USDT',
    # --- Large caps ---
    'LINK/USDT:USDT',
    'DOT/USDT:USDT',
    'UNI/USDT:USDT',
    'AAVE/USDT:USDT',
    'LTC/USDT:USDT',
    'BCH/USDT:USDT',
    'NEAR/USDT:USDT',
    'SUI/USDT:USDT',
    'APT/USDT:USDT',
    'INJ/USDT:USDT',
    'OP/USDT:USDT',
    'ARB/USDT:USDT',
    'ZEC/USDT:USDT',
    'XMR/USDT:USDT',
    'PAXG/USDT:USDT',
    'TRX/USDT:USDT',
    'FIL/USDT:USDT',
    'ATOM/USDT:USDT',
    'HBAR/USDT:USDT',
    'XLM/USDT:USDT',
    'ENA/USDT:USDT',
    'LDO/USDT:USDT',
    # --- Mid caps / DeFi ---
    'CRV/USDT:USDT',
    'GMX/USDT:USDT',
    'PENDLE/USDT:USDT',
    'RUNE/USDT:USDT',
    'IMX/USDT:USDT',
    'ZK/USDT:USDT',
    'JUP/USDT:USDT',
    'PYTH/USDT:USDT',
    'POL/USDT:USDT',
    'SEI/USDT:USDT',
    'FET/USDT:USDT',
    'RENDER/USDT:USDT',
    'VIRTUAL/USDT:USDT',
    'ONDO/USDT:USDT',
    'CFX/USDT:USDT',
    'ZRO/USDT:USDT',
    'STRK/USDT:USDT',
    'TIA/USDT:USDT',
    'ALGO/USDT:USDT',
    'ICP/USDT:USDT',
    'WLD/USDT:USDT',
    'WIF/USDT:USDT',
    'FARTCOIN/USDT:USDT',
    'FLOKI/USDT:USDT',
    'PNUT/USDT:USDT',
    'POPCAT/USDT:USDT',
    'MAGIC/USDT:USDT',
    '1000BONK/USDT:USDT',
    '1000PEPE/USDT:USDT',
    'AXS/USDT:USDT',
    'PENGU/USDT:USDT',
    'GRASS/USDT:USDT',
    'PUMP/USDT:USDT',
    'XAN/USDT:USDT',
    'RESOLV/USDT:USDT',
    'REZ/USDT:USDT',
    # --- Newer / нарративы ---
    'KITE/USDT:USDT',
    'ARIA/USDT:USDT',
    'ENSO/USDT:USDT',
    'SIGN/USDT:USDT',
    'IP/USDT:USDT',
    'CC/USDT:USDT',
    'OPN/USDT:USDT',
    'SAHARA/USDT:USDT',
    'UAI/USDT:USDT',
    'BARD/USDT:USDT',
    'PIPPIN/USDT:USDT',
    'RIVER/USDT:USDT',
    'ASTER/USDT:USDT',
    'POWER/USDT:USDT',
    'APR/USDT:USDT',
    'BEAT/USDT:USDT',
    'XPL/USDT:USDT',
    'C/USDT:USDT',
    'BANANAS31/USDT:USDT',
    # --- Группа А ---
    'TAO/USDT:USDT',
    'ENJ/USDT:USDT',
    'KAITO/USDT:USDT',
    'BERA/USDT:USDT',
    'STX/USDT:USDT',
    'AIXBT/USDT:USDT',
    'KAS/USDT:USDT',
    'MOVE/USDT:USDT',
    # --- Группа Б ---
    'W/USDT:USDT',
    'ETHFI/USDT:USDT',
    'IO/USDT:USDT',
    'ORCA/USDT:USDT',
    'API3/USDT:USDT',
    'DRIFT/USDT:USDT',
    'ZORA/USDT:USDT',
    'CATI/USDT:USDT',
]

# ===== ПАРАМЕТРЫ СТРАТЕГИИ =====
TIMEFRAME          = '4h'
CANDLE_LIMIT       = 200    # количество свечей для анализа
ZZ_DEPTH           = 5      # минимум свечей между пивотами зигзага
MAX_W4_AGE_BARS    = 6      # волна 4 должна быть не старше N свечей
MAX_ENTRY_DRIFT    = 0.04   # максимальное расстояние от L4 до текущей цены (4%)

# Фибоначчи для валидации
FIB_W2_RET_MIN     = 0.236  # W2 откатывает минимум 23.6% от W1
FIB_W2_RET_MAX     = 0.886  # W2 откатывает максимум 88.6% от W1
FIB_W4_RET_MIN     = 0.146  # W4 откатывает минимум 14.6% от W3
FIB_W4_RET_MAX     = 0.764  # W4 откатывает максимум 76.4% от W3

# ===== LIVE TRADING =====
LIVE_LEVERAGE      = 15
POSITION_SIZE_PCT  = 0.10   # 10% баланса на первый вход
MAX_POSITIONS      = 100    # без ограничений
SIGNAL_COOLDOWN    = 14400  # 4 часа между сигналами по одному токену
SCAN_WORKERS       = 8

BINGX_BASE         = "https://open-api.bingx.com"
BINGX_API_KEY      = os.environ.get('BINGX_API_KEY', '')
BINGX_SECRET_KEY   = os.environ.get('BINGX_SECRET_KEY', '')

SENT_SIGNALS_FILE  = "sent_signals_elliott.json"
ELLIOTT_HISTORY_FILE = "elliott_history.json"
HISTORY_KEEP_HOURS = 48   # храним историю 48ч для ретроспектив


# ===== TELEGRAM =====
def send_telegram(message: str, force: bool = False) -> int:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return 0
    try:
        r = requests.post(
            f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage',
            json={'chat_id': TELEGRAM_CHAT_ID, 'text': message,
                  'parse_mode': 'HTML', 'disable_web_page_preview': True},
            timeout=10
        )
        data = r.json()
        if data.get('ok'):
            return data['result']['message_id']
    except Exception as e:
        print(f"⚠️ Telegram error: {e}", flush=True)
    return 0


# ===== BINGX API =====
def _bingx_sign(params: dict) -> str:
    query = urlencode(sorted(params.items()))
    return hmac.new(BINGX_SECRET_KEY.encode(), query.encode(), hashlib.sha256).hexdigest()

def bingx_post_api(path: str, params: dict = None) -> dict:
    params = params or {}
    params['timestamp'] = int(time.time() * 1000)
    params['signature'] = _bingx_sign(params)
    headers = {'X-BX-APIKEY': BINGX_API_KEY}
    r = requests.post(f"{BINGX_BASE}{path}", params=params, headers=headers, timeout=10)
    return r.json()

def bingx_get_api(path: str, params: dict = None) -> dict:
    params = params or {}
    params['timestamp'] = int(time.time() * 1000)
    params['signature'] = _bingx_sign(params)
    headers = {'X-BX-APIKEY': BINGX_API_KEY}
    r = requests.get(f"{BINGX_BASE}{path}", params=params, headers=headers, timeout=10)
    return r.json()

def bingx_symbol(token: str) -> str:
    return token.replace('/USDT:USDT', '-USDT').replace('/USDC:USDC', '-USDC')

def get_bingx_balance() -> float:
    try:
        r = bingx_get_api('/openApi/swap/v2/user/balance')
        if r.get('code') == 0:
            return float(r['data']['balance'].get('availableMargin', 0))
    except Exception as e:
        print(f"⚠️ Balance error: {e}", flush=True)
    return 0.0


# ===== STATE (через API сервер) =====
def load_live() -> dict:
    try:
        r = requests.get(f"{API_BASE}/api/live-trading", timeout=5)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return {'open_positions': [], 'balance': 0, 'initial_balance': 0}

def save_live(state: dict):
    try:
        requests.post(f"{API_BASE}/api/live-trading", json=state, timeout=5)
    except Exception as e:
        print(f"⚠️ save_live error: {e}", flush=True)

def is_bot_enabled() -> bool:
    try:
        r = requests.get(f"{API_BASE}/api/live-trading", timeout=3)
        if r.status_code == 200:
            return bool(r.json().get('botEnabled', False))
    except Exception:
        pass
    return False


# ===== COOLDOWN СИГНАЛОВ =====
def load_sent_signals() -> dict:
    try:
        if os.path.exists(SENT_SIGNALS_FILE):
            with open(SENT_SIGNALS_FILE) as f:
                data = json.load(f)
            now_ms = int(time.time() * 1000)
            return {k: v for k, v in data.items()
                    if now_ms - v < SIGNAL_COOLDOWN * 1000}
    except Exception:
        pass
    return {}

def save_sent_signals(signals: dict):
    try:
        with open(SENT_SIGNALS_FILE, 'w') as f:
            json.dump(signals, f)
    except Exception:
        pass


# ===== ИСТОРИЯ СИГНАЛОВ ДЛЯ РЕТРОСПЕКТИВЫ =====
def load_history() -> dict:
    try:
        if os.path.exists(ELLIOTT_HISTORY_FILE):
            with open(ELLIOTT_HISTORY_FILE) as f:
                data = json.load(f)
            cutoff_ms = int(time.time() * 1000) - HISTORY_KEEP_HOURS * 3600 * 1000
            return {k: v for k, v in data.items() if v.get('ts', 0) > cutoff_ms}
    except Exception:
        pass
    return {}

def save_history(history: dict):
    try:
        with open(ELLIOTT_HISTORY_FILE, 'w') as f:
            json.dump(history, f)
    except Exception:
        pass


def send_elliott_retrospective():
    """Считает P&L по всем Elliott-сигналам за последние 48ч и шлёт в Telegram."""
    history = load_history()
    if not history:
        print("〽️ ELLIOTT Retro: нет сигналов в истории", flush=True)
        return

    now_ms  = int(time.time() * 1000)
    now_str = datetime.now(TZ_MOSCOW).strftime('%H:%M  %d.%m.%Y')
    results = []

    for token, rec in history.items():
        try:
            bars = get_exchange().fetch_ohlcv(token, timeframe='1m', limit=2)
            cur_price = float(bars[-1][4]) if bars else None
        except Exception:
            cur_price = None
        time.sleep(0.15)

        entry   = rec['price']
        is_long = rec['direction'] == 'LONG'
        age_sec = (now_ms - rec['ts']) / 1000
        age_str = (f"{int(age_sec//3600)}ч {int((age_sec%3600)//60)}м"
                   if age_sec >= 3600 else f"{int(age_sec//60)}м")

        if cur_price is None:
            results.append({'sym': rec['sym'], 'is_long': is_long,
                            'age': age_str, 'error': True,
                            'tp_min': rec.get('tp_min'), 'tp_main': rec.get('tp_main'),
                            'tp_ext': rec.get('tp_ext'), 'entry': entry})
            continue

        if is_long:
            pnl_pct = (cur_price - entry) / entry * 100
        else:
            pnl_pct = (entry - cur_price) / entry * 100

        results.append({
            'sym':    rec['sym'],
            'is_long': is_long,
            'age':    age_str,
            'entry':  entry,
            'cur':    cur_price,
            'pnl':    pnl_pct,
            'tp_min': rec.get('tp_min'),
            'tp_main': rec.get('tp_main'),
            'tp_ext': rec.get('tp_ext'),
            'error':  False,
        })

    if not results:
        return

    valid  = [r for r in results if not r['error']]
    wins   = sum(1 for r in valid if r['pnl'] >= 0)
    total  = len(valid)
    avg_pnl = sum(r['pnl'] for r in valid) / total if total > 0 else 0

    # Сортируем: лучший P&L сверху
    valid_sorted = sorted(valid, key=lambda r: -r['pnl'])

    lines = []
    for r in valid_sorted:
        d_emoji = '🟢' if r['is_long'] else '🔴'
        pnl_e   = '✅' if r['pnl'] >= 0 else '❌'
        sign    = '+' if r['pnl'] >= 0 else ''

        # Показываем достигнутые цели
        goals = []
        if r['is_long']:
            if r['cur'] >= r['tp_ext']:  goals.append('🎯×1.618')
            elif r['cur'] >= r['tp_main']: goals.append('🎯×1.0')
            elif r['cur'] >= r['tp_min']:  goals.append('🎯×0.618')
        else:
            if r['cur'] <= r['tp_ext']:  goals.append('🎯×1.618')
            elif r['cur'] <= r['tp_main']: goals.append('🎯×1.0')
            elif r['cur'] <= r['tp_min']:  goals.append('🎯×0.618')

        goal_str = '  ' + ' '.join(goals) if goals else ''
        lines.append(
            f"{pnl_e} {d_emoji} <b>{r['sym']}</b>  {sign}{r['pnl']:.2f}%{goal_str}\n"
            f"   ${r['entry']:,.4f} → ${r['cur']:,.4f}  ·  {r['age']}"
        )

    err_part = f"  ·  {len(results)-total} ошибок" if len(results) > total else ""
    avg_e = '✅' if avg_pnl >= 0 else '❌'
    avg_sign = '+' if avg_pnl >= 0 else ''

    msg = (
        f"〽️ <b>Elliott — ретроспектива</b>\n"
        f"⏰ {now_str}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📊 Сигналов: {total}  ·  ✅ {wins}  ·  ❌ {total-wins}{err_part}\n"
        f"{avg_e} Средний P&L: <b>{avg_sign}{avg_pnl:.2f}%</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        + "\n\n".join(lines)
    )
    send_telegram(msg, force=True)
    print(f"〽️ ELLIOTT Retro: отправлено {total} сигналов, avg P&L {avg_sign}{avg_pnl:.2f}%", flush=True)


def _retro_thread():
    """Фоновый поток: ретроспектива каждые 4 часа (по UTC-границам 4H свечей)."""
    # Первый раз — ждём следующей 4H границы
    _utc = datetime.now(timezone.utc)
    _cur = (_utc.hour // 4) * 4
    _nxt = _utc.replace(hour=0, minute=0, second=0,
                        microsecond=0) + timedelta(hours=_cur + 4)
    if _nxt <= _utc:
        _nxt += timedelta(hours=4)
    _wait = max(30, (_nxt - _utc).total_seconds())
    _msk  = datetime.fromtimestamp(_nxt.timestamp(), TZ_MOSCOW).strftime('%H:%M МСК')
    print(f"〽️ ELLIOTT Retro: первая ретроспектива в {_msk}", flush=True)
    time.sleep(_wait)

    while True:
        try:
            send_elliott_retrospective()
        except Exception as e:
            print(f"〽️ ELLIOTT Retro ошибка: {e}", flush=True)
        time.sleep(4 * 3600)


# ===== ДАННЫЕ С БИРЖИ =====
_exchange = None
def get_exchange():
    global _exchange
    if _exchange is None:
        _exchange = ccxt.bingx({
            'options': {'defaultType': 'swap', 'adjustForTimeDifference': True},
            'apiKey': BINGX_API_KEY,
            'secret': BINGX_SECRET_KEY,
        })
    return _exchange

def fetch_ohlcv(symbol: str) -> pd.DataFrame | None:
    try:
        bars = get_exchange().fetch_ohlcv(symbol, timeframe=TIMEFRAME, limit=CANDLE_LIMIT)
        if not bars or len(bars) < 50:
            return None
        df = pd.DataFrame(bars, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df = df.astype({'open': float, 'high': float, 'low': float,
                        'close': float, 'volume': float})
        return df
    except Exception as e:
        print(f"⚠️ OHLCV {symbol}: {e}", flush=True)
        return None


# ===== ВСПОМОГАТЕЛЬНЫЕ ИНДИКАТОРЫ =====
def calc_adx(df: pd.DataFrame, period: int = 14) -> float:
    high = df['high'].values
    low  = df['low'].values
    close = df['close'].values
    n = len(df)
    if n < period + 1:
        return 0.0
    tr  = np.zeros(n)
    pdm = np.zeros(n)
    ndm = np.zeros(n)
    for i in range(1, n):
        tr[i]  = max(high[i] - low[i], abs(high[i] - close[i-1]), abs(low[i] - close[i-1]))
        pdm[i] = max(high[i] - high[i-1], 0) if high[i] - high[i-1] > low[i-1] - low[i] else 0
        ndm[i] = max(low[i-1] - low[i], 0) if low[i-1] - low[i] > high[i] - high[i-1] else 0
    def smooth(arr, p):
        s = np.zeros(n)
        s[p] = arr[1:p+1].sum()
        for i in range(p+1, n):
            s[i] = s[i-1] - s[i-1]/p + arr[i]
        return s
    atr  = smooth(tr, period)
    pdi  = smooth(pdm, period)
    ndi  = smooth(ndm, period)
    with np.errstate(divide='ignore', invalid='ignore'):
        pdi14 = np.where(atr > 0, 100 * pdi / atr, 0)
        ndi14 = np.where(atr > 0, 100 * ndi / atr, 0)
        dx    = np.where(pdi14 + ndi14 > 0,
                         100 * np.abs(pdi14 - ndi14) / (pdi14 + ndi14), 0)
    adx = smooth(dx, period)
    return float(adx[-1])


# ===== ЗИГЗАГ =====
def build_zigzag(df: pd.DataFrame, depth: int = 5) -> list[tuple]:
    """
    Возвращает список (bar_index, 'H'|'L', price) — чередующиеся пивоты.
    H = локальный максимум по high, L = локальный минимум по low.
    """
    highs = df['high'].values
    lows  = df['low'].values
    n     = len(df)

    pivot_highs = []
    pivot_lows  = []
    for i in range(depth, n - depth):
        window_h = highs[max(0, i - depth): i + depth + 1]
        if highs[i] == window_h.max():
            pivot_highs.append(i)
        window_l = lows[max(0, i - depth): i + depth + 1]
        if lows[i] == window_l.min():
            pivot_lows.append(i)

    events = [(i, 'H', highs[i]) for i in pivot_highs] + \
             [(i, 'L', lows[i])  for i in pivot_lows]
    events.sort(key=lambda x: x[0])

    zigzag: list[tuple] = []
    for idx, ptype, price in events:
        if not zigzag or zigzag[-1][1] != ptype:
            zigzag.append((idx, ptype, price))
        else:
            # Одинаковый тип — оставляем более экстремальный
            if ptype == 'H' and price > zigzag[-1][2]:
                zigzag[-1] = (idx, ptype, price)
            elif ptype == 'L' and price < zigzag[-1][2]:
                zigzag[-1] = (idx, ptype, price)

    return zigzag


# ===== ПОИСК ВОЛНЫ ЭЛЛИОТА =====
def find_elliott_signal(df: pd.DataFrame) -> dict | None:
    """
    Ищет завершённую 4-волновую структуру (бычью или медвежью).
    Возвращает сигнал или None.
    """
    if len(df) < 30:
        return None

    zigzag = build_zigzag(df, depth=ZZ_DEPTH)
    if len(zigzag) < 5:
        return None

    current_bar   = len(df) - 1
    current_price = float(df['close'].iloc[-1])
    adx           = calc_adx(df)

    # --- Проверяем последние 5 пивотов ---
    for start in range(len(zigzag) - 5, -1, -1):
        pts = zigzag[start: start + 5]
        types = [t for _, t, _ in pts]

        # === БЫЧИЙ ИМПУЛЬС: L-H-L-H-L ===
        if types == ['L', 'H', 'L', 'H', 'L']:
            L0_bar, _, L0 = pts[0]
            H1_bar, _, H1 = pts[1]
            L2_bar, _, L2 = pts[2]
            H3_bar, _, H3 = pts[3]
            L4_bar, _, L4 = pts[4]

            W1 = H1 - L0
            W2 = H1 - L2
            W3 = H3 - L2
            W4 = H3 - L4

            if W1 <= 0 or W3 <= 0:
                continue

            # Правила Эллиота
            w2_ret = W2 / W1
            w4_ret = W4 / W3

            # Правило 1: W2 откат 23.6%-88.6% от W1
            if not (FIB_W2_RET_MIN <= w2_ret <= FIB_W2_RET_MAX):
                continue
            # Правило 2: L2 > L0 (W2 не пробивает начало W1)
            if L2 <= L0:
                continue
            # Правило 3: W3 > W1 (W3 не самая короткая)
            if W3 <= W1:
                continue
            # Правило 4: H3 > H1 (W3 превышает конец W1)
            if H3 <= H1:
                continue
            # Правило 5: W4 откат 14.6%-76.4% от W3
            if not (FIB_W4_RET_MIN <= w4_ret <= FIB_W4_RET_MAX):
                continue
            # Правило 6: L4 > H1 (W4 не перекрывает W1) — ключевое правило!
            if L4 <= H1:
                continue
            # Волна 4 должна быть свежей
            if current_bar - L4_bar > MAX_W4_AGE_BARS:
                continue
            # Цена рядом с дном W4 (не ушла далеко вверх)
            if current_price > L4 * (1 + MAX_ENTRY_DRIFT):
                continue

            # Цели Волны 5 (Фибоначчи от длины W1)
            tp_min  = L4 + W1 * 0.618
            tp_main = L4 + W1 * 1.000
            tp_ext  = L4 + W1 * 1.618

            return {
                'signal':    'BUY',
                'direction': 'LONG',
                'price':     current_price,
                'L0': L0, 'H1': H1, 'L2': L2, 'H3': H3, 'L4': L4,
                'W1': W1, 'W2': W2, 'W3': W3, 'W4': W4,
                'w2_ret': w2_ret, 'w4_ret': w4_ret,
                'tp_min':  tp_min,
                'tp_main': tp_main,
                'tp_ext':  tp_ext,
                'sl':      L4 - W1 * 0.382,
                'adx':     adx,
                'wave4_bars_ago': current_bar - L4_bar,
            }

        # === МЕДВЕЖИЙ ИМПУЛЬС: H-L-H-L-H ===
        if types == ['H', 'L', 'H', 'L', 'H']:
            H0_bar, _, H0 = pts[0]
            L1_bar, _, L1 = pts[1]
            H2_bar, _, H2 = pts[2]
            L3_bar, _, L3 = pts[3]
            H4_bar, _, H4 = pts[4]

            W1 = H0 - L1
            W2 = H2 - L1
            W3 = H2 - L3
            W4 = H4 - L3

            if W1 <= 0 or W3 <= 0:
                continue

            w2_ret = W2 / W1
            w4_ret = W4 / W3

            if not (FIB_W2_RET_MIN <= w2_ret <= FIB_W2_RET_MAX):
                continue
            if H2 >= H0:
                continue
            if W3 <= W1:
                continue
            if L3 >= L1:
                continue
            if not (FIB_W4_RET_MIN <= w4_ret <= FIB_W4_RET_MAX):
                continue
            if H4 >= L1:
                continue
            if current_bar - H4_bar > MAX_W4_AGE_BARS:
                continue
            if current_price < H4 * (1 - MAX_ENTRY_DRIFT):
                continue

            tp_min  = H4 - W1 * 0.618
            tp_main = H4 - W1 * 1.000
            tp_ext  = H4 - W1 * 1.618

            return {
                'signal':    'SELL',
                'direction': 'SHORT',
                'price':     current_price,
                'H0': H0, 'L1': L1, 'H2': H2, 'L3': L3, 'H4': H4,
                'W1': W1, 'W2': W2, 'W3': W3, 'W4': W4,
                'w2_ret': w2_ret, 'w4_ret': w4_ret,
                'tp_min':  tp_min,
                'tp_main': tp_main,
                'tp_ext':  tp_ext,
                'sl':      H4 + W1 * 0.382,
                'adx':     adx,
                'wave4_bars_ago': current_bar - H4_bar,
            }

    return None


# ===== ОТКРЫТИЕ ПОЗИЦИИ =====
def open_live_position(signal: dict, token: str, state: dict):
    if not BINGX_API_KEY or not BINGX_SECRET_KEY:
        print("⚠️ BingX API keys not set — skipping", flush=True)
        return

    positions = state.get('open_positions', [])
    for p in positions:
        if p.get('token') == token:
            print(f"⏭️ {token} уже открыт — пропускаем", flush=True)
            return
    if len(positions) >= MAX_POSITIONS:
        print(f"⏭️ Лимит позиций — пропускаем {token}", flush=True)
        return

    sym        = bingx_symbol(token)
    is_long    = signal['signal'] == 'BUY'
    pos_side   = 'LONG' if is_long else 'SHORT'
    order_side = 'BUY'  if is_long else 'SELL'
    entry      = signal['price']

    balance = get_bingx_balance()
    if balance <= 0:
        print(f"⚠️ Баланс = {balance} — пропускаем", flush=True)
        return

    try:
        bingx_post_api('/openApi/swap/v2/trade/leverage',
                       {'symbol': sym, 'side': pos_side, 'leverage': LIVE_LEVERAGE})
    except Exception as e:
        print(f"⚠️ Leverage error: {e}", flush=True)

    collateral = balance * POSITION_SIZE_PCT
    qty        = round(collateral * LIVE_LEVERAGE / entry, 4)
    if qty <= 0:
        print(f"⚠️ qty = {qty} — пропускаем", flush=True)
        return

    try:
        resp = bingx_post_api('/openApi/swap/v2/trade/order', {
            'symbol': sym, 'side': order_side, 'positionSide': pos_side,
            'type': 'MARKET', 'quantity': qty,
        })
        if resp.get('code') != 0:
            msg = resp.get('msg', 'Unknown error')
            print(f"❌ BingX error: {msg}", flush=True)
            send_telegram(f"❌ ELLIOTT: ошибка открытия {sym}:\n{msg}", force=True)
            return
        actual_entry = float(resp.get('data', {}).get('order', {}).get('avgPrice', entry) or entry)
    except Exception as e:
        print(f"❌ BingX exception: {e}", flush=True)
        send_telegram(f"❌ ELLIOTT: исключение {sym}: {e}", force=True)
        return

    if state.get('initial_balance', 0) == 0:
        state['initial_balance'] = balance

    new_pos = {
        'token':          token,
        'direction':      signal['signal'],
        'entry_price':    actual_entry,
        'qty':            qty,
        'tp':             float(signal.get('tp_main', 0)),
        'sl':             0.0,
        'atr':            0.0,
        'adx':            float(signal.get('adx', 0)),
        'best_price':     actual_entry,
        'collateral':     collateral,
        'position_value': collateral * LIVE_LEVERAGE,
        'opened_at':      datetime.now(TZ_MOSCOW).isoformat(),
        'bingx_symbol':   sym,
        'dca_entries':    1,
        'last_dca_at':    None,
        'strategy':       'elliott',
    }
    state.setdefault('open_positions', []).append(new_pos)
    state['balance'] = balance
    save_live(state)

    sym_clean = token.replace('/USDT:USDT', '').replace('/USDC:USDC', '')
    dir_emoji = '🟢 ЛОНГ' if is_long else '🔴 ШОРТ'
    sig = signal

    if is_long:
        waves_text = (
            f"   W1: ${sig['L0']:,.4f} → ${sig['H1']:,.4f}  (+{sig['W1']/sig['L0']*100:.1f}%)\n"
            f"   W2: откат {sig['w2_ret']*100:.1f}% → ${sig['L2']:,.4f}\n"
            f"   W3: ${sig['L2']:,.4f} → ${sig['H3']:,.4f}  (+{sig['W3']/sig['L2']*100:.1f}%)\n"
            f"   W4: откат {sig['w4_ret']*100:.1f}% → ${sig['L4']:,.4f}\n"
            f"   W5: ожидаем ↑ от ${actual_entry:,.4f}"
        )
        tp_text = (
            f"   Мин  (61.8%): ${sig['tp_min']:,.4f}\n"
            f"   Осн (100%):  ${sig['tp_main']:,.4f}\n"
            f"   Расш (161.8%): ${sig['tp_ext']:,.4f}"
        )
    else:
        waves_text = (
            f"   W1: ${sig['H0']:,.4f} → ${sig['L1']:,.4f}  (-{sig['W1']/sig['H0']*100:.1f}%)\n"
            f"   W2: откат {sig['w2_ret']*100:.1f}% → ${sig['H2']:,.4f}\n"
            f"   W3: ${sig['H2']:,.4f} → ${sig['L3']:,.4f}  (-{sig['W3']/sig['H2']*100:.1f}%)\n"
            f"   W4: откат {sig['w4_ret']*100:.1f}% → ${sig['H4']:,.4f}\n"
            f"   W5: ожидаем ↓ от ${actual_entry:,.4f}"
        )
        tp_text = (
            f"   Мин  (61.8%): ${sig['tp_min']:,.4f}\n"
            f"   Осн (100%):  ${sig['tp_main']:,.4f}\n"
            f"   Расш (161.8%): ${sig['tp_ext']:,.4f}"
        )

    msg = (
        f"〽️ {dir_emoji} <b>ВОЛНЫ ЭЛЛИОТА — ВХОД 💸</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📊 <b>{sym_clean}</b>  ·  {TIMEFRAME.upper()}  ·  ADX {sig['adx']:.1f}\n"
        f"💰 Вход:  <b>${actual_entry:,.4f}</b>\n"
        f"📦 Залог: ${collateral:,.2f}  (x{LIVE_LEVERAGE} = ${collateral*LIVE_LEVERAGE:,.2f})\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🌊 <b>Волновая структура:</b>\n"
        f"{waves_text}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🎯 <b>Цели Волны 5:</b>\n"
        f"{tp_text}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"⏰ {datetime.now(TZ_MOSCOW).strftime('%H:%M  %d.%m.%Y')}"
    )
    send_telegram(msg, force=True)
    print(f"💸 ELLIOTT {signal['direction']} opened: {sym} @ ${actual_entry:,.4f}", flush=True)


# ===== СКАН ОДНОГО ТОКЕНА =====
def scan_token(token: str) -> tuple[str, dict | None]:
    try:
        df = fetch_ohlcv(token)
        if df is None:
            return token, None
        signal = find_elliott_signal(df)
        return token, signal
    except Exception as e:
        print(f"⚠️ scan_token {token}: {e}", flush=True)
        return token, None


# ===== ГЛАВНЫЙ ЦИКЛ =====
def main():
    print("〽️ Elliott Wave Scanner запущен", flush=True)
    send_telegram("〽️ <b>Elliott Wave Scanner запущен</b>\n"
                  f"Таймфрейм: {TIMEFRAME.upper()}  ·  Токенов: {len(TOKENS)}", force=True)

    # Фоновый поток ретроспективы
    _t = threading.Thread(target=_retro_thread, daemon=True, name="elliott-retro")
    _t.start()

    sent_signals: dict = load_sent_signals()
    _last_scanned_ts   = 0

    while True:
        _utc_now      = datetime.now(timezone.utc)
        _cur_4h_hour  = (_utc_now.hour // 4) * 4
        _cur_candle_ts = int(_utc_now.replace(
            hour=_cur_4h_hour, minute=0, second=0, microsecond=0).timestamp())

        # Уже сканировали эту свечу?
        if _last_scanned_ts >= _cur_candle_ts:
            _next_dt    = _utc_now.replace(hour=_cur_4h_hour, minute=0,
                                           second=0, microsecond=0) + timedelta(hours=4)
            _sleep_secs = max(30, (_next_dt - _utc_now).total_seconds())
            _msk_str    = datetime.fromtimestamp(_next_dt.timestamp(),
                                                 TZ_MOSCOW).strftime('%H:%M МСК %d.%m')
            print(f"✅ ELLIOTT: свеча {_cur_4h_hour:02d}:00 UTC просканирована — "
                  f"следующая в {_msk_str}", flush=True)
            time.sleep(_sleep_secs)
            continue

        # Свеча устарела (бот был выключен)?
        _STALE = 10 * 60
        _age   = _utc_now.timestamp() - _cur_candle_ts
        if _age > _STALE:
            _next_dt    = _utc_now.replace(hour=_cur_4h_hour, minute=0,
                                           second=0, microsecond=0) + timedelta(hours=4)
            _sleep_secs = max(30, (_next_dt - _utc_now).total_seconds())
            print(f"⏭️ ELLIOTT: свеча устарела ({_age/60:.0f} мин) — пропускаем", flush=True)
            _last_scanned_ts = _cur_candle_ts
            time.sleep(_sleep_secs)
            continue

        # Ждём 10 мин: сначала отрабатывает основной сканер, потом Elliott
        print(f"⏳ ELLIOTT: новая {TIMEFRAME.upper()} свеча — ждём 10 мин (после основного сканера)...", flush=True)
        time.sleep(600)
        _last_scanned_ts = _cur_candle_ts

        # Очищаем устаревшие кулдауны
        now_ms = int(time.time() * 1000)
        sent_signals = {k: v for k, v in sent_signals.items()
                        if now_ms - v < SIGNAL_COOLDOWN * 1000}

        print(f"🔍 ELLIOTT: сканируем {len(TOKENS)} токенов...", flush=True)
        scan_start   = datetime.now()
        signals_found = 0
        pending      = []

        with ThreadPoolExecutor(max_workers=SCAN_WORKERS) as pool:
            future_map = {pool.submit(scan_token, tok): tok for tok in TOKENS}
            for fut in as_completed(future_map):
                token, signal = fut.result()
                if not signal:
                    continue
                if token in sent_signals:
                    continue

                sym_clean = token.replace('/USDT:USDT', '').replace('/USDC:USDC', '')
                signals_found += 1
                sent_signals[token] = now_ms
                pending.append({'signal': signal, 'token': token, 'sym': sym_clean})
                print(f"〽️ ELLIOTT {signal['direction']} {token} @ ${signal['price']:,.6f} "
                      f"ADX={signal['adx']:.1f}", flush=True)

                # Сохраняем в историю для ретроспективы
                _hist = load_history()
                _hist[token] = {
                    'ts':        now_ms,
                    'price':     signal['price'],
                    'direction': signal['direction'],
                    'sym':       sym_clean,
                    'tp_min':    signal.get('tp_min'),
                    'tp_main':   signal.get('tp_main'),
                    'tp_ext':    signal.get('tp_ext'),
                }
                save_history(_hist)

        save_sent_signals(sent_signals)
        scan_elapsed = (datetime.now() - scan_start).total_seconds()

        status_msg = (
            f"〽️ <b>Elliott скан завершён</b> за {scan_elapsed:.0f}с\n"
            f"   {len(TOKENS)} токенов  ·  {signals_found} сигналов"
        )
        print(status_msg.replace('<b>', '').replace('</b>', ''), flush=True)
        send_telegram(status_msg, force=True)

        if pending:
            now_str = datetime.now(TZ_MOSCOW).strftime('%H:%M  %d.%m.%Y')

            # Сводное сообщение
            lines = []
            for i, item in enumerate(pending):
                sig = item['signal']
                sym = item['sym']
                d   = '🟢 ЛОНГ' if sig['signal'] == 'BUY' else '🔴 ШОРТ'
                lines.append(
                    f"〽️ <b>{i+1}. {sym}</b>  {d}\n"
                    f"   ADX {sig['adx']:.1f}  ·  W4 откат {sig['w4_ret']*100:.1f}%  "
                    f"·  ${sig['price']:,.4f}"
                )
            send_telegram(
                f"〽️ <b>Волны Эллиота — {len(pending)} сигнал(а)</b>\n"
                f"⏰ {now_str}\n━━━━━━━━━━━━━━━━━━━━\n"
                + "\n\n".join(lines), force=True
            )

            # Детальное сообщение по каждому сигналу
            for item in pending:
                sig = item['signal']
                sym = item['sym']
                is_long = sig['signal'] == 'BUY'
                dir_emoji = '🟢 ЛОНГ' if is_long else '🔴 ШОРТ'

                if is_long:
                    waves_text = (
                        f"   W1: ${sig['L0']:,.4f} → ${sig['H1']:,.4f}"
                        f"  (+{(sig['H1']-sig['L0'])/sig['L0']*100:.1f}%)\n"
                        f"   W2: откат {sig['w2_ret']*100:.1f}% → ${sig['L2']:,.4f}\n"
                        f"   W3: ${sig['L2']:,.4f} → ${sig['H3']:,.4f}"
                        f"  (+{(sig['H3']-sig['L2'])/sig['L2']*100:.1f}%)\n"
                        f"   W4: откат {sig['w4_ret']*100:.1f}% → ${sig['L4']:,.4f}\n"
                        f"   W5: ожидаем ↑ (вход ~${sig['price']:,.4f})"
                    )
                    tp_text = (
                        f"   61.8%: ${sig['tp_min']:,.4f}"
                        f"  (+{(sig['tp_min']-sig['price'])/sig['price']*100:.1f}%)\n"
                        f"  100%:  ${sig['tp_main']:,.4f}"
                        f"  (+{(sig['tp_main']-sig['price'])/sig['price']*100:.1f}%)\n"
                        f"  161.8%: ${sig['tp_ext']:,.4f}"
                        f"  (+{(sig['tp_ext']-sig['price'])/sig['price']*100:.1f}%)"
                    )
                else:
                    waves_text = (
                        f"   W1: ${sig['H0']:,.4f} → ${sig['L1']:,.4f}"
                        f"  (-{(sig['H0']-sig['L1'])/sig['H0']*100:.1f}%)\n"
                        f"   W2: откат {sig['w2_ret']*100:.1f}% → ${sig['H2']:,.4f}\n"
                        f"   W3: ${sig['H2']:,.4f} → ${sig['L3']:,.4f}"
                        f"  (-{(sig['H2']-sig['L3'])/sig['H2']*100:.1f}%)\n"
                        f"   W4: откат {sig['w4_ret']*100:.1f}% → ${sig['H4']:,.4f}\n"
                        f"   W5: ожидаем ↓ (вход ~${sig['price']:,.4f})"
                    )
                    tp_text = (
                        f"   61.8%: ${sig['tp_min']:,.4f}"
                        f"  (-{(sig['price']-sig['tp_min'])/sig['price']*100:.1f}%)\n"
                        f"  100%:  ${sig['tp_main']:,.4f}"
                        f"  (-{(sig['price']-sig['tp_main'])/sig['price']*100:.1f}%)\n"
                        f"  161.8%: ${sig['tp_ext']:,.4f}"
                        f"  (-{(sig['price']-sig['tp_ext'])/sig['price']*100:.1f}%)"
                    )

                detail_msg = (
                    f"〽️ {dir_emoji} <b>{sym} — Волна 5 формируется</b>\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"📊 Таймфрейм: {TIMEFRAME.upper()}  ·  ADX {sig['adx']:.1f}\n"
                    f"💰 Текущая цена: <b>${sig['price']:,.4f}</b>\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"🌊 <b>Волновая структура:</b>\n"
                    f"{waves_text}\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"🎯 <b>Цели Волны 5 (Фибоначчи):</b>\n"
                    f"{tp_text}\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"⚠️ Решение о входе — за вами\n"
                    f"⏰ {now_str}"
                )
                send_telegram(detail_msg, force=True)
                print(f"〽️ ELLIOTT сигнал отправлен: {sym} {sig['direction']}", flush=True)

        # Спим до следующей 4H свечи
        _now_utc  = datetime.now(timezone.utc)
        _cur_4h   = (_now_utc.hour // 4) * 4
        _next_dt  = _now_utc.replace(hour=0, minute=0, second=0,
                                     microsecond=0) + timedelta(hours=_cur_4h + 4)
        if _next_dt <= _now_utc:
            _next_dt += timedelta(hours=4)
        _sleep    = max(30, (_next_dt - _now_utc).total_seconds())
        _msk_str  = datetime.fromtimestamp(_next_dt.timestamp(),
                                           TZ_MOSCOW).strftime('%H:%M МСК  %d.%m')
        print(f"⏳ ELLIOTT: следующий скан в {_msk_str} "
              f"(через {_sleep/60:.0f} мин)", flush=True)
        time.sleep(_sleep)


if __name__ == '__main__':
    main()
