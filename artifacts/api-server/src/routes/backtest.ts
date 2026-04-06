import { Router } from "express";

const router = Router();

const TOKENS = [
  'BTC-USDT','ETH-USDT','BNB-USDT','XRP-USDT','SOL-USDT',
  'ADA-USDT','DOGE-USDT','AVAX-USDT','HYPE-USDT','LINK-USDT',
  'DOT-USDT','UNI-USDT','AAVE-USDT','LTC-USDT','BCH-USDT',
  'NEAR-USDT','SUI-USDT','APT-USDT','INJ-USDT','OP-USDT',
  'ARB-USDT','ZEC-USDT','XMR-USDT','TRX-USDT','FIL-USDT',
  'ATOM-USDT','HBAR-USDT','XLM-USDT','ENA-USDT','LDO-USDT',
  'CRV-USDT','GMX-USDT','PENDLE-USDT','RUNE-USDT','IMX-USDT',
  'ZK-USDT','JUP-USDT','PYTH-USDT','POL-USDT','SEI-USDT',
  'FET-USDT','RENDER-USDT','VIRTUAL-USDT','ONDO-USDT','CFX-USDT',
  'ZRO-USDT','TIA-USDT','EIGEN-USDT','W-USDT','BOME-USDT',
  'POPCAT-USDT','WIF-USDT','FLOKI-USDT','PEPE-USDT','BONK-USDT',
  'SHIB-USDT','NOT-USDT','DOGS-USDT','CATI-USDT','HMSTR-USDT',
  'NEIRO-USDT','TURBO-USDT','MOODENG-USDT','PNUT-USDT','ACT-USDT',
  'MEW-USDT','GOAT-USDT','FARTCOIN-USDT','AI16Z-USDT','ANIME-USDT',
  'TRUMP-USDT','MELANIA-USDT','IP-USDT','LAYER-USDT',
  'DOOD-USDT','SAHARA-USDT','BARD-USDT','RIVER-USDT','ASTER-USDT',
  'POWER-USDT','APR-USDT','BEAT-USDT','XPL-USDT',
  'ENJ-USDT','BERA-USDT','MOVE-USDT',
  'WLD-USDT','SAND-USDT','MANA-USDT','AXS-USDT',
  'GALA-USDT','YGG-USDT','PRIME-USDT','MAGIC-USDT',
  'RONIN-USDT','COOKIE-USDT',
];

const EMA_FAST  = 20;
const EMA_SLOW  = 80;
const ADX_MIN   = 15;
const ADX_PERIOD = 14;
const EXIT_CANDLES = 6;  // store 6 exit candles (24h of 4H data)
const BINGX_BASE = "https://open-api.bingx.com";

export interface Candle { t: number; o: number; h: number; l: number; c: number; }
export interface BacktestSignal {
  sym: string;
  ts: number;              // timestamp of signal candle (ms)
  direction: "LONG" | "SHORT";
  entry: number;           // open of next candle
  adx: number;
  emaFast: number;
  emaSlow: number;
  exits: Candle[];         // next EXIT_CANDLES candles after entry candle
}

let _cache: { signals: BacktestSignal[]; ts: number } | null = null;
let _computing = false;
const CACHE_TTL = 60 * 60 * 1000;  // 1 hour

function calcEMA(arr: number[], span: number): number[] {
  const alpha = 2 / (span + 1);
  const out = new Array(arr.length).fill(0);
  out[0] = arr[0];
  for (let i = 1; i < arr.length; i++) {
    out[i] = arr[i] * alpha + out[i - 1] * (1 - alpha);
  }
  return out;
}

function calcWilderEMA(arr: number[], period: number): number[] {
  const alpha = 1 / period;
  const out = new Array(arr.length).fill(0);
  out[0] = arr[0];
  for (let i = 1; i < arr.length; i++) {
    out[i] = arr[i] * alpha + out[i - 1] * (1 - alpha);
  }
  return out;
}

