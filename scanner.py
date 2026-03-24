import ccxt
import pandas as pd
import numpy as np
import requests
import shutil
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

# === НАСТРОЙКИ ИЗ SECRETS ===
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')

# === URL ДАШБОРДА ===
DASHBOARD_URL = os.environ.get('DASHBOARD_URL', '')
_IS_PROD = os.environ.get('REPLIT_DEPLOYMENT') == '1'
# Сканер всегда на одной машине с API — используем localhost для всех внутренних вызовов
API_BASE = "http://localhost:8080"

# === СПИСОК ТОКЕНОВ (109 токенов, формат BingX Futures) ===
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
    # --- Группа А (добавлены) ---
    'TAO/USDT:USDT',
    'ENJ/USDT:USDT',
    'KAITO/USDT:USDT',
    'BERA/USDT:USDT',
    'STX/USDT:USDT',
    'AIXBT/USDT:USDT',
    'KAS/USDT:USDT',
    'MOVE/USDT:USDT',
    # --- Группа Б (добавлены) ---
    'W/USDT:USDT',
    'ETHFI/USDT:USDT',
    'IO/USDT:USDT',
    'ORCA/USDT:USDT',
    'API3/USDT:USDT',
    'DRIFT/USDT:USDT',
    'ZORA/USDT:USDT',
    'CATI/USDT:USDT',
]

# === ПАРАМЕТРЫ СТРАТЕГИИ ===
EMA_FAST = 20
EMA_SLOW = 80
ADX_MIN = 15
EMA_BUFFER = 0.0    # без буфера — как в TV-скрипте
RSI_PERIOD = 14
RSI_MIN = 50
ATR_PERIOD = 14
SL_ATR_MULT = 5.5  # Stop Loss: 5.5 ATR от цены входа
TP_ATR_MULT = 7.0  # Take Profit: 7.0 ATR от цены входа
TRAIL_PCT = 0.01   # Трейлинг-стоп: 1% от лучшей цены (=15% депо буфер)
TIMEFRAME = '4h'

# === DCA ПАРАМЕТРЫ ===
POSITION_SIZE_PCT  = 0.10  # каждый вход — 10% баланса
MAX_DCA_ENTRIES    = 10    # максимум 10 входов (итого 100% баланса)
DCA_MIN_INTERVAL   = 900   # минимум 15 мин между DCA-входами (анти-спам)
DCA_PRICE_DROP_PCT = 0.01  # DCA срабатывает когда цена ушла на 1% от среднего входа (~-15% P&L при 15x)
MAX_POSITIONS      = 2     # максимум одновременных позиций (открывается только если все остальные в плюсе)

# === ПОДКЛЮЧЕНИЕ К BINGX ===
exchange = ccxt.bingx({
    'options': {
        'defaultType': 'swap',
        'adjustForTimeDifference': True
    }
})

# Thread-local exchange instances для параллельного сканирования
_tl = threading.local()

def _get_exchange():
    """Возвращает exchange для текущего потока (thread-safe)."""
    if not hasattr(_tl, 'exchange'):
        _tl.exchange = ccxt.bingx({
            'options': {
                'defaultType': 'swap',
                'adjustForTimeDifference': True,
            },
            'enableRateLimit': False,
        })
    return _tl.exchange

# === ИНДИКАТОРЫ ===
def calc_ema(series, period):
    return series.ewm(span=period, adjust=False).mean()

def calc_atr(df, period=14):
    high = df['high']
    low = df['low']
    close = df['close']
    prev_close = close.shift(1)
    tr = pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low - prev_close).abs()
    ], axis=1).max(axis=1)
    return tr.ewm(span=period, adjust=False).mean()

def calc_rsi(series, period=14):
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0).ewm(com=period - 1, adjust=False).mean()
    loss = (-delta.where(delta < 0, 0.0)).ewm(com=period - 1, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))

def calc_adx(df, period=14):
    high = df['high']
    low = df['low']
    close = df['close']

    plus_dm = high.diff()
    minus_dm = -low.diff()
    plus_dm[plus_dm < 0] = 0
    minus_dm[minus_dm < 0] = 0
    mask = plus_dm < minus_dm
    plus_dm[mask] = 0
    mask2 = minus_dm < plus_dm
    minus_dm[mask2] = 0

    prev_close = close.shift(1)
    tr = pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low - prev_close).abs()
    ], axis=1).max(axis=1)

    atr = tr.ewm(span=period, adjust=False).mean()
    plus_di = 100 * plus_dm.ewm(span=period, adjust=False).mean() / atr
    minus_di = 100 * minus_dm.ewm(span=period, adjust=False).mean() / atr
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    adx = dx.ewm(span=period, adjust=False).mean().fillna(0)
    return adx

# === TELEGRAM ===
TG_MSG_IDS_FILE = "tg_message_ids.json"
_tg_ids_lock = threading.Lock()

def _save_tg_msg_id(msg_id: int):
    """Добавляет message_id в файл для последующего удаления."""
    try:
        with _tg_ids_lock:
            ids = []
            if os.path.exists(TG_MSG_IDS_FILE):
                with open(TG_MSG_IDS_FILE, "r") as f:
                    ids = json.load(f)
            if msg_id not in ids:
                ids.append(msg_id)
            with open(TG_MSG_IDS_FILE, "w") as f:
                json.dump(ids, f)
    except Exception as e:
        print(f"[TG_IDS] Save error: {e}", flush=True)

def send_telegram(message, force=False):
    """Отправляет HTML-сообщение и возвращает message_id или None.
    force=True — отправить даже в dev (для реальных ботов с живыми деньгами)."""
    if not _IS_PROD and not force:
        print(f"[DEV] Telegram suppressed (not production): {message[:80]}", flush=True)
        return None
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("Telegram not configured", flush=True)
        return None
    url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
    data = {'chat_id': TELEGRAM_CHAT_ID, 'text': message, 'parse_mode': 'HTML'}
    try:
        response = requests.post(url, data=data, timeout=10)
        if response.status_code == 200:
            msg_id = response.json().get('result', {}).get('message_id')
            print(f"✅ Telegram message sent at {datetime.now()}", flush=True)
            if msg_id:
                _save_tg_msg_id(msg_id)
            return msg_id
        else:
            print(f"❌ Telegram error: {response.status_code} - {response.text}", flush=True)
            return None
    except Exception as e:
        print(f"❌ Telegram error: {e}", flush=True)
        return None

