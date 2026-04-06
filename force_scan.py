"""
Запускает принудительный скан и открывает топ-N позиций прямо сейчас.
Использование: python3 force_scan.py
"""
import sys
import os

# Отключаем запуск потоков — импортируем только функции
os.environ.setdefault('FORCE_SCAN_MODE', '1')

# ── Импортируем нужные символы из scanner ──────────────────────────────────────
from scanner import (
    TOKENS, MAX_SIGNALS_TO_OPEN, MAX_POSITIONS,
    check_signal, open_live_position, load_live, is_bot_enabled,
    save_signal_to_dashboard, send_telegram,
)
from concurrent.futures import ThreadPoolExecutor, as_completed

DRY_RUN = '--dry' in sys.argv  # python3 force_scan.py --dry  → только покажет, не откроет

print(f"{'🔍 [DRY RUN]' if DRY_RUN else '🔍'} Force scan started — {len(TOKENS)} токенов", flush=True)

def _scan_one(token):
    try:
        sig = check_signal(token)
        return (token, sig)
    except Exception as e:
        print(f"⚠️ {token}: {e}", flush=True)
        return (token, None)

signals = []
with ThreadPoolExecutor(max_workers=12) as pool:
    futures = {pool.submit(_scan_one, t): t for t in TOKENS}
    done = 0
    for fut in as_completed(futures):
        token, sig = fut.result()
        done += 1
        if sig:
            sym = token.replace('/USDT:USDT','').replace('/USDC:USDC','')
            print(f"✅ Signal: {token} {sig['signal']} @ ${sig['price']:,.6f}  ADX={sig.get('adx',0):.1f}", flush=True)
            signals.append({'signal': sig, 'token': token, 'sym': sym})
        if done % 20 == 0:
            print(f"   ... {done}/{len(TOKENS)} scanned, {len(signals)} signals so far", flush=True)

print(f"\n{'─'*50}")
print(f"✅ Скан завершён: {len(signals)} сигналов из {len(TOKENS)} токенов")

if not signals:
    print("❌ Нет сигналов — позиции не открываем.")
    sys.exit(0)

# Ранжируем по ADX * 0.6 + EMA-spread * 0.4
def _score(item):
    sig = item['signal']
    adx = float(sig.get('adx', 0) or 0)
    ef  = float(sig.get('ema_fast', 0) or 0)
    es  = float(sig.get('ema_slow', 1) or 1)
    ema_spread = abs(ef - es) / es * 100 if es > 0 else 0
    return adx * 0.6 + ema_spread * 0.4

ranked = sorted(signals, key=_score, reverse=True)

print(f"\n{'─'*50}")
print(f"🏆 Рейтинг сигналов (топ {MAX_SIGNALS_TO_OPEN}):")
for i, item in enumerate(ranked):
    sig = item['signal']
    mark = '→ ОТКРОЕМ' if i < MAX_SIGNALS_TO_OPEN else '   пропуск'
    print(f"  {i+1:2d}. {item['sym']:12s}  {sig['signal']:5s}  ADX={sig.get('adx',0):5.1f}  score={_score(item):5.1f}  ${sig['price']:,.6f}  {mark}")

to_open = ranked[:MAX_SIGNALS_TO_OPEN]

if DRY_RUN:
    print(f"\n[DRY RUN] Открытие пропущено. Убери --dry чтобы реально открыть.")
    sys.exit(0)

bot_enabled = is_bot_enabled()
if not bot_enabled:
    print(f"\n⚠️  Бот ВЫКЛЮЧЕН в дашборде (isEnabled=False). Открытие отменено.")
    print(f"    Включи бота в дашборде и перезапусти скрипт.")
    sys.exit(1)

state = load_live()
current_open = len(state.get('open_positions', []))
free_slots = MAX_POSITIONS - current_open
if free_slots <= 0:
    print(f"\n⚠️  Уже открыто {current_open} позиций — лимит {MAX_POSITIONS} достигнут. Открытие отменено.")
    sys.exit(0)

to_open = to_open[:free_slots]
print(f"\n💸 Открываем {len(to_open)} позиций (слотов свободно: {free_slots})...\n")

for item in to_open:
    sig   = item['signal']
    token = item['token']
    sym   = item['sym']
    state = load_live()  # перечитываем перед каждым открытием
    print(f"  ▶ {sym} {sig['signal']} @ ${sig['price']:,.6f} ...", flush=True)
    save_signal_to_dashboard(sig, token)
    open_live_position(sig, token, state)

print(f"\n✅ Готово.")