function calcADX(candles: Candle[], period = ADX_PERIOD): number[] {
  const n = candles.length;
  const tr   = new Array(n).fill(0);
  const dmp  = new Array(n).fill(0);
  const dmm  = new Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const cur = candles[i]; const prv = candles[i - 1];
    tr[i]  = Math.max(cur.h - cur.l, Math.abs(cur.h - prv.c), Math.abs(cur.l - prv.c));
    const up   = cur.h - prv.h;
    const down = prv.l - cur.l;
    dmp[i] = (up > down && up > 0) ? up : 0;
    dmm[i] = (down > up && down > 0) ? down : 0;
  }

  const atr14 = calcWilderEMA(tr, period);
  const smp   = calcWilderEMA(dmp, period);
  const smm   = calcWilderEMA(dmm, period);

  const dx = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const dip = atr14[i] > 0 ? 100 * smp[i] / atr14[i] : 0;
    const dim = atr14[i] > 0 ? 100 * smm[i] / atr14[i] : 0;
    const sum = dip + dim;
    dx[i] = sum > 0 ? 100 * Math.abs(dip - dim) / sum : 0;
  }
  return calcWilderEMA(dx, period);
}

async function fetchKlines(sym: string): Promise<Candle[]> {
  const url = `${BINGX_BASE}/openApi/swap/v3/quote/klines?symbol=${sym}&interval=4h&limit=250`;
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const json = await r.json() as Record<string, unknown>;
  if (!json.data || !Array.isArray(json.data)) return [];
  return (json.data as Record<string, unknown>[]).map((k) => ({
    t: Number(k.time ?? k.t ?? 0),
    o: parseFloat(String(k.open ?? k.o ?? 0)),
    h: parseFloat(String(k.high ?? k.h ?? 0)),
    l: parseFloat(String(k.low  ?? k.l ?? 0)),
    c: parseFloat(String(k.close ?? k.c ?? 0)),
  })).filter(c => c.t > 0 && c.c > 0).sort((a, b) => a.t - b.t);
}

async function computeSignals(): Promise<BacktestSignal[]> {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const allSignals: BacktestSignal[] = [];

  const CONCURRENCY = 8;
  const queue = [...TOKENS];

  async function processToken(sym: string) {
    try {
      const candles = await fetchKlines(sym);
      if (candles.length < 100) return;

      const closes   = candles.map(c => c.c);
      const emaFastA = calcEMA(closes, EMA_FAST);
      const emaSlowA = calcEMA(closes, EMA_SLOW);
      const adxA     = calcADX(candles);
      const maxExit  = EXIT_CANDLES + 1;

      for (let i = 82; i < candles.length - maxExit; i++) {
        if (candles[i].t < thirtyDaysAgo) continue;
        const adx = adxA[i];
        if (adx < ADX_MIN) continue;

        const ef = emaFastA[i]; const es = emaSlowA[i];
        const efP = emaFastA[i-1]; const cP = candles[i-1].c;
        const cC  = candles[i].c;

        let direction: "LONG" | "SHORT" | null = null;
        if (ef > es && cP <= efP && cC > ef) direction = "LONG";
        else if (ef < es && cP >= efP && cC < ef) direction = "SHORT";
        if (!direction) continue;

        const entryCandle = candles[i + 1];
        const exitCandles = candles.slice(i + 1, i + 1 + EXIT_CANDLES);

        allSignals.push({
          sym: sym.replace('-USDT', ''),
          ts: candles[i].t,
          direction,
          entry: entryCandle.o,
          adx,
          emaFast: ef,
          emaSlow: es,
          exits: exitCandles.map(c => ({ t: c.t, o: c.o, h: c.h, l: c.l, c: c.c })),
        });
      }
    } catch { /* skip failed tokens */ }
  }

  while (queue.length > 0) {
    const batch = queue.splice(0, CONCURRENCY);
    await Promise.all(batch.map(processToken));
  }

  allSignals.sort((a, b) => a.ts - b.ts);
  return allSignals;
}

router.get("/backtest/signals", async (req, res) => {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return res.json({
      signals: _cache.signals,
      cached: true,
      cacheAge: Math.round((Date.now() - _cache.ts) / 1000),
      total: _cache.signals.length,
    });
  }

  if (_computing) {
    return res.status(202).json({ computing: true, message: "Вычисление в процессе, попробуйте через 30 секунд" });
  }

  _computing = true;
  try {
    const signals = await computeSignals();
    _cache = { signals, ts: Date.now() };
    res.json({ signals, cached: false, total: signals.length });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  } finally {
    _computing = false;
  }
});

router.post("/backtest/refresh", async (_req, res) => {
  _cache = null;
  res.json({ ok: true, message: "Кэш сброшен" });
});

export default router;