def edit_telegram(message_id, text):
    """Редактирует существующее сообщение по message_id."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID or not message_id:
        return
    url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/editMessageText'
    data = {'chat_id': TELEGRAM_CHAT_ID, 'message_id': message_id, 'text': text, 'parse_mode': 'HTML'}
    try:
        resp = requests.post(url, data=data, timeout=10)
        if resp.status_code == 200:
            print(f"✏️ Telegram message {message_id} edited", flush=True)
        else:
            print(f"⚠️ Telegram edit failed: {resp.text[:200]}", flush=True)
    except Exception as e:
        print(f"❌ Telegram edit error: {e}", flush=True)

# === ПОДТВЕРЖДЕНИЕ СИГНАЛОВ ===


# === СОХРАНЕНИЕ В ДАШБОРД ===
def save_signal_to_dashboard(signal, symbol):
    try:
        response = requests.post(
            f"{API_BASE}/api/signals",
            json={
                "symbol": symbol,
                "signalType": signal["signal"],
                "price": signal["price"],
                "sl": signal["sl"],
                "tp": signal["tp"],
                "emaFast": signal["ema_fast"],
                "emaSlow": signal["ema_slow"],
                "adx": signal["adx"],
                "atr": signal["atr"],
                "sentToTelegram": True
            },
            timeout=5
        )
        if response.status_code == 201:
            print(f"📊 Signal saved to dashboard: {symbol}", flush=True)
        else:
            print(f"⚠️ Dashboard error: {response.status_code} - {response.text}", flush=True)
    except Exception as e:
        print(f"⚠️ Dashboard error: {e}", flush=True)

# === ОБНОВЛЕНИЕ СТАТУСА СКАНЕРА ===
def update_scanner_status(status_data):
    try:
        requests.post(
            f"{API_BASE}/api/scanner/status",
            json=status_data,
            timeout=3
        )
    except Exception:
        pass

# === ПРОВЕРКА СИГНАЛА ===
def check_signal(symbol):
    try:
        bars = _get_exchange().fetch_ohlcv(symbol, timeframe=TIMEFRAME, limit=120)
        if not bars or len(bars) < 90:
            return None

        df = pd.DataFrame(bars, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['ema_fast'] = calc_ema(df['close'], EMA_FAST)
        df['ema_slow'] = calc_ema(df['close'], EMA_SLOW)
        df['adx'] = calc_adx(df)
        df['atr'] = calc_atr(df, ATR_PERIOD)
        df['rsi'] = calc_rsi(df['close'], RSI_PERIOD)
        # Используем предыдущую ЗАКРЫТУЮ свечу — она не репейнтит
        last = df.iloc[-2]   # последняя закрытая 4h свеча (сигнальная)
        prev = df.iloc[-3]   # свеча перед ней (для crossover)

        strong_trend = last['adx'] >= ADX_MIN

        # --- LONG ---
        uptrend    = last['ema_fast'] > last['ema_slow']
        crossover  = prev['close'] <= prev['ema_fast'] and last['close'] > last['ema_fast']

        if uptrend and crossover and strong_trend:
            sl = last['close'] - SL_ATR_MULT * last['atr']
            tp = last['close'] + TP_ATR_MULT * last['atr']
            return {
                'signal': 'BUY',
                'price': float(last['close']),
                'ema_fast': float(last['ema_fast']),
                'ema_slow': float(last['ema_slow']),
                'adx': float(last['adx']),
                'atr': float(last['atr']),
                'rsi': float(last['rsi']),
                'sl': float(sl),
                'tp': float(tp),
                'candle_timestamp': int(last['timestamp'])
            }

        # --- SHORT ---
        downtrend      = last['ema_fast'] < last['ema_slow']
        short_cross    = prev['close'] >= prev['ema_fast'] and last['close'] < last['ema_fast']

        if downtrend and short_cross and strong_trend:
            sl = last['close'] + SL_ATR_MULT * last['atr']
            tp = last['close'] - TP_ATR_MULT * last['atr']
            return {
                'signal': 'SHORT',
                'price': float(last['close']),
                'ema_fast': float(last['ema_fast']),
                'ema_slow': float(last['ema_slow']),
                'adx': float(last['adx']),
                'atr': float(last['atr']),
                'rsi': float(last['rsi']),
                'sl': float(sl),
                'tp': float(tp),
                'candle_timestamp': int(last['timestamp'])
            }

        return None
    except Exception as e:
        print(f"Error {symbol}: {e}", flush=True)
        return None

# === ХРАНЕНИЕ ОТПРАВЛЕННЫХ СИГНАЛОВ НА ДИСКЕ ===
SENT_SIGNALS_FILE = "sent_signals.json"
SIGNAL_COOLDOWN_SECONDS = 14400  # 4 часа — одна и та же пара не сигналит чаще одного 4h кандла

def load_sent_signals():
    """Load sent signals from disk, drop entries older than cooldown period."""
    try:
        with open(SENT_SIGNALS_FILE, "r") as f:
            data = json.load(f)
        now_ms = int(time.time() * 1000)
        cutoff_ms = now_ms - SIGNAL_COOLDOWN_SECONDS * 1000
        # data format: {symbol: sent_at_ms}
        filtered = {k: v for k, v in data.items() if v >= cutoff_ms}
        print(f"📂 Loaded {len(filtered)} recent sent signals from disk", flush=True)
        return filtered
    except Exception:
        return {}

def save_sent_signals(sent_signals):
    """Persist sent signals dict to disk."""
    try:
        with open(SENT_SIGNALS_FILE, "w") as f:
            json.dump(sent_signals, f)
    except Exception as e:
        print(f"⚠️ Could not save sent_signals: {e}", flush=True)

# === ОЖИДАНИЕ ПОДТВЕРЖДЕНИЯ СИГНАЛА ===
PENDING_SIGNALS_FILE = "pending_signals.json"
CONFIRM_DELAY_MINUTES = 5   # сколько минут ждём перед открытием позиции

def load_pending_signals() -> dict:
    """Загружает сигналы в режиме ожидания подтверждения."""
    try:
        with open(PENDING_SIGNALS_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}

def save_pending_signals(pending: dict):
    try:
        with open(PENDING_SIGNALS_FILE, "w") as f:
            json.dump(pending, f)
    except Exception as e:
        print(f"⚠️ Could not save pending_signals: {e}", flush=True)

# === FOLLOWUP АПДЕЙТЫ СИГНАЛОВ ЧЕРЕЗ 1 ЧАС ===
SIGNAL_FOLLOWUPS_FILE = "signal_followups.json"
FOLLOWUP_DELAY_MS = 3600 * 1000  # 1 час

def _load_followups():
    try:
        with open(SIGNAL_FOLLOWUPS_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []

def _save_followups(items):
    try:
        with open(SIGNAL_FOLLOWUPS_FILE, "w") as f:
            json.dump(items, f)
    except Exception as e:
        print(f"⚠️ Could not save followups: {e}", flush=True)

def add_signal_followup(msg_id, token, signal_type, entry_price, original_message):
    """Добавляет сигнал в очередь followup-апдейтов."""
    if not msg_id:
        return
    items = _load_followups()
    items.append({
        "msg_id": msg_id,
        "token": token,
        "signal": signal_type,
        "entry_price": entry_price,
        "original_message": original_message,
        "followup_at_ms": int(time.time() * 1000) + FOLLOWUP_DELAY_MS,
        "done": False,
    })
    _save_followups(items)

def _process_followups():
    """Проверяет очередь и отправляет followup если прошёл 1 час."""
    items = _load_followups()
    now_ms = int(time.time() * 1000)
    changed = False
    for item in items:
        if item.get("done"):
            continue
        if now_ms < item.get("followup_at_ms", 0):
            continue
        token = item["token"]
        signal_type = item["signal"]
        entry_price = item["entry_price"]
        msg_id = item["msg_id"]
        try:
            bars = _get_exchange().fetch_ohlcv(token, timeframe='1m', limit=2)
            current_price = float(bars[-1][4]) if bars else None
        except Exception as e:
            print(f"⚠️ Followup price fetch error for {token}: {e}", flush=True)
            item["done"] = True
            changed = True
            continue
        if not current_price:
            item["done"] = True
            changed = True
            continue
        is_long = signal_type == "BUY"
        pnl_raw = (current_price - entry_price) / entry_price * 100 if is_long \
                  else (entry_price - current_price) / entry_price * 100
        pnl_lev = pnl_raw * LIVE_LEVERAGE
        pnl_emoji = "✅" if pnl_lev >= 0 else "❌"
        sym_clean = token.replace('/USDT:USDT', '').replace('/USDC:USDC', '')
        dir_label = "ЛОНГ" if is_long else "ШОРТ"

        updated_text = (
            item["original_message"] +
            f"\n━━━━━━━━━━━━━━━━━━━━\n"
            f"📈 <b>Итог через 1ч:</b>\n"
            f"   Цена сейчас: <b>${current_price:,.4f}</b>\n"
            f"   P&L x{LIVE_LEVERAGE}: <b>{'+' if pnl_lev >= 0 else ''}{pnl_lev:.1f}%</b>  {pnl_emoji}\n"
            f"   (без плеча: {'+' if pnl_raw >= 0 else ''}{pnl_raw:.2f}%)"
        )
        edit_telegram(msg_id, updated_text)
        print(f"📊 Followup sent for {sym_clean} {dir_label}: {pnl_lev:+.1f}% (x{LIVE_LEVERAGE})", flush=True)
        item["done"] = True
        changed = True
    if changed:
        _save_followups(items)

def _followup_loop():
    """Фоновый поток: проверяет followup-апдейты каждую минуту."""
    while True:
        time.sleep(60)
        try:
            _process_followups()
        except Exception as e:
            print(f"⚠️ Followup loop error: {e}", flush=True)

# === LIVE TRADING НАСТРОЙКИ ===
LIVE_FILE = 'live_trading.json'
LIVE_BACKUP_FILE = 'live_trading.backup.json'
LIVE_LEVERAGE = 15
BINGX_BASE = "https://open-api.bingx.com"
BINGX_API_KEY = os.environ.get('BINGX_API_KEY', '')
BINGX_SECRET_KEY = os.environ.get('BINGX_SECRET_KEY', '')


def _bingx_sign(params: dict) -> str:
    query = '&'.join(f"{k}={v}" for k, v in params.items())
    return hmac.new(BINGX_SECRET_KEY.encode(), query.encode(), digestmod=hashlib.sha256).hexdigest()


def bingx_get_api(path: str, params: dict = None) -> dict:
    p = params or {}
    all_p = {**p, 'timestamp': int(time.time() * 1000)}
    all_p['signature'] = _bingx_sign(all_p)
    qs = urlencode(all_p)
    resp = requests.get(f"{BINGX_BASE}{path}?{qs}",
                        headers={"X-BX-APIKEY": BINGX_API_KEY}, timeout=15)
    return resp.json()


def bingx_post_api(path: str, params: dict = None) -> dict:
    p = params or {}
    all_p = {**p, 'timestamp': int(time.time() * 1000)}
    all_p['signature'] = _bingx_sign(all_p)
    qs = urlencode(all_p)
    resp = requests.post(f"{BINGX_BASE}{path}?{qs}",
                         headers={"X-BX-APIKEY": BINGX_API_KEY}, timeout=15)
    return resp.json()


def bingx_delete_api(path: str, params: dict = None) -> dict:
    p = params or {}
    all_p = {**p, 'timestamp': int(time.time() * 1000)}
    all_p['signature'] = _bingx_sign(all_p)
    qs = urlencode(all_p)
    resp = requests.delete(f"{BINGX_BASE}{path}?{qs}",
                           headers={"X-BX-APIKEY": BINGX_API_KEY}, timeout=15)
    return resp.json()


BINGX_SYMBOL_MAP = {
    'TRUMP/USDT:USDT': 'TRUMPSOL-USDT',
}

def bingx_symbol(token: str) -> str:
    if token in BINGX_SYMBOL_MAP:
        return BINGX_SYMBOL_MAP[token]
    return token.replace('/USDT:USDT', '-USDT').replace('/USDC:USDC', '-USDC')


def get_bingx_balance() -> float:
    try:
        resp = bingx_get_api('/openApi/swap/v2/user/balance')
        bal_data = resp.get('data', {}).get('balance', {})
        if isinstance(bal_data, dict):
            val = float(bal_data.get('availableMargin', bal_data.get('balance', 0)) or 0)
            return val
        return 0.0
    except Exception as e:
        print(f"⚠️ BingX balance error: {e}", flush=True)
        return 0.0


def load_live() -> dict:
    local_data = None
    for fpath in [LIVE_FILE, LIVE_BACKUP_FILE]:
        try:
            if not os.path.exists(fpath):
                continue
            with open(fpath, 'r') as f:
                data = json.load(f)
            if 'balance' in data and 'trades' in data:
                local_data = data
                break
        except Exception:
            pass

    # Сверяемся с БД: API-сервер пишет enabled в trading_state (id='live');
    # open_position — в live_trading_state (id=1).
    if local_data:
        try:
            import psycopg2
            db_url = os.environ.get('DATABASE_URL', '')
            if db_url:
                conn = psycopg2.connect(db_url)
                cur = conn.cursor()
                changed = False

                # Читаем enabled из trading_state (управляется дашбордом)
                cur.execute("SELECT data FROM trading_state WHERE id = 'live'")
                row = cur.fetchone()
                if row and row[0]:
                    db_data = row[0] if isinstance(row[0], dict) else json.loads(row[0])
                    if 'enabled' in db_data and db_data['enabled'] != local_data.get('enabled'):
                        print(f"🔄 load_live: enabled changed DB={db_data['enabled']} <- file={local_data.get('enabled')}", flush=True)
                        local_data['enabled'] = db_data['enabled']
                        changed = True

                # Читаем open_positions из live_trading_state (если в файле нет)
                if not local_data.get('open_positions'):
                    cur.execute("SELECT data FROM live_trading_state WHERE id = 1")
                    row2 = cur.fetchone()
                    if row2 and row2[0]:
                        db_data2 = row2[0] if isinstance(row2[0], dict) else json.loads(row2[0])
                        if db_data2.get('open_positions'):
                            print("🔄 load_live: syncing open_positions from DB to JSON", flush=True)
                            local_data['open_positions'] = db_data2['open_positions']
                            changed = True
                        elif db_data2.get('open_position'):
                            # Старый формат — мигрируем
                            print("🔄 load_live: syncing open_position (legacy) from DB to JSON", flush=True)
                            local_data['open_positions'] = [db_data2['open_position']]
                            changed = True

                conn.close()
                if changed:
                    try:
                        with open(LIVE_FILE, 'w') as fw:
                            json.dump(local_data, fw, indent=2)
                    except Exception:
                        pass
        except Exception:
            pass

    if local_data:
        # Миграция: если старый формат (open_position как dict) → конвертируем в список
        if 'open_positions' not in local_data:
            old_pos = local_data.get('open_position')
            local_data['open_positions'] = [old_pos] if old_pos else []
        return local_data

    return {
        'balance': 0.0,
        'initial_balance': 0.0,
        'open_position': None,
        'open_positions': [],
        'trades': [],
        'stats': {'total': 0, 'wins': 0, 'losses': 0, 'total_pnl': 0.0},
    }


def save_live(state: dict):
    # Синхронизируем open_position с первым элементом open_positions (backward compat с дашбордом)
    state = dict(state)
    positions = state.get('open_positions', [])
    state['open_position'] = positions[0] if positions else None

    # Перед записью сохраняем enabled из trading_state (управляется дашбордом).
    # Это предотвращает перезапись флага устаревшим in-memory значением сканера.
    try:
        import psycopg2
        db_url = os.environ.get('DATABASE_URL', '')
        if db_url:
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute("SELECT data->>'enabled' FROM trading_state WHERE id = 'live'")
            row = cur.fetchone()
            conn.close()
            if row and row[0] is not None:
                state = dict(state)
                state['enabled'] = (row[0] == 'true')
    except Exception:
        pass

    # Запись в файл
    try:
        tmp = LIVE_FILE + '.tmp'
        with open(tmp, 'w') as f:
            json.dump(state, f, indent=2)
        if os.path.exists(LIVE_FILE):
            shutil.copy2(LIVE_FILE, LIVE_BACKUP_FILE)
        os.replace(tmp, LIVE_FILE)
    except Exception as e:
        print(f"⚠️ Could not save live state: {e}", flush=True)

    def _sync():
        # Прямая запись в PostgreSQL
        db_url = os.environ.get('DATABASE_URL', '')
        if db_url:
            try:
                import psycopg2
                conn = psycopg2.connect(db_url)
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO live_trading_state (id, data, updated_at) VALUES (1, %s::jsonb, NOW()) "
                    "ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()",
                    [json.dumps(state)]
                )
                conn.commit()
                conn.close()
            except Exception as e:
                print(f"⚠️ DB direct sync error: {e}", flush=True)
        # HTTP sync локальный
        try:
            requests.post(f"{API_BASE}/api/live-trading/sync", json=state, timeout=5)
        except Exception:
            pass
        # Всегда синхронизируем на продакшн URL (и из dev и из prod)
        if DASHBOARD_URL and not _IS_PROD:
            try:
                requests.post(f"{DASHBOARD_URL}/api/live-trading/sync", json=state, timeout=5, verify=False)
            except Exception:
                pass
    threading.Thread(target=_sync, daemon=True).start()


def is_bot_enabled() -> bool:
    """Проверяет enabled через API (DB) — главный авторитет.
    Файл live_trading.json в продакшене может быть недоступен для записи,
    поэтому читаем из базы данных через локальный API-сервер."""
    try:
        r = requests.get(f"{API_BASE}/api/live-trading", timeout=3)
        if r.status_code == 200:
            return bool(r.json().get('enabled', False))
    except Exception:
        pass
    # Fallback: файл (работает в dev)
    return load_live().get('enabled', False)


def has_bingx_open_position() -> bool:
    """Проверяет BingX напрямую — есть ли хоть одна открытая позиция."""
    try:
        resp = bingx_get_api('/openApi/swap/v2/user/positions', {'symbol': ''})
        positions = resp.get('data', []) or []
        return any(float(p.get('positionAmt', 0)) != 0 for p in positions)
    except Exception as e:
        print(f"⚠️ BingX position check error: {e}", flush=True)
        return False  # при ошибке — не блокируем


def get_bingx_open_positions() -> list:
    """Возвращает список открытых позиций на BingX с деталями."""
    try:
        resp = bingx_get_api('/openApi/swap/v2/user/positions', {'symbol': ''})
        positions = resp.get('data', []) or []
        return [p for p in positions if float(p.get('positionAmt', 0)) != 0]
    except Exception as e:
        print(f"⚠️ BingX positions fetch error: {e}", flush=True)
        return []


def open_live_position(signal: dict, token: str, state: dict):
    if not BINGX_API_KEY or not BINGX_SECRET_KEY:
        print("⚠️ BingX API keys not set — skipping live position", flush=True)
        return

    positions = state.get('open_positions', [])

    # 1. Не открываем повторно тот же токен
    for p in positions:
        if p.get('token') == token:
            print(f"⏭️ Live: позиция {token} уже открыта — пропускаем дубль", flush=True)
            return

    # 2. Проверяем лимит одновременных позиций
    if len(positions) >= MAX_POSITIONS:
        print(f"⏭️ Live: достигнут лимит позиций ({MAX_POSITIONS}) — пропускаем {token}", flush=True)
        return

    sym = bingx_symbol(token)
    direction = signal.get('signal', 'BUY')
    entry = signal['price']
    tp = signal['tp']
    sl = signal['sl']
    is_long = direction == 'BUY'
    position_side = 'LONG' if is_long else 'SHORT'
    order_side = 'BUY' if is_long else 'SELL'

    balance = get_bingx_balance()
    if balance <= 0:
        print(f"⚠️ Live position skipped: balance={balance}", flush=True)
        return

    # Устанавливаем плечо
    try:
        bingx_post_api('/openApi/swap/v2/trade/leverage', {
            'symbol': sym, 'side': position_side, 'leverage': LIVE_LEVERAGE,
        })
    except Exception as e:
        print(f"⚠️ Set leverage error: {e}", flush=True)

    # Первый вход — 10% баланса (DCA стратегия)
    collateral_used = balance * POSITION_SIZE_PCT
    position_value = collateral_used * LIVE_LEVERAGE
    qty = round(position_value / entry, 4)
    if qty <= 0:
        print(f"⚠️ Qty calculated as {qty} — skipping", flush=True)
        return

    # Открываем рыночный ордер
    try:
        order_resp = bingx_post_api('/openApi/swap/v2/trade/order', {
            'symbol': sym, 'side': order_side, 'positionSide': position_side,
            'type': 'MARKET', 'quantity': qty,
        })
        if order_resp.get('code') != 0:
            msg = order_resp.get('msg', 'Unknown error')
            print(f"❌ BingX order failed: {msg}", flush=True)
            send_telegram(f"❌ Ошибка открытия позиции {sym}:\n{msg}", force=True)
            return
        actual_entry = float(order_resp.get('data', {}).get('order', {}).get('avgPrice', entry) or entry) or entry
    except Exception as e:
        print(f"❌ BingX order exception: {e}", flush=True)
        send_telegram(f"❌ Ошибка открытия {sym}: {e}", force=True)
        return

    if state['initial_balance'] == 0:
        state['initial_balance'] = balance

    new_pos = {
        'token': token,
        'direction': direction,
        'entry_price': actual_entry,
        'qty': qty,
        'tp': float(signal.get('tp', 0)),
        'sl': float(signal.get('sl', 0)),
        'atr': float(signal.get('atr', 0)),
        'adx': float(signal.get('adx', 0)),
        'best_price': actual_entry,
        'collateral': collateral_used,
        'position_value': position_value,
        'opened_at': datetime.now(TZ_MOSCOW).isoformat(),
        'bingx_symbol': sym,
        'dca_entries': 1,
        'last_dca_at': None,
    }
    if 'open_positions' not in state:
        state['open_positions'] = []
    state['open_positions'].append(new_pos)
    state['balance'] = balance
    save_live(state)

    sym_clean = token.replace('/USDT:USDT', '').replace('/USDC:USDC', '')
    dir_emoji = '🟢 ЛОНГ' if is_long else '🔴 ШОРТ'
    msg = (
        f"{dir_emoji} <b>РЕАЛЬНАЯ ПОЗИЦИЯ ОТКРЫТА 💸</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📊 Токен:    <b>{sym_clean}</b>\n"
        f"💰 Вход:     <b>${actual_entry:,.4f}</b>\n"
        f"📦 Залог:    ${collateral_used:,.2f} USDT  (x{LIVE_LEVERAGE} = ${position_value:,.2f})\n"
        f"💼 Баланс:   ${balance:,.2f}\n"
        f"🔢 Вход:     1 / {MAX_DCA_ENTRIES} (DCA)\n"
        f"⏰ {datetime.now(TZ_MOSCOW).strftime('%H:%M  %d.%m.%Y')}"
    )
    send_telegram(msg, force=True)
    print(f"💸 Live {direction} opened: {sym} @ ${actual_entry:,.4f}  [DCA 1/{MAX_DCA_ENTRIES}]", flush=True)


def _dca_single_position(pos: dict, state: dict) -> bool:
    """DCA для одной позиции. Возвращает True если состояние изменилось."""
    entries = pos.get('dca_entries', 1)
    if entries >= MAX_DCA_ENTRIES:
        return False

    last_dca_at = pos.get('last_dca_at')
    if last_dca_at:
        try:
            last_ts = datetime.fromisoformat(last_dca_at.replace('Z', '+00:00'))
            elapsed = (datetime.now(timezone.utc) - last_ts.astimezone(timezone.utc)).total_seconds()
            if elapsed < DCA_MIN_INTERVAL:
                return False
        except Exception:
            pass

    sym = pos.get('bingx_symbol', bingx_symbol(pos['token']))
    direction = pos.get('direction', 'BUY')
    is_long = direction == 'BUY'
    position_side = 'LONG' if is_long else 'SHORT'
    order_side = 'BUY' if is_long else 'SELL'

    try:
        resp = bingx_get_api('/openApi/swap/v2/user/positions', {'symbol': sym})
        bx_positions = resp.get('data', []) or []
        unrealized = None
        current_price = None
        for p in bx_positions:
            if abs(float(p.get('positionAmt', 0))) > 0:
                unrealized = float(p.get('unrealizedProfit', 0))
                current_price = float(p.get('markPrice', 0)) or None
                break
    except Exception as e:
        print(f"⚠️ DCA: ошибка получения позиции с BingX ({sym}): {e}", flush=True)
        return False

    if unrealized is None:
        return False

    if unrealized >= 0:
        print(f"⏭️ DCA {sym}: позиция в плюсе ({unrealized:+.4f} USDT) — DCA не нужен", flush=True)
        return False

    # Ценовой триггер: DCA только если цена ушла на DCA_PRICE_DROP_PCT% от среднего входа
    if not current_price or current_price <= 0:
        print(f"⏭️ DCA {sym}: не удалось получить текущую цену — пропускаем", flush=True)
        return False

    avg_entry = pos.get('entry_price', 0)
    if avg_entry > 0:
        if is_long:
            price_drop = (avg_entry - current_price) / avg_entry
        else:
            price_drop = (current_price - avg_entry) / avg_entry
        if price_drop < DCA_PRICE_DROP_PCT:
            print(f"⏭️ DCA {sym}: цена отклонилась лишь на {price_drop:.2%} (нужно ≥{DCA_PRICE_DROP_PCT:.0%}) — ждём", flush=True)
            return False
        print(f"📉 DCA {sym}: цена упала на {price_drop:.2%} от ср. входа — триггер!", flush=True)

    balance = get_bingx_balance()
    if balance <= 0:
        print("⚠️ DCA: нулевой баланс — пропускаем", flush=True)
        return False

    entry_price = current_price or pos.get('entry_price', 1)
    add_collateral = balance * POSITION_SIZE_PCT
    add_value = add_collateral * LIVE_LEVERAGE
    add_qty = round(add_value / entry_price, 4)
    if add_qty <= 0:
        return False

    try:
        order_resp = bingx_post_api('/openApi/swap/v2/trade/order', {
            'symbol': sym, 'side': order_side, 'positionSide': position_side,
            'type': 'MARKET', 'quantity': add_qty,
        })
        if order_resp.get('code') != 0:
            msg = order_resp.get('msg', 'Unknown error')
            print(f"❌ DCA BingX order failed ({sym}): {msg}", flush=True)
            send_telegram(f"❌ Ошибка DCA входа {sym}:\n{msg}", force=True)
            return False
        actual_add_price = float(order_resp.get('data', {}).get('order', {}).get('avgPrice', entry_price) or entry_price) or entry_price
    except Exception as e:
        print(f"❌ DCA BingX order exception ({sym}): {e}", flush=True)
        send_telegram(f"❌ Ошибка DCA {sym}: {e}", force=True)
        return False

    old_qty = pos.get('qty', 0)
    old_collateral = pos.get('collateral', 0)
    old_entry = pos.get('entry_price', actual_add_price)
    new_qty = old_qty + add_qty
    avg_entry = (old_entry * old_qty + actual_add_price * add_qty) / new_qty if new_qty > 0 else actual_add_price
    new_collateral = old_collateral + add_collateral
    new_entries = entries + 1

    pos['qty'] = round(new_qty, 4)
    pos['entry_price'] = round(avg_entry, 6)
    pos['collateral'] = round(new_collateral, 4)
    pos['position_value'] = round(new_collateral * LIVE_LEVERAGE, 4)
    pos['dca_entries'] = new_entries
    pos['last_dca_at'] = datetime.now(timezone.utc).isoformat()
    state['balance'] = balance

    sym_clean = pos['token'].replace('/USDT:USDT', '').replace('/USDC:USDC', '')
    dir_emoji = '🟢 ЛОНГ' if is_long else '🔴 ШОРТ'
    msg = (
        f"📉 {dir_emoji} <b>DCA ВХОД #{new_entries}</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📊 Токен:      <b>{sym_clean}</b>\n"
        f"💰 Добавлено:  <b>${actual_add_price:,.4f}</b>  (+{add_collateral:,.2f} USDT)\n"
        f"📈 Ср. вход:   <b>${avg_entry:,.4f}</b>\n"
        f"📦 Залог итого: ${new_collateral:,.2f} USDT\n"
        f"📉 P&L до DCA: <b>{unrealized:+.4f} USDT</b>\n"
        f"🔢 Вход:       {new_entries} / {MAX_DCA_ENTRIES}\n"
        f"⏰ {datetime.now(TZ_MOSCOW).strftime('%H:%M  %d.%m.%Y')}"
    )
    send_telegram(msg, force=True)
    print(f"📉 DCA вход #{new_entries}: {sym} @ ${actual_add_price:,.4f}  залог +{add_collateral:.2f}", flush=True)
    return True


def dca_live_position(state: dict):
    """DCA для убыточных позиций из open_positions.
    За один цикл монитора — не более 1 DCA (защита от одновременного слива баланса).
    """
    positions = state.get('open_positions', [])
    if not positions:
        return

    for pos in positions:
        if _dca_single_position(pos, state):
            save_live(state)
            return  # только 1 DCA за цикл — остальные подождут следующего прохода


_check_live_lock = threading.Lock()

def check_live_position():
    if not _check_live_lock.acquire(blocking=False):
        return  # другой поток уже проверяет — пропускаем
    try:
        _do_check_live_position()
    finally:
        _check_live_lock.release()

def _close_single_position(pos: dict, state: dict, reason: str = 'closed_by_exchange'):
    """Записывает закрытие одной позиции в стейт. Возвращает P&L."""
    sym = pos.get('bingx_symbol', bingx_symbol(pos['token']))
    is_long = pos.get('direction', 'BUY') == 'BUY'
    qty = pos.get('qty', 1) or 1
    collateral = pos.get('collateral', 1) or 1

    # ── Метод 1: цена закрытия из истории ордеров × объём — самый прямой расчёт ──
    pnl_usd = 0.0
    exit_price = None
    pnl_source = 'unknown'

    try:
        orders_resp = bingx_get_api('/openApi/swap/v2/trade/allOrders', {
            'symbol': sym, 'limit': 20,
        })
        orders = orders_resp.get('data', {}).get('orders', []) or []
        # Берём только ордера, созданные ПОСЛЕ открытия позиции
        opened_ms = 0
        try:
            from dateutil import parser as dtparser
            opened_ms = int(dtparser.parse(pos['opened_at']).timestamp() * 1000)
        except Exception:
            opened_ms = int(time.time() * 1000) - 7200_000  # 2 часа как fallback

        # Ищем последний FILLED ордер на закрытие (reduce/close) после открытия позиции
        close_orders = [
            o for o in orders
            if o.get('status') == 'FILLED'
            and float(o.get('avgPrice', 0) or 0) > 0
            and int(o.get('updateTime', 0) or 0) >= opened_ms
            and o.get('reduceOnly', False) is True
        ]
        if not close_orders:
            # Fallback: просто последний FILLED ордер после открытия позиции
            close_orders = [
                o for o in orders
                if o.get('status') == 'FILLED'
                and float(o.get('avgPrice', 0) or 0) > 0
                and int(o.get('updateTime', 0) or 0) >= opened_ms
            ]

        if close_orders:
            # Берём самый последний
            last_order = sorted(close_orders, key=lambda x: int(x.get('updateTime', 0) or 0), reverse=True)[0]
            exit_price = float(last_order['avgPrice'])
            filled_qty = float(last_order.get('executedQty', qty) or qty)
            price_diff = (exit_price - pos['entry_price']) if is_long \
                         else (pos['entry_price'] - exit_price)
            pnl_usd = round(price_diff * filled_qty, 4)
            pnl_source = f'order_history (exit={exit_price:.6f})'
            print(f"💰 P&L via Order History ({sym}): {pnl_usd:+.4f} USDT (вход={pos['entry_price']:.6f} выход={exit_price:.6f})", flush=True)
    except Exception as e:
        print(f"⚠️ Order history failed ({sym}): {e}", flush=True)

    # ── Метод 2: Income API с окном от открытия позиции — только если метод 1 не дал результат ──
    if pnl_usd == 0:
        try:
            opened_ms = 0
            try:
                from dateutil import parser as dtparser
                opened_ms = int(dtparser.parse(pos['opened_at']).timestamp() * 1000)
            except Exception:
                opened_ms = int(time.time() * 1000) - 7200_000
            income_resp = bingx_get_api('/openApi/swap/v2/user/income', {
                'symbol': sym, 'incomeType': 'REALIZED_PNL',
                'startTime': opened_ms, 'limit': 50,
            })
            income_list = income_resp.get('data', []) or []
            if income_list:
                pnl_usd = round(sum(float(i.get('income', 0) or 0) for i in income_list), 4)
                pnl_source = f'income_api ({len(income_list)} records, from opened_at)'
                print(f"💰 P&L via Income API ({sym}): {pnl_usd:+.4f} USDT", flush=True)
        except Exception as e:
            print(f"⚠️ Income API failed ({sym}): {e}", flush=True)

    if pnl_usd == 0:
        print(f"⚠️ P&L не определён для {sym} — записываем 0", flush=True)

    new_balance = get_bingx_balance()
    pnl_pct = (pnl_usd / collateral) * 100
    if exit_price is None:
        exit_price = pos['entry_price'] + (pnl_usd / qty) if is_long \
                     else pos['entry_price'] - (pnl_usd / qty)

    trade = {
        'token': pos['token'], 'direction': pos.get('direction', 'BUY'),
        'entry_price': pos['entry_price'], 'exit_price': round(exit_price, 8),
        'qty': qty, 'collateral': collateral,
        'tp': 0, 'sl': 0,
        'pnl_usd': round(pnl_usd, 4), 'pnl_pct': round(pnl_pct, 2),
        'result': 'win' if pnl_usd >= 0 else 'loss',
        'opened_at': pos['opened_at'], 'closed_at': datetime.now(TZ_MOSCOW).isoformat(),
        'reason': reason,
    }
    state['trades'].append(trade)
    state['balance'] = round(new_balance if new_balance > 0 else collateral + pnl_usd, 4)
    state['stats']['total'] += 1
    if pnl_usd >= 0:
        state['stats']['wins'] += 1
    else:
        state['stats']['losses'] += 1
    state['stats']['total_pnl'] = round(state['stats'].get('total_pnl', 0) + pnl_usd, 4)

    sym_clean = pos['token'].replace('/USDT:USDT', '').replace('/USDC:USDC', '')
    today_str = datetime.now(TZ_MOSCOW).strftime('%Y-%m-%d')
    today_trades = [
        t for t in state.get('trades', [])
        if t.get('closed_at', '').startswith(today_str)
    ]
    total = len(today_trades)
    wins = sum(1 for t in today_trades if t.get('pnl_usd', 0) >= 0)
    win_rate = (wins / total * 100) if total > 0 else 0
    init_bal = state.get('initial_balance', collateral) or collateral
    overall_pnl = ((state['balance'] - init_bal) / init_bal) * 100 if init_bal else 0

    emoji = '✅' if pnl_usd >= 0 else '❌'
    dir_label = '🟢 ЛОНГ' if is_long else '🔴 ШОРТ'
    dca_entries = pos.get('dca_entries', 1)
    entry_label = f"Ср. вход ({dca_entries}×DCA)" if dca_entries > 1 else "Вход"
    # price move % without leverage (for verification)
    price_move_pct = ((exit_price - pos['entry_price']) / pos['entry_price'] * 100) if pos['entry_price'] else 0
    price_move_pct = price_move_pct if is_long else -price_move_pct
    msg = (
        f"{emoji} {dir_label} <b>РЕАЛЬНАЯ — ЗАКРЫТА 💸</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📊 Токен:    <b>{sym_clean}</b>\n"
        f"💰 {entry_label}: ${pos['entry_price']:,.4f}\n"
        f"📤 Выход:    <b>${exit_price:,.4f}</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📊 Сегодня: {wins}/{total} побед ({win_rate:.0f}%)\n"
        f"⏰ {datetime.now(TZ_MOSCOW).strftime('%H:%M  %d.%m.%Y')}"
    )
    send_telegram(msg, force=True)
    print(f"💸 Live closed ({reason.upper()}): {pos['token']}  P&L={pnl_pct:+.2f}%  Balance=${state['balance']:,.2f}", flush=True)
    return pnl_usd


def _do_check_live_position():
    state = load_live()
    positions = state.get('open_positions', [])
    if not positions:
        return

    still_open = []
    state_changed = False

    for pos in positions:
        sym = pos.get('bingx_symbol', bingx_symbol(pos['token']))

        # Пропускаем позиции открытые менее 30 секунд назад
        try:
            opened_ts = datetime.fromisoformat(pos['opened_at'].replace('Z', '+00:00'))
            if (datetime.now(timezone.utc) - opened_ts.astimezone(timezone.utc)).total_seconds() < 30:
                still_open.append(pos)
                continue
        except Exception:
            pass

        try:
            resp = bingx_get_api('/openApi/swap/v2/user/positions', {'symbol': sym})
            if resp.get('code') != 0:
                print(f"⚠️ check_live_position API error ({sym}): {resp}", flush=True)
                still_open.append(pos)
                continue

            bx_positions = resp.get('data', []) or []
            open_bx = None
            for p in bx_positions:
                if p.get('symbol') == sym:
                    amt = abs(float(p.get('positionAmt', 0) or 0))
                    if amt > 0:
                        open_bx = p
                        break

            if open_bx:
                current_price = float(open_bx.get('markPrice', 0) or 0)
                unrealized = float(open_bx.get('unrealizedProfit', 0) or 0)
                collateral = pos.get('collateral', 1)
                pnl_pct = (unrealized / collateral) * 100 if collateral else 0
                is_long = pos.get('direction', 'BUY') == 'BUY'
                sym_clean = pos['token'].replace('/USDT:USDT', '').replace('/USDC:USDC', '')

                # Проверяем смену направления
                bingx_side = open_bx.get('positionSide', 'LONG')
                tracked_side = 'LONG' if is_long else 'SHORT'

                if bingx_side != tracked_side:
                    print(f"⚠️ Direction mismatch ({sym}): tracked={tracked_side}, BingX={bingx_side}", flush=True)
                    new_direction = 'BUY' if bingx_side == 'LONG' else 'SELL'
                    recovered = {
                        'token': pos['token'],
                        'direction': new_direction,
                        'entry_price': float(open_bx.get('avgPrice', pos['entry_price'])),
                        'qty': abs(float(open_bx.get('positionAmt', pos['qty']))),
                        'tp': 0, 'sl': 0,
                        'best_price': float(open_bx.get('avgPrice', pos['entry_price'])),
                        'collateral': float(open_bx.get('initialMargin', pos['collateral'])),
                        'position_value': float(open_bx.get('positionValue', 0) or 0),
                        'opened_at': datetime.now(TZ_MOSCOW).isoformat(),
                        'bingx_symbol': sym,
                    }
                    still_open.append(recovered)
                    state_changed = True
                    dir_emoji = '📈' if new_direction == 'BUY' else '📉'
                    dir_name = 'LONG' if new_direction == 'BUY' else 'SHORT'
                    send_telegram(
                        f"⚠️ <b>Смена направления ({sym_clean})</b>\n"
                        f"━━━━━━━━━━━━━━━━━━━━\n"
                        f"{dir_emoji} {tracked_side} → <b>{dir_name}</b>\n"
                        f"💰 Вход: ${recovered['entry_price']:,.4f}\n"
                        f"⏰ {datetime.now(TZ_MOSCOW).strftime('%H:%M  %d.%m.%Y')}",
                        force=True
                    )
                    continue

                dir_label = 'LONG' if is_long else 'SHORT'
                print(f"💸 {dir_label} {sym_clean} @ ${current_price:,.4f}  P&L: {pnl_pct:+.2f}% (x{LIVE_LEVERAGE})", flush=True)
                still_open.append(pos)

            else:
                # Позиция закрыта на BingX
                _close_single_position(pos, state)
                state_changed = True

        except Exception as e:
            print(f"⚠️ check_live_position error ({sym}): {e}", flush=True)
            still_open.append(pos)

    if state_changed or len(still_open) != len(positions):
        state['open_positions'] = still_open
        save_live(state)

# === ФОНОВЫЙ МОНИТОРИНГ ПОЗИЦИИ ===
def _position_monitor_loop():
    """
    Быстрый фоновый поток: проверяет закрытие live-позиции каждые 5 сек.
    Также проверяет нужен ли DCA (минимум 1 раз в DCA_MIN_INTERVAL секунд).
    Работает параллельно с основным сканером — не ждёт 4h-цикла.
    """
    _balance_sync_counter = 0
    while True:
        time.sleep(5)
        _balance_sync_counter += 1
        try:
            state = load_live()
            has_positions = bool(state.get('open_positions'))
            if has_positions:
                check_live_position()
                # DCA: перечитываем стейт после check (позиции могли закрыться)
                if state.get('enabled', False):
                    fresh_state = load_live()
                    if fresh_state.get('open_positions'):
                        dca_live_position(fresh_state)
            else:
                # Нет открытых позиций — раз в ~60 сек синхронизируем баланс с BingX
                if _balance_sync_counter >= 12:
                    _balance_sync_counter = 0
                    real_bal = get_bingx_balance()
                    if real_bal > 0 and abs(real_bal - state.get('balance', 0)) > 0.01:
                        state['balance'] = round(real_bal, 4)
                        save_live(state)
        except Exception as _e:
            print(f"⚠️ Position monitor error: {_e}", flush=True)


# === АНАЛИЗ ОТКРЫТЫХ ПОЗИЦИЙ ===
def _build_position_analysis() -> str | None:
    """Строит развёрнутый анализ всех открытых позиций. Возвращает None если нет позиций."""
    state = load_live()
    positions = state.get('open_positions', [])
    if not positions:
        return None

    now_msk = datetime.now(TZ_MOSCOW)
    balance = state.get('balance', 0)
    messages = []

    for pos in positions:
        sym = pos.get('bingx_symbol', bingx_symbol(pos['token']))
        sym_clean = pos['token'].replace('/USDT:USDT', '').replace('/USDC:USDC', '')
        is_long = pos.get('direction', 'BUY') == 'BUY'
        entry_price = pos.get('entry_price', 0)
        collateral = pos.get('collateral', 1) or 1
        dca_entries = pos.get('dca_entries', 1)
        opened_at_str = pos.get('opened_at', '')
        qty = pos.get('qty', 0)

        # Время в позиции
        try:
            opened_ts = datetime.fromisoformat(opened_at_str.replace('Z', '+00:00'))
            elapsed_sec = (datetime.now(timezone.utc) - opened_ts.astimezone(timezone.utc)).total_seconds()
            elapsed_min = int(elapsed_sec / 60)
            if elapsed_min < 60:
                time_str = f"{elapsed_min} мин"
            else:
                h = elapsed_min // 60
                m = elapsed_min % 60
                time_str = f"{h}ч {m}м"
        except Exception:
            elapsed_min = 0
            time_str = "—"

        # Живые данные с BingX
        try:
            resp = bingx_get_api('/openApi/swap/v2/user/positions', {'symbol': sym})
            bx_positions = resp.get('data', []) or []
            current_price = None
            unrealized = None
            liq_price = None
            for p in bx_positions:
                if abs(float(p.get('positionAmt', 0) or 0)) > 0:
                    current_price = float(p.get('markPrice', 0) or 0) or None
                    unrealized = float(p.get('unrealizedProfit', 0) or 0)
                    liq_price = float(p.get('liquidationPrice', 0) or 0) or None
                    break
        except Exception:
            current_price = None
            unrealized = None
            liq_price = None

        pnl_pct = (unrealized / collateral * 100) if (unrealized is not None and collateral) else None
        dir_word = "ЛОНГ" if is_long else "ШОРТ"
        dir_emoji = "📈" if is_long else "📉"

        # ─── Блок 1: Общая сводка ───
        pnl_str = f"{pnl_pct:+.2f}%" if pnl_pct is not None else "—"
        unrealized_str = f"${unrealized:+.2f}" if unrealized is not None else "—"
        price_str = f"${current_price:,.4f}" if current_price else "—"
        liq_str = f"${liq_price:,.4f}" if liq_price else "—"
        position_value = collateral * LIVE_LEVERAGE
        dca_remaining = MAX_DCA_ENTRIES - dca_entries

        block1 = (
            f"{'═'*22}\n"
            f"{dir_emoji} <b>{sym_clean} — {dir_word}</b>\n"
            f"{'═'*22}\n"
            f"⏱ Время в позиции:  <b>{time_str}</b>\n"
            f"💰 Цена входа:       <b>${entry_price:,.4f}</b>\n"
            f"📍 Текущая цена:    <b>{price_str}</b>\n"
            f"💥 Ликвидация:       <b>{liq_str}</b>\n"
            f"📊 P&amp;L сейчас:       <b>{pnl_str}</b>  ({unrealized_str} USDT)\n"
            f"📦 Залог в позиции: ${collateral:,.2f} USDT  (х{LIVE_LEVERAGE} = ${position_value:,.0f})\n"
            f"🔢 DCA входов:      {dca_entries}/{MAX_DCA_ENTRIES}  (осталось {dca_remaining})"
        )

        # ─── Блок 2: DCA анализ ───
        if current_price and entry_price > 0:
            if is_long:
                drop_pct = (entry_price - current_price) / entry_price * 100
            else:
                drop_pct = (current_price - entry_price) / entry_price * 100
            need_pct = DCA_PRICE_DROP_PCT * 100

            if dca_entries >= MAX_DCA_ENTRIES:
                dca_line = "⛔ Все DCA входы исчерпаны — новых докупок не будет"
            elif drop_pct >= need_pct:
                dca_line = "🔔 <b>DCA готов сработать прямо сейчас!</b> Ждём следующую проверку"
            else:
                remaining_pct = need_pct - drop_pct
                # Считаем новый средний вход после следующего DCA
                add_collateral = (balance or collateral) * POSITION_SIZE_PCT
                add_value = add_collateral * LIVE_LEVERAGE
                add_qty = add_value / (current_price or entry_price)
                if is_long:
                    next_dca_price = entry_price * (1 - need_pct / 100)
                else:
                    next_dca_price = entry_price * (1 + need_pct / 100)
                new_qty = qty + add_qty
                new_avg = (entry_price * qty + next_dca_price * add_qty) / new_qty if new_qty > 0 else entry_price
                dca_line = (
                    f"📏 Цена откл. от входа: {drop_pct:.2f}%  (нужно ещё {remaining_pct:.2f}% для DCA)\n"
                    f"   Следующий DCA сработает при цене ≈ <b>${next_dca_price:,.4f}</b>\n"
                    f"   После DCA новый средний вход станет ≈ <b>${new_avg:,.4f}</b>"
                )

            block2 = f"\n📐 <b>DCA Стратегия</b>\n{dca_line}"
        else:
            block2 = "\n📐 <b>DCA Стратегия</b>\n⚪ Нет данных о цене"

        # ─── Блок 3: Сценарии (что если) ───
        scenario_lines = ["\n🎯 <b>Сценарии развития</b>"]
        if current_price and collateral > 0:
            scenarios = [
                ("+5%", 1.05 if is_long else 0.95),
                ("+10%", 1.10 if is_long else 0.90),
                ("-3%", 0.97 if is_long else 1.03),
                ("-7%", 0.93 if is_long else 1.07),
            ]
            for label, mult in scenarios:
                hypo_price = current_price * mult if current_price else entry_price * mult
                if is_long:
                    hypo_pnl = (hypo_price - entry_price) * qty
                else:
                    hypo_pnl = (entry_price - hypo_price) * qty
                hypo_pct = (hypo_pnl / collateral * 100) if collateral else 0
                arrow = "🟢" if hypo_pct > 0 else "🔴"
                scenario_lines.append(
                    f"  {arrow} Цена {label}: ${hypo_price:,.4f}  →  P&amp;L: {hypo_pct:+.1f}% ({hypo_pnl:+.2f}$)"
                )
        else:
            scenario_lines.append("  ⚪ Нет данных для расчёта")
        block3 = "\n".join(scenario_lines)

        # ─── Блок 4: Ситуация и оценка ───
        def situation_text(pnl, entries, elapsed, is_long_pos) -> str:
            direction_text = "лонг" if is_long_pos else "шорт"
            parts = []

            if pnl is None:
                return "⚪ Нет данных о P&L для анализа."

            # Оценка P&L
            if pnl >= 10:
                parts.append(f"🟢 Позиция уверенно в плюсе ({pnl:+.1f}%). Тренд работает в нашу сторону. Сигнал EMA/ADX подтверждает движение.")
            elif pnl >= 3:
                parts.append(f"🟢 Позиция в небольшом плюсе ({pnl:+.1f}%). Хорошее начало — цена движется согласно стратегии.")
            elif pnl >= 0:
                parts.append(f"🟡 Позиция около нуля ({pnl:+.1f}%). Рынок пока не определился. Это нормально для ранней стадии.")
            elif pnl >= -7:
                parts.append(f"🟡 Небольшая просадка ({pnl:+.1f}%). Входные уровни EMA/ADX оставались сильными при открытии — откат возможен, тренд в целом сохраняется.")
            elif pnl >= -15:
                parts.append(f"🟠 Заметная просадка ({pnl:+.1f}%). Цена двигается против позиции. DCA стратегия работает — следующий вход снизит средний уровень.")
            elif pnl >= -30:
                parts.append(f"🔴 Глубокая просадка ({pnl:+.1f}%). Рынок оказывает серьёзное давление на позицию. Продолжай DCA по плану, если осталось место.")
            else:
                parts.append(f"🚨 Критическая просадка ({pnl:+.1f}%). Позиция под угрозой. Оцени, есть ли смысл удерживать или фиксировать убыток.")

            # Время в позиции
            if elapsed < 30:
                parts.append("⏱ Позиция только открылась — ещё слишком рано делать выводы. Дай рынку время.")
            elif elapsed < 120:
                parts.append("⏱ Позиция молодая (менее 2 часов). 4H стратегия требует терпения — один цикл ещё не завершён.")
            elif elapsed < 360:
                parts.append("⏱ Позиция держится несколько часов. Ближайшее закрытие 4H свечи покажет реальный расклад сил.")
            else:
                parts.append(f"⏱ Позиция открыта уже {time_str}. Долгосрочный {direction_text} — дай тренду сработать полностью.")

            # DCA статус
            if entries >= MAX_DCA_ENTRIES:
                parts.append("⚠️ Все DCA входы использованы. Позиция полностью укомплектована. Теперь только ждать разворота или принимать решение о выходе вручную.")
            elif entries == 1:
                parts.append(f"💡 Использован 1 из {MAX_DCA_ENTRIES} DCA входов. Есть {dca_remaining} запасных уровней для усреднения — стратегия имеет большой запас прочности.")
            else:
                parts.append(f"💡 Использовано {entries} из {MAX_DCA_ENTRIES} DCA входов. Остаётся {dca_remaining} запасных уровней — позиция постепенно усредняется.")

            return "\n".join(parts)

        block4 = f"\n📋 <b>Ситуация и оценка</b>\n{situation_text(pnl_pct, dca_entries, elapsed_min, is_long)}"

        # ─── Блок 5: Рекомендации ───
        def recommendation_text(pnl, entries, elapsed) -> str:
            recs = []

            if pnl is None:
                return "⚪ Нет данных для рекомендаций."

            if pnl >= 15:
                recs.append("✅ <b>Рассмотри частичную фиксацию прибыли.</b> При +15% и выше разумно зафиксировать часть — это защитит результат, если рынок развернётся.")
                recs.append("📌 Можно поставить мысленный трейлинг-стоп: если цена откатит на 5% от пика — принять решение о закрытии.")
            elif pnl >= 5:
                recs.append("✅ <b>Держи позицию.</b> Тренд работает, EMA сигнал подтверждается движением цены.")
                recs.append("👀 Следи за следующей 4H свечой — пробой нового максимума усилит уверенность в продолжении.")
            elif pnl >= 0:
                recs.append("🟡 <b>Держи без изменений.</b> Рано делать выводы. Стратегия рассчитана на 4H цикл.")
                recs.append("📊 Если следующая 4H свеча закроется ниже EMA20 — это сигнал слабости. Начни думать об управлении позицией.")
            elif pnl >= -10:
                recs.append("🟡 <b>Держи, не паникуй.</b> Небольшой минус в начале — норма для трендовых стратегий.")
                recs.append("📐 DCA ещё не нужен — откат слишком мал. Ждём дальнейшего движения.")
                recs.append("📌 Следи за уровнем DCA триггера (1% от входа). Когда сработает — это плановый добор.")
            elif pnl >= -20:
                recs.append("🟠 <b>Дай DCA сработать.</b> Просадка в пределах нормы для 15x стратегии. Следующий вход автоматически снизит средний уровень.")
                recs.append("⚠️ Не закрывай позицию вручную на панике — стратегия рассчитана на усреднение в период коррекции.")
                recs.append("📊 Следи за ADX: если индикатор остаётся выше 15 — тренд ещё не сломан, разворот вероятен.")
            elif pnl >= -35:
                recs.append("🔴 <b>Активируй все оставшиеся DCA входы по мере срабатывания.</b> Усреднение — единственный путь к выходу в ноль без большого убытка.")
                recs.append("⚠️ Оцени: если рынок продолжит падать и DCA закончатся — придётся принять убыток. Сделай расчёт максимального убытка уже сейчас.")
                recs.append("📌 Не добавляй вне системы DCA — соблюдай план управления рисками.")
            else:
                recs.append("🚨 <b>Критическая ситуация. Оцени соотношение риска и вознаграждения.</b>")
                recs.append("❓ Ключевые вопросы: Есть ли DCA входы? Каково расстояние до ликвидации? Меняется ли рыночный тренд?")
                recs.append("🛑 Если DCA исчерпаны и тренд сломан — рассмотри фиксацию убытка. Лучше потерять часть, чем всё.")

            # Универсальные советы
            if entries < MAX_DCA_ENTRIES and pnl < -5:
                recs.append(f"🔢 <i>Помни: у тебя ещё {dca_remaining} DCA входа(ов). Каждый вход снижает средний уровень и приближает точку безубытка.</i>")

            if liq_price and current_price:
                if is_long:
                    liq_dist = (current_price - liq_price) / current_price * 100 if liq_price > 0 else 0
                else:
                    liq_dist = (liq_price - current_price) / current_price * 100 if liq_price > 0 else 0
                if 0 < liq_dist < 10:
                    recs.append(f"🚨 <b>ВНИМАНИЕ: До ликвидации осталось всего {liq_dist:.1f}%!</b> Срочно оцени ситуацию.")
                elif 0 < liq_dist < 25:
                    recs.append(f"⚠️ До ликвидации: {liq_dist:.1f}%. Следи за позицией внимательно.")

            return "\n".join(recs)

        block5 = f"\n💡 <b>Рекомендации</b>\n{recommendation_text(pnl_pct, dca_entries, elapsed_min)}"

        full_pos_msg = "\n".join([block1, block2, block3, block4, block5])
        messages.append(full_pos_msg)

    # Итоги портфеля если позиций больше одной
    if len(positions) > 1:
        total_unrealized = sum(
            float(pos.get('unrealized', 0) or 0) for pos in positions
        )
        total_collateral = sum(pos.get('collateral', 0) or 0 for pos in positions)
        # Пересчитаем unrealized через BingX данные (уже получены выше, используем pnl_pct × collateral)
        portfolio_footer = (
            f"\n{'═'*22}\n"
            f"💼 <b>ПОРТФЕЛЬ</b>\n"
            f"{'═'*22}\n"
            f"📦 Позиций открыто:  {len(positions)}\n"
            f"💵 Залог суммарно:   ${total_collateral:,.2f} USDT\n"
            f"🏦 Баланс счёта:     ${balance:,.2f} USDT\n"
            f"⏰ Обновлено:        {now_msk.strftime('%H:%M  %d.%m.%Y')}"
        )
        messages.append(portfolio_footer)
    else:
        messages.append(
            f"\n{'─'*22}\n"
            f"🏦 Баланс счёта: ${balance:,.2f} USDT  |  ⏰ {now_msk.strftime('%H:%M  %d.%m.%Y')}"
        )

    return "\n".join(messages)


def _analysis_loop():
    """Фоновый поток: отправляет анализ позиций каждые 30 минут."""
    INTERVAL = 30 * 60  # 30 минут
    time.sleep(INTERVAL)  # первый анализ через 30 мин после старта
    while True:
        try:
            msg = _build_position_analysis()
            if msg:
                send_telegram(msg, force=True)
                print("📊 Position analysis sent to Telegram", flush=True)
        except Exception as e:
            print(f"⚠️ Analysis loop error: {e}", flush=True)
        time.sleep(INTERVAL)


# === ЕЖЕДНЕВНЫЙ ИТОГ ===
def _daily_summary_loop():
    """Отправляет итог дня в Telegram в 23:59 МСК каждый день."""
    while True:
        try:
            now = datetime.now(TZ_MOSCOW)
            # Ждём до 23:59:00 сегодня или завтра
            target = now.replace(hour=23, minute=59, second=0, microsecond=0)
            if now >= target:
                target = target + timedelta(days=1)
            sleep_secs = (target - now).total_seconds()
            print(f"📅 Daily summary scheduled in {sleep_secs/3600:.1f}h", flush=True)
            time.sleep(sleep_secs)

            # Собираем данные
            live  = load_live()

            today_str = datetime.now(TZ_MOSCOW).strftime('%d.%m.%Y')

            # Реальная статистика
            l_stats  = live.get('stats', {})
            l_total_all = l_stats.get('total', 0)
            l_wins_all  = l_stats.get('wins', 0)
            l_wr        = (l_wins_all / l_total_all * 100) if l_total_all > 0 else 0
            l_bal       = live.get('balance', 0)
            l_init      = live.get('initial_balance', l_bal) or l_bal
            l_overall   = ((l_bal - l_init) / l_init * 100) if l_init else 0

            msg = (
                f"📅 <b>Итог дня — {today_str}</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"💸 <b>Реальный бот</b>\n"
                f"   Баланс: <b>${l_bal:,.2f}</b>  ({'+' if l_overall >= 0 else ''}{l_overall:.1f}% от старта)\n"
                f"   Сделок всего: {l_total_all}  ({l_wins_all}✅ / {l_total_all - l_wins_all}❌)\n"
                f"   Винрейт: <b>{l_wr:.0f}%</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"🌙 До завтра!"
            )
            send_telegram(msg, force=True)
            print(f"📅 Daily summary sent for {today_str}", flush=True)

            # Ждём ещё минуту чтобы не отправить дважды
            time.sleep(90)
        except Exception as _e:
            print(f"⚠️ Daily summary error: {_e}", flush=True)
            time.sleep(60)


# === РЕТРОСПЕКТИВА СИГНАЛОВ ===
def send_signal_retrospective(hours: int = 12):
    """Берёт сигналы за последние N часов, считает P&L по текущим ценам, отправляет в Telegram."""
    try:
        import psycopg2
        db_url = os.environ.get('DATABASE_URL', '')
        if not db_url:
            print("⚠️ Retrospective: нет DATABASE_URL", flush=True)
            return
        conn = psycopg2.connect(db_url)
        cur  = conn.cursor()
        cur.execute("""
            SELECT DISTINCT ON (symbol, signal_type)
                   symbol, signal_type, price::float, created_at
              FROM signals
             WHERE created_at > NOW() - INTERVAL '%s hours'
          ORDER BY symbol, signal_type, created_at DESC
        """, (hours,))
        rows = cur.fetchall()
        conn.close()
    except Exception as e:
        print(f"⚠️ Retrospective DB error: {e}", flush=True)
        return

    if not rows:
        print(f"⏭️ Retrospective: нет сигналов за {hours}ч", flush=True)
        return

    print(f"📊 Retrospective: {len(rows)} сигналов за {hours}ч — получаю цены...", flush=True)
    now_utc = datetime.now(timezone.utc)

    results = []
    for symbol, signal_type, entry_price, created_at in rows:
        try:
            bars = _get_exchange().fetch_ohlcv(symbol, timeframe='1m', limit=2)
            cur_price = float(bars[-1][4]) if bars else None
        except Exception:
            cur_price = None

        sym_clean = symbol.replace('/USDT:USDT','').replace('/USDC:USDC','')
        is_long   = signal_type == 'BUY'
        age_min   = int((now_utc - created_at.replace(tzinfo=timezone.utc)).total_seconds() / 60)
        age_str   = f"{age_min//60}ч {age_min%60}м" if age_min >= 60 else f"{age_min}м"

        if cur_price is None:
            results.append({'sym': sym_clean, 'is_long': is_long, 'age': age_str, 'error': True})
            time.sleep(0.2)
            continue

        pnl_raw = (cur_price - entry_price)/entry_price*100 if is_long \
                  else (entry_price - cur_price)/entry_price*100
        pnl_lev = pnl_raw * LIVE_LEVERAGE
        results.append({
            'sym': sym_clean, 'is_long': is_long, 'age': age_str,
            'entry': entry_price, 'cur': cur_price,
            'pnl_raw': pnl_raw, 'pnl_lev': pnl_lev,
            'win': pnl_lev >= 0, 'error': False,
        })
        time.sleep(0.2)

    valid    = [r for r in results if not r.get('error')]
    wins     = sum(1 for r in valid if r['win'])
    total    = len(valid)
    win_rate = round(wins / total * 100) if total > 0 else 0

    # Сортируем: победители → проигравшие
    valid_sorted = sorted(valid, key=lambda r: -r['pnl_lev'])
    errors       = [r for r in results if r.get('error')]

    now_str = datetime.now(TZ_MOSCOW).strftime('%H:%M  %d.%m.%Y')
    header_lines = [
        f"📊 <b>РЕТРОСПЕКТИВА СИГНАЛОВ ({hours}ч)</b>",
        f"🕐 {now_str}",
        f"{'✅' if win_rate >= 50 else '📉'} Результат: <b>{wins}/{total}</b> ({win_rate}% в плюсе)",
        "━━━━━━━━━━━━━━━━━━━━",
    ]
    data_lines = []
    for r in valid_sorted:
        emoji = '✅' if r['win'] else '❌'
        dir_e = '⬆️' if r['is_long'] else '⬇️'
        sign  = '+' if r['pnl_lev'] >= 0 else ''
        data_lines.append(
            f"{emoji}{dir_e} <b>{r['sym']}</b> ({r['age']}): "
            f"<b>{sign}{r['pnl_lev']:.1f}%</b> x{LIVE_LEVERAGE}  "
            f"<i>({'+' if r['pnl_raw']>=0 else ''}{r['pnl_raw']:.2f}%)</i>"
        )
    for r in errors:
        data_lines.append(f"❓ <b>{r['sym']}</b> ({r['age']}): цена недоступна")

    # Отправка чанками по 20 строк
    CHUNK = 20
    first_chunk = '\n'.join(header_lines + data_lines[:CHUNK])
    send_telegram(first_chunk, force=True)
    time.sleep(0.5)
    for i in range(CHUNK, len(data_lines), CHUNK):
        chunk = '\n'.join(['<i>(продолжение)</i>'] + data_lines[i:i+CHUNK])
        send_telegram(chunk, force=True)
        time.sleep(0.5)

    print(f"📊 Retrospective sent: {wins}/{total} ({win_rate}%)", flush=True)


def _retrospective_loop():
    """Отправляет ретроспективу сигналов за 12ч каждые 12 часов (00:00 и 12:00 UTC)."""
    while True:
        try:
            now_utc = datetime.now(timezone.utc)
            # Следующее окно: 00:00 или 12:00 UTC
            next_hour = 0 if now_utc.hour >= 12 else 12
            if now_utc.hour >= 12:
                # Переходим на следующий день
                from datetime import timedelta as _td
                next_dt = (now_utc + _td(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            else:
                next_dt = now_utc.replace(hour=12, minute=0, second=0, microsecond=0)
            sleep_secs = (next_dt - now_utc).total_seconds()
            print(f"📊 Retrospective scheduled in {sleep_secs/3600:.1f}h ({next_dt.strftime('%H:%M UTC')})", flush=True)
            time.sleep(sleep_secs)
            send_signal_retrospective(hours=12)
            time.sleep(90)  # буфер чтобы не отправить дважды
        except Exception as _e:
            print(f"⚠️ Retrospective loop error: {_e}", flush=True)
            time.sleep(60)


# === ОСНОВНОЙ ЦИКЛ ===
def main():
    print(f"🤖 BTC PRO v6.0 Scanner started with {len(TOKENS)} pairs", flush=True)
    # Уведомление только в продакшне (не в dev-окружении)
    if os.environ.get('REPLIT_DEPLOYMENT') == '1':
        send_telegram(
            f"🚀 Scanner запущен!\n"
            f"📊 Мониторинг {len(TOKENS)} пар...\n"
            f"🔒 Реальный бот ВЫКЛЮЧЕН — включи вручную в дашборде\n"
            f"🌐 Дашборд активен!"
        )

    signals_found = 0
    sent_signals = load_sent_signals()

    # При старте — сразу синхронизируем файловое состояние в БД
    # (нужно если позиция открылась до деплоя нового кода)
    try:
        _live_startup = load_live()
        _had_positions = bool(_live_startup.get('open_positions'))
        # Не сбрасываем enabled — сохраняем выбор пользователя из дашборда.
        # Единственное исключение: если есть позиции но enabled=False → включаем,
        # чтобы монитор и DCA работали.
        if _had_positions and not _live_startup.get('enabled', False):
            _live_startup['enabled'] = True
        # === ВОССТАНОВЛЕНИЕ ПОЗИЦИЙ ПОСЛЕ РЕСТАРТА ===
        # Если BingX имеет открытые позиции, которых нет в стейте — добавляем
        if BINGX_API_KEY:
            _bingx_pos_list = get_bingx_open_positions()
            if _bingx_pos_list:
                _existing_syms = {p.get('bingx_symbol', '') for p in _live_startup.get('open_positions', [])}
                _recovered_any = False
                for _bp in _bingx_pos_list:
                    _bsym = _bp.get('symbol', '')  # "POL-USDT"
                    if _bsym in _existing_syms:
                        continue  # уже есть в стейте
                    _bamt = float(_bp.get('positionAmt', 0))
                    _bprice = float(_bp.get('avgPrice', 0))
                    _bmargin = float(_bp.get('initialMargin', 0))
                    _bdir = 'BUY' if _bamt > 0 else 'SELL'
                    _bside = _bp.get('positionSide', 'LONG')
                    _token_rec = _bsym.replace('-', '/') + ':USDT'
                    _rec_pos = {
                        'token': _token_rec,
                        'direction': _bdir,
                        'entry_price': _bprice,
                        'qty': abs(_bamt),
                        'tp': 0,
                        'sl': 0,
                        'best_price': _bprice,
                        'collateral': _bmargin,
                        'position_value': _bmargin * LIVE_LEVERAGE,
                        'opened_at': datetime.now(TZ_MOSCOW).isoformat(),
                        'bingx_symbol': _bsym,
                    }
                    if 'open_positions' not in _live_startup:
                        _live_startup['open_positions'] = []
                    _live_startup['open_positions'].append(_rec_pos)
                    _sym_clean = _token_rec.replace('/USDT:USDT', '')
                    print(f"⚠️ RECOVERED position from BingX: {_token_rec} {_bdir} @ ${_bprice}", flush=True)
                    send_telegram(
                        f"⚠️ <b>Позиция восстановлена после рестарта</b>\n"
                        f"━━━━━━━━━━━━━━━━━━━━\n"
                        f"📊 Токен:  <b>{_sym_clean}</b>\n"
                        f"📈 {_bside}  |  Вход: <b>${_bprice:,.4f}</b>\n"
                        f"📦 Залог: ${_bmargin:,.2f} USDT\n"
                        f"⏰ {datetime.now(TZ_MOSCOW).strftime('%H:%M  %d.%m.%Y')}",
                        force=True
                    )
                    _recovered_any = True
                if _recovered_any:
                    _live_startup['enabled'] = True
        save_live(_live_startup)
        _enabled_now = _live_startup.get('enabled', False)
        _has_pos_now = bool(_live_startup.get('open_positions'))
        if _had_positions or _has_pos_now:
            n_pos = len(_live_startup.get('open_positions', []))
            print(f"✅ Startup: {n_pos} позиц(ий) открыто → enabled={_enabled_now} (DCA и мониторинг активны)", flush=True)
        else:
            print(f"{'✅' if _enabled_now else '🔒'} Startup: нет позиций → enabled={_enabled_now} (сохранён из дашборда)", flush=True)
        print("🔄 Startup DB sync complete", flush=True)
    except Exception as _e:
        print(f"⚠️ Startup sync error: {_e}", flush=True)

    # Запускаем фоновый монитор позиции (каждые 5 сек, отдельный поток)
    monitor_thread = threading.Thread(target=_position_monitor_loop, daemon=True)
    monitor_thread.start()
    print("👁️ Position monitor started (5s interval)", flush=True)

    daily_thread = threading.Thread(target=_daily_summary_loop, daemon=True)
    daily_thread.start()
    print("📅 Daily summary thread started (fires at 23:59 MSK)", flush=True)

    followup_thread = threading.Thread(target=_followup_loop, daemon=True)
    followup_thread.start()
    print("📊 Signal followup thread started (1h P&L updates)", flush=True)


    retro_thread = threading.Thread(target=_retrospective_loop, daemon=True)
    retro_thread.start()
    print("🔁 Retrospective thread started (every 12h at 00:00 and 12:00 UTC)", flush=True)

    while True:
        # Check if paused
        try:
            resp = requests.get(f"{API_BASE}/api/scanner/status", timeout=3)
            if resp.status_code == 200 and resp.json().get("isPaused", False):
                print("⏸️ Scanner paused, waiting...", flush=True)
                time.sleep(10)
                continue
        except Exception:
            pass

        # Проверяем открытые позиции (trailing stop, закрытие)
        # DCA теперь в _position_monitor_loop (каждые 5 сек, не реже 1 часа между входами)
        check_live_position()

        scan_start = datetime.now()
        scan_signals_this_round = 0
        scan_pending_signals = []  # все сигналы этого скана — ранжируем и открываем лучшие в конце

        update_scanner_status({
            "isScanning": True,
            "isPaused": False,
            "tokenIndex": 0,
            "totalTokens": len(TOKENS),
            "currentSymbol": TOKENS[0] if TOKENS else "",
            "scanStartTime": scan_start.isoformat(),
            "signalsFoundThisScan": 0,
        })

        # Параллельное сканирование — 20 воркеров одновременно (ускоряет с ~1ч до ~2 мин)
        SCAN_WORKERS = 20
        completed_count = 0
        paused_mid_scan = False
        scan_lock = threading.Lock()

        def _do_scan_token(token):
            """Сканирует один токен; возвращает (token, signal|None)."""
            try:
                sig = check_signal(token)
                return (token, sig)
            except Exception as _e:
                print(f"⚠️ Scan error {token}: {_e}", flush=True)
                return (token, None)

        with ThreadPoolExecutor(max_workers=SCAN_WORKERS) as _pool:
            future_map = {_pool.submit(_do_scan_token, tok): tok for tok in TOKENS}
            for fut in as_completed(future_map):
                # Проверяем паузу каждые 10 завершённых токенов
                with scan_lock:
                    completed_count += 1
                    _done = completed_count

                if _done % 10 == 0:
                    try:
                        resp = requests.get(f"{API_BASE}/api/scanner/status", timeout=3)
                        if resp.status_code == 200 and resp.json().get("isPaused", False):
                            print("⏸️ Scanner paused mid-scan, stopping.", flush=True)
                            update_scanner_status({"isScanning": False, "isPaused": True})
                            paused_mid_scan = True
                            break
                    except Exception:
                        pass

                token, signal = fut.result()

                update_scanner_status({
                    "isScanning": True,
                    "currentSymbol": token,
                    "tokenIndex": _done,
                    "totalTokens": len(TOKENS),
                    "signalsFoundThisScan": scan_signals_this_round,
                })

                if signal:
                    now_ms = int(time.time() * 1000)
                    if token in sent_signals and now_ms - sent_signals[token] < SIGNAL_COOLDOWN_SECONDS * 1000:
                        continue

                    sym_clean = token.replace('/USDT:USDT','').replace('/USDC:USDC','')
                    # Тихо сохраняем в БД и в список — Telegram только после полного скана
                    save_signal_to_dashboard(signal, token)
                    signals_found += 1
                    scan_signals_this_round += 1
                    sent_signals[token] = now_ms
                    print(f"✅ {signal['signal']} Signal: {token} @ ${signal['price']:,.6f}", flush=True)

                    scan_pending_signals.append({'signal': signal, 'token': token, 'sym': sym_clean})

        # ── Сохраняем кулдауны и ранжируем сигналы ────────────────────────────
        if paused_mid_scan:
            continue

        if scan_pending_signals:
            save_sent_signals(sent_signals)

        if scan_pending_signals:
            live_state = load_live()
            bot_enabled = is_bot_enabled()  # читает из DB через API — не зависит от файла

            def _score(item):
                sig = item['signal']
                adx = float(sig.get('adx', 0) or 0)
                ema_fast = float(sig.get('ema_fast', 0) or 0)
                ema_slow = float(sig.get('ema_slow', 1) or 1)
                ema_spread = abs(ema_fast - ema_slow) / ema_slow * 100 if ema_slow > 0 else 0
                return adx * 0.6 + ema_spread * 0.4

            ranked = sorted(scan_pending_signals, key=_score, reverse=True)
            current_cnt = len(live_state.get('open_positions') or [])
            slots = max(0, MAX_POSITIONS - current_cnt)
            opening_cnt = min(slots, len(ranked)) if bot_enabled else 0

            # ── Отправляем ЕДИНОЕ сообщение с полным рейтингом ────────────────
            now_str = datetime.now(TZ_MOSCOW).strftime('%H:%M  %d.%m.%Y')
            rank_lines = []
            for idx, item in enumerate(ranked):
                sig   = item['signal']
                sym   = item['sym']
                is_long = sig['signal'] == 'BUY'
                dir_e  = '🚀 ЛОНГ' if is_long else '🔴 ШОРТ'
                adx_v  = float(sig.get('adx', 0) or 0)
                score  = _score(item)
                price  = sig['price']
                tp     = float(sig.get('tp', 0))
                sl     = float(sig.get('sl', 0))
                tp_pct = abs((tp - price) / price * 100 * LIVE_LEVERAGE) if tp and price else 0
                sl_pct = abs((sl - price) / price * 100 * LIVE_LEVERAGE) if sl and price else 0
                if idx < opening_cnt:
                    mark = '✅ ОТКРЫВАЕМ'
                elif bot_enabled and slots == 0:
                    mark = '🔒 нет слотов'
                else:
                    mark = '⏭️'
                rank_lines.append(
                    f"{mark} <b>{idx+1}. {sym}</b>  {dir_e}\n"
                    f"   💰 ${price:,.4f}  ADX={adx_v:.1f}  score={score:.1f}\n"
                    f"   TP +{tp_pct:.1f}%  SL -{sl_pct:.1f}%  (×{LIVE_LEVERAGE})"
                )

            if bot_enabled and slots > 0:
                header = f"🏆 <b>Рейтинг сигналов — открываем {opening_cnt}</b>"
            elif bot_enabled and slots == 0:
                header = f"📊 <b>Рейтинг сигналов — нет свободных слотов ({MAX_POSITIONS}/{MAX_POSITIONS})</b>"
            else:
                header = f"📊 <b>Рейтинг сигналов — бот выключен (не торгуем)</b>"

            consolidated = (
                f"{header}\n"
                f"⏰ {now_str}\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                + "\n".join(rank_lines)
            )
            ranking_msg_id = send_telegram(consolidated, force=True)
            print(f"📊 Ranked {len(ranked)} signals, {slots} slot(s), opening {opening_cnt}", flush=True)

            # Followup-трекинг для выбранных сигналов (отдельное сообщение на каждый)
            for idx, item in enumerate(ranked[:opening_cnt]):
                sig = item['signal']
                sym = item['sym']
                is_long = sig['signal'] == 'BUY'
                fwd_msg = (
                    f"{'🚀 ЛОНГ' if is_long else '🔴 ШОРТ'} — <b>ОТКРЫВАЕМ</b>\n"
                    f"📊 <b>{sym}</b>  💰 ${sig['price']:,.4f}"
                )
                fwd_id = send_telegram(fwd_msg, force=True)
                add_signal_followup(fwd_id, item['token'], sig['signal'], sig['price'], fwd_msg)

            if bot_enabled:
                for item in ranked[:slots]:
                    # Перепроверяем enabled прямо перед каждым открытием.
                    # is_bot_enabled() читает из DB через API — работает и в dev и в prod.
                    if not is_bot_enabled():
                        sym = item['token'].replace('/USDT:USDT','').replace('/USDC:USDC','')
                        print(f"🔒 Открытие {sym} отменено — бот выключен (DB)", flush=True)
                        break
                    try:
                        _sr = requests.get(f"{API_BASE}/api/scanner/status", timeout=2)
                        if _sr.status_code == 200 and _sr.json().get("isPaused", False):
                            sym = item['token'].replace('/USDT:USDT','').replace('/USDC:USDC','')
                            print(f"⏸️ Открытие {sym} отменено — спящий режим активирован", flush=True)
                            break
                    except Exception:
                        pass
                    open_live_position(item['signal'], item['token'], live_state)
            else:
                print(f"⏸️ Live trading paused — skipping {len(scan_pending_signals)} pending signals", flush=True)

        # Check if we broke out of the loop due to pause
        try:
            resp = requests.get(f"{API_BASE}/api/scanner/status", timeout=3)
            if resp.status_code == 200 and resp.json().get("isPaused", False):
                while True:
                    time.sleep(5)
                    try:
                        r = requests.get(f"{API_BASE}/api/scanner/status", timeout=3)
                        if r.status_code == 200 and not r.json().get("isPaused", True):
                            break
                    except Exception:
                        pass
                continue
        except Exception:
            pass

        scan_duration = (datetime.now() - scan_start).total_seconds()
        print(f"🔄 Scan complete in {scan_duration:.1f}s | Signals this scan: {scan_signals_this_round} | Total: {signals_found}", flush=True)

        update_scanner_status({
            "isScanning": False,
            "currentSymbol": "",
            "tokenIndex": len(TOKENS),
            "totalTokens": len(TOKENS),
            "lastScanDuration": round(scan_duration, 1),
            "lastScanTime": datetime.now().isoformat(),
            "signalsFoundThisScan": scan_signals_this_round,
        })

        # Спим до следующего закрытия 4H свечи (UTC: 00, 04, 08, 12, 16, 20)
        _now_utc = datetime.now(timezone.utc)
        _cur_4h  = (_now_utc.hour // 4) * 4
        _next_4h = _cur_4h + 4
        _next_dt = _now_utc.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(hours=_next_4h)
        if _next_dt <= _now_utc:
            _next_dt += timedelta(hours=4)
        _sleep_secs = max(30, (_next_dt - _now_utc).total_seconds())
        _msk_str = datetime.fromtimestamp(_next_dt.timestamp(), TZ_MOSCOW).strftime('%H:%M МСК  %d.%m')
        print(f"⏳ Следующий скан в {_msk_str} (через {_sleep_secs/60:.0f} мин — новая 4H свеча)", flush=True)
        time.sleep(_sleep_secs)

if __name__ == '__main__':
    main()
