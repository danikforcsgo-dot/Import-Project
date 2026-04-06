import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FlaskConical, TrendingUp, TrendingDown, RefreshCw, Loader2,
  BarChart3, Award, ChevronUp, ChevronDown, ChevronsUpDown, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Candle { t: number; o: number; h: number; l: number; c: number; }
interface RawSignal {
  sym: string; ts: number; direction: "LONG" | "SHORT";
  entry: number; adx: number; emaFast: number; emaSlow: number;
  exits: Candle[];
}
interface ComputedTrade {
  raw: RawSignal;
  actualDir: "LONG" | "SHORT";
  pnlPct: number;       // % from entry (raw)
  pnlDeposit: number;   // % of deposit
  pnlUSDT: number;      // in USDT
  exitPrice: number;
  exitReason: "TP" | "SL" | "LIQ" | "TIME";
  exitCandleIdx: number;
  skipped: false;
}
interface SkippedTrade {
  raw: RawSignal;
  skipped: true;
}
type TradeOrSkip = ComputedTrade | SkippedTrade;

type SortKey = "ts" | "sym" | "pnlPct" | "adx";
type SortDir = "asc" | "desc";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const CANDLE_MS = 4 * 3600 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(ms: number) {
  return new Date(ms).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}
function fmtP(v: number, d = 2) { return (v >= 0 ? "+" : "") + v.toFixed(d) + "%"; }
function fmtU(v: number) { return (v >= 0 ? "+" : "") + "$" + Math.abs(v).toFixed(2); }

// ─── Core computation ─────────────────────────────────────────────────────────
function computeTrade(
  signal: RawSignal,
  mode: "normal" | "contrarian",
  tpPct: number,
  slPct: number,
  horizonCandles: number,
  leverage: number,
  positionPct: number,
  deposit: number,
  feePct: number,
): ComputedTrade {
  const actualDir: "LONG" | "SHORT" =
    mode === "contrarian"
      ? signal.direction === "LONG" ? "SHORT" : "LONG"
      : signal.direction;

  const entry = signal.entry;

  // Liquidation price: full margin loss at 1/leverage move
  const liqPriceLong  = entry * (1 - 1 / leverage);
  const liqPriceShort = entry * (1 + 1 / leverage);

  const tpPrice = tpPct > 0
    ? actualDir === "LONG" ? entry * (1 + tpPct / 100) : entry * (1 - tpPct / 100)
    : null;
  const slPrice = slPct > 0
    ? actualDir === "LONG" ? entry * (1 - slPct / 100) : entry * (1 + slPct / 100)
    : null;

  const candles = signal.exits.slice(0, horizonCandles);
  let exitPrice = candles.length > 0 ? candles[candles.length - 1].c : entry;
  let exitReason: "TP" | "SL" | "LIQ" | "TIME" = "TIME";
  let exitCandleIdx = candles.length - 1;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    // 1. TP
    if (tpPrice !== null) {
      const hit = actualDir === "LONG" ? c.h >= tpPrice : c.l <= tpPrice;
      if (hit) { exitPrice = tpPrice; exitReason = "TP"; exitCandleIdx = i; break; }
    }
    // 2. SL — проверяем ДО ликвидации, т.к. SL ближе к входу
    if (slPrice !== null) {
      const hit = actualDir === "LONG" ? c.l <= slPrice : c.h >= slPrice;
      if (hit) { exitPrice = slPrice; exitReason = "SL"; exitCandleIdx = i; break; }
    }
    // 3. Ликвидация — только если SL не задан или не сработал
    const liqHit = actualDir === "LONG"
      ? c.l <= liqPriceLong
      : c.h >= liqPriceShort;
    if (liqHit) {
      exitPrice = actualDir === "LONG" ? liqPriceLong : liqPriceShort;
      exitReason = "LIQ"; exitCandleIdx = i; break;
    }
  }

  const rawPnl = actualDir === "LONG"
    ? (exitPrice - entry) / entry * 100
    : (entry - exitPrice) / entry * 100;

  // Subtract open+close fee from the price move before leverage
  // fee is applied on notional = margin × leverage, so as % of price move:
  // fee_impact = 2 × feePct (entry + exit commission on full notional)
  const rawPnlAfterFee = rawPnl - 2 * feePct;

  // Clamp to -100% (can't lose more than margin)
  const rawPnlClamped = Math.max(rawPnlAfterFee * leverage, -100);
  const pnlDeposit    = rawPnlClamped * (positionPct / 100);
  const pnlUSDT       = pnlDeposit * deposit / 100;

  return {
    raw: signal, actualDir, skipped: false,
    pnlPct: rawPnl, pnlDeposit, pnlUSDT,
    exitPrice, exitReason, exitCandleIdx,
  };
}

// ─── Portfolio simulation (respects maxPositions + available margin) ──────────
function runPortfolio(
  allSignals: RawSignal[],
  opts: {
    days: number; mode: "normal" | "contrarian"; tp: number; sl: number;
    horizon: number; leverage: number; positionPct: number;
    deposit: number; maxPositions: number; dirFilter: "all" | "LONG" | "SHORT";
    feePct: number;
  }
): { trades: ComputedTrade[]; skippedCount: number; finalBalance: number; minBalance: number } {
  const cutoff = Date.now() - opts.days * 24 * 60 * 60 * 1000;
  const filtered = allSignals
    .filter(s => s.ts >= cutoff && (opts.dirFilter === "all" || s.direction === opts.dirFilter))
    .sort((a, b) => a.ts - b.ts);

  // Group by candle timestamp
  const groups = new Map<number, RawSignal[]>();
  for (const s of filtered) {
    const grp = groups.get(s.ts) ?? [];
    grp.push(s);
    groups.set(s.ts, grp);
  }

  // Fixed margin per trade based on initial deposit
  const marginPerTrade = opts.deposit * opts.positionPct / 100;

  // Track open positions: closeTs + PnL to realize when closed
  const openTrades: { closeTs: number; pnlUSDT: number }[] = [];
  const trades: ComputedTrade[] = [];
  let skippedCount = 0;
  let realizedPnl = 0;
  let minBalance = opts.deposit;

  const sortedTs = Array.from(groups.keys()).sort((a, b) => a - b);

  for (const ts of sortedTs) {
    const group = groups.get(ts)!;
    const entryTs = ts + CANDLE_MS;

    // Close trades that expired before this entry → realize their PnL
    for (let i = openTrades.length - 1; i >= 0; i--) {
      if (openTrades[i].closeTs <= entryTs) {
        realizedPnl += openTrades[i].pnlUSDT;
        openTrades.splice(i, 1);
      }
    }

    const currentBalance = opts.deposit + realizedPnl;
    const lockedMargin   = openTrades.length * marginPerTrade;
    const freeMargin     = currentBalance - lockedMargin;

    minBalance = Math.min(minBalance, currentBalance);

    // Skip if balance is wiped out
    if (currentBalance <= 0 || marginPerTrade <= 0) {
      skippedCount += group.length;
      continue;
    }

    // How many new positions can we open?
    const bySlots  = opts.maxPositions - openTrades.length;          // hard cap
    const byMargin = Math.floor(freeMargin / marginPerTrade);         // margin cap
    const available = Math.max(0, Math.min(bySlots, byMargin));

    // Sort group by ADX desc (take best signals first)
    const ranked = [...group].sort((a, b) => b.adx - a.adx);

    for (let i = 0; i < ranked.length; i++) {
      if (i < available) {
        const trade = computeTrade(
          ranked[i], opts.mode, opts.tp, opts.sl, opts.horizon,
          opts.leverage, opts.positionPct, opts.deposit, opts.feePct
        );
        const closeTs = ranked[i].exits[trade.exitCandleIdx]?.t
          ? ranked[i].exits[trade.exitCandleIdx].t + CANDLE_MS
          : entryTs + (trade.exitCandleIdx + 1) * CANDLE_MS;
        openTrades.push({ closeTs, pnlUSDT: trade.pnlUSDT });
        trades.push(trade);
      } else {
        skippedCount++;
      }
    }
  }

  // Realize remaining open trades
  for (const t of openTrades) realizedPnl += t.pnlUSDT;
  const finalBalance = opts.deposit + realizedPnl;
  minBalance = Math.min(minBalance, finalBalance);

  return { trades, skippedCount, finalBalance, minBalance };
}

// ─── API hook ─────────────────────────────────────────────────────────────────
function useBacktestSignals() {
  return useQuery<{ signals: RawSignal[]; cached: boolean; computing?: boolean; total: number }>({
    queryKey: ["backtest-signals"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/backtest/signals`);
      if (r.status === 202) return { signals: [], cached: false, computing: true, total: 0 };
      return r.json();
    },
    refetchInterval: (q) => q?.state?.data?.computing ? 10000 : false,
    staleTime: 55 * 60 * 1000,
  });
}

// ─── Input component ──────────────────────────────────────────────────────────
function NumInput({ label, value, onChange, min, max, step, suffix, placeholder }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground font-mono uppercase">{label}</label>
      <div className="flex items-center gap-1 border border-border/50 bg-background/50 rounded px-2 py-1">
        <input type="number" min={min} max={max} step={step ?? 1} value={value || ""}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder ?? "0"}
          className="w-full bg-transparent text-xs font-mono text-foreground focus:outline-none" />
        {suffix && <span className="text-xs text-muted-foreground shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, positive }: {
  label: string; value: string; sub?: string; positive?: boolean;
}) {
  return (
    <div className="bg-card/60 border border-border/50 rounded-lg p-3 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{label}</span>
      <span className={cn("text-lg font-bold font-mono",
        positive === true && "text-green-400", positive === false && "text-red-400")}>
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─── Sort indicator ───────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Backtest() {
  const qc = useQueryClient();
  const { data, isLoading } = useBacktestSignals();

  const refreshMut = useMutation({
    mutationFn: async () => {
      await fetch(`${API_BASE}/api/backtest/refresh`, { method: "POST" });
      qc.removeQueries({ queryKey: ["backtest-signals"] });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backtest-signals"] }),
  });

  // ── Filters ──
  const [days,         setDays]         = useState<7 | 14 | 30>(30);
  const [mode,         setMode]         = useState<"normal" | "contrarian">("normal");
  const [tp,           setTp]           = useState(0.5);
  const [sl,           setSl]           = useState(0.5);
  const [horizon,      setHorizon]      = useState(4);
  const [dirFilter,    setDirFilter]    = useState<"all" | "LONG" | "SHORT">("all");
  const [leverage,     setLeverage]     = useState(15);
  const [positionPct,  setPositionPct]  = useState(10);
  const [deposit,      setDeposit]      = useState(1000);
  const [maxPositions, setMaxPositions] = useState(4);
  const [fee,          setFee]          = useState(0.05); // BingX taker 0.05%
  const [sortKey,      setSortKey]      = useState<SortKey>("ts");
  const [sortDir,      setSortDir]      = useState<SortDir>("desc");
  const [page,         setPage]         = useState(1);
  const PAGE_SIZE = 50;

  const { trades, skippedCount, finalBalance, minBalance } = useMemo(() => {
    if (!data?.signals?.length) return { trades: [], skippedCount: 0, finalBalance: deposit, minBalance: deposit };
    return runPortfolio(data.signals, {
      days, mode, tp, sl, horizon, leverage, positionPct, deposit, maxPositions, dirFilter, feePct: fee,
    });
  }, [data?.signals, days, mode, tp, sl, horizon, leverage, positionPct, deposit, maxPositions, dirFilter, fee]);

  const sorted = useMemo(() => {
    return [...trades].sort((a, b) => {
      let va: number | string, vb: number | string;
      if (sortKey === "ts")      { va = a.raw.ts;   vb = b.raw.ts; }
      else if (sortKey === "sym"){ va = a.raw.sym;   vb = b.raw.sym; }
      else if (sortKey === "adx"){ va = a.raw.adx;   vb = b.raw.adx; }
      else                       { va = a.pnlDeposit; vb = b.pnlDeposit; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [trades, sortKey, sortDir]);

  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const toggleSort = useCallback((col: SortKey) => {
    if (sortKey === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(col); setSortDir("desc"); }
    setPage(1);
  }, [sortKey]);

  // ── Stats ──
  const stats = useMemo(() => {
    if (!trades.length) return null;
    const pnlsDep = trades.map(t => t.pnlDeposit);
    const wins    = trades.filter(t => t.pnlDeposit > 0).length;
    const liqs    = trades.filter(t => t.exitReason === "LIQ").length;
    const byTp    = trades.filter(t => t.exitReason === "TP").length;
    const bySl    = trades.filter(t => t.exitReason === "SL").length;
    const sumDep  = pnlsDep.reduce((a, b) => a + b, 0);
    return {
      total: trades.length, wins, skipped: skippedCount,
      winRate: wins / trades.length * 100,
      avgDep: sumDep / trades.length,
      sumDep,
      best: Math.max(...pnlsDep), worst: Math.min(...pnlsDep),
      liqs, byTp, bySl, byTime: trades.length - byTp - bySl - liqs,
    };
  }, [trades, skippedCount]);

  const horizonLabel: Record<number, string> = { 1: "4ч", 2: "8ч", 3: "12ч", 4: "16ч", 6: "24ч" };
  const loading = isLoading || refreshMut.isPending;

  return (
    <div className="min-h-screen pb-8">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-5 pt-3">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4 border-b border-border/40 pb-3">
          <div className="p-1.5 bg-primary/10 rounded border border-primary/30">
            <FlaskConical className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              BACKTEST
            </h1>
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase mt-0.5">
              EMA20/80 + ADX≥15 · симуляция портфеля с лимитом позиций
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refreshMut.mutate()} disabled={loading}
            className="gap-1.5 text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {data?.cached ? "Обновить" : "Загружено"}
          </Button>
        </motion.div>

        {/* Computing notice */}
        {data?.computing && (
          <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-sm text-yellow-300">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            Загружаем данные с биржи (~30–60 сек)... страница обновится автоматически
          </div>
        )}

        {/* ── Filters ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card/50 border border-border/50 rounded-xl p-4 mb-4 space-y-3">

          {/* Row 1: period / mode / horizon / direction */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-mono uppercase">Период</label>
              <div className="flex gap-1">
                {([7, 14, 30] as const).map(d => (
                  <button key={d} onClick={() => { setDays(d); setPage(1); }}
                    className={cn("flex-1 rounded px-1.5 py-1.5 text-xs font-mono border transition-all",
                      days === d ? "bg-primary/20 border-primary/50 text-primary" : "border-border/40 text-muted-foreground hover:border-border")}>
                    {d}д
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-mono uppercase">Режим</label>
              <div className="flex gap-1">
                {(["normal", "contrarian"] as const).map(m => (
                  <button key={m} onClick={() => { setMode(m); setPage(1); }}
                    className={cn("flex-1 rounded px-1.5 py-1.5 text-xs font-mono border transition-all",
                      mode === m
                        ? m === "normal" ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                          : "bg-purple-500/20 border-purple-500/50 text-purple-400"
                        : "border-border/40 text-muted-foreground hover:border-border")}>
                    {m === "normal" ? "Обычный" : "Реверс"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-mono uppercase">Горизонт</label>
              <div className="flex gap-1">
                {([1, 2, 4, 6] as const).map(h => (
                  <button key={h} onClick={() => { setHorizon(h); setPage(1); }}
                    className={cn("flex-1 rounded px-1 py-1.5 text-xs font-mono border transition-all",
                      horizon === h ? "bg-primary/20 border-primary/50 text-primary" : "border-border/40 text-muted-foreground hover:border-border")}>
                    {h * 4}ч
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-mono uppercase">Сигнал</label>
              <div className="flex gap-1">
                {(["all", "LONG", "SHORT"] as const).map(d => (
                  <button key={d} onClick={() => { setDirFilter(d); setPage(1); }}
                    className={cn("flex-1 rounded px-1 py-1.5 text-xs font-mono border transition-all",
                      dirFilter === d
                        ? d === "LONG" ? "bg-green-500/20 border-green-500/50 text-green-400"
                          : d === "SHORT" ? "bg-red-500/20 border-red-500/50 text-red-400"
                          : "bg-primary/20 border-primary/50 text-primary"
                        : "border-border/40 text-muted-foreground hover:border-border")}>
                    {d === "all" ? "Все" : d === "LONG" ? "📈" : "📉"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: TP / SL / Leverage / Position% / Deposit / MaxPos / Fee */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <NumInput label="TP % от входа" value={tp} onChange={v => { setTp(v); setPage(1); }}
              min={0} max={500} step={0.5} suffix="%" placeholder="0 = выкл" />
            <NumInput label="SL % от входа" value={sl} onChange={v => { setSl(v); setPage(1); }}
              min={0} max={100} step={0.5} suffix="%" placeholder="0 = выкл" />
            <NumInput label="Плечо" value={leverage} onChange={v => { setLeverage(Math.max(1, v)); setPage(1); }}
              min={1} max={100} step={1} suffix="×" />
            <NumInput label="Размер позиции" value={positionPct} onChange={v => { setPositionPct(Math.max(1, v)); setPage(1); }}
              min={1} max={100} step={1} suffix="%" />
            <NumInput label="Депозит" value={deposit} onChange={v => { setDeposit(Math.max(1, v)); setPage(1); }}
              min={1} step={100} suffix="USDT" />
            <NumInput label="Макс. позиций" value={maxPositions} onChange={v => { setMaxPositions(Math.max(1, Math.min(50, v))); setPage(1); }}
              min={1} max={50} step={1} suffix="шт" />
            <NumInput label="Комиссия (тейкер)" value={fee} onChange={v => { setFee(Math.max(0, v)); setPage(1); }}
              min={0} max={1} step={0.01} suffix="%" />
          </div>

          {/* Info strip */}
          <div className="flex flex-col sm:flex-row gap-2">
            {leverage > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-orange-500/5 border border-orange-500/20 rounded px-3 py-1.5 flex-1">
                <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                Ликвидация при движении против позиции на{" "}
                <span className="text-orange-400 font-bold">{(100 / leverage).toFixed(2)}%</span>
                {" "}· SL защищает если ближе к входу
              </div>
            )}
            <div className="flex items-center gap-3 text-xs font-mono bg-primary/5 border border-primary/20 rounded px-3 py-1.5 flex-1 flex-wrap">
              <BarChart3 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground">Маржа/сделка:</span>
              <span className="text-primary font-bold">${(deposit * positionPct / 100).toFixed(2)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Объём:</span>
              <span className="text-foreground font-bold">${(deposit * positionPct / 100 * leverage).toFixed(2)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Комиссия/сделка:</span>
              <span className="text-yellow-400 font-bold">
                -${(deposit * positionPct / 100 * leverage * 2 * fee / 100).toFixed(3)}
              </span>
              <span className="text-muted-foreground text-[10px]">({(2 * fee * leverage).toFixed(2)}% маржи)</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Макс. в рынке (по лимиту):</span>
              <span className="text-foreground font-bold">${(deposit * positionPct / 100 * maxPositions).toFixed(2)}</span>
              <span className="text-muted-foreground text-[10px]">· по марже: {Math.floor(deposit / (deposit * positionPct / 100))} поз.</span>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        {stats && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
            <StatCard label="Сделок" value={String(stats.total)}
              sub={`пропущено: ${stats.skipped}`} />
            <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`}
              sub={`${stats.wins}/${stats.total}`} positive={stats.winRate >= 50} />
            <StatCard label="Avg PnL" value={fmtP(stats.avgDep)}
              sub="% депо / сделка" positive={stats.avgDep >= 0} />
            <StatCard label="Сумм. PnL %" value={fmtP(stats.sumDep, 1)}
              sub="% от депо" positive={stats.sumDep >= 0} />
            <StatCard label="Сумм. PnL $" value={fmtU(finalBalance - deposit)}
              sub="USDT" positive={finalBalance >= deposit} />
            <StatCard label="Итог депозит" value={`$${finalBalance.toFixed(0)}`}
              sub={`старт $${deposit}`} positive={finalBalance >= deposit} />
            <StatCard label="Мин. баланс" value={`$${minBalance.toFixed(0)}`}
              sub="просадка" positive={minBalance >= deposit} />
            <StatCard label="Ликвидаций" value={String(stats.liqs)}
              sub={`TP:${stats.byTp} SL:${stats.bySl} T:${stats.byTime}`}
              positive={stats.liqs === 0} />
          </motion.div>
        )}

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card/50 border border-border/50 rounded-xl overflow-hidden">
          {loading && !data?.signals?.length ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm font-mono">Загружаем данные с BingX...</span>
              <span className="text-xs">Первая загрузка занимает ~30–60 секунд</span>
            </div>
          ) : !trades.length ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
              <BarChart3 className="w-8 h-8 opacity-30" />
              <span className="text-sm">Нет сигналов за выбранный период</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      {([
                        { key: "ts" as SortKey,     label: "Дата" },
                        { key: "sym" as SortKey,    label: "Токен" },
                        { key: null,                label: "Сигнал" },
                        { key: null,                label: "Режим" },
                        { key: "adx" as SortKey,   label: "ADX" },
                        { key: null,                label: "Вход" },
                        { key: null,                label: "Выход" },
                        { key: null,                label: "Причина" },
                        { key: "pnlPct" as SortKey, label: "PnL %" },
                        { key: null,                label: "PnL USDT" },
                      ]).map(({ key, label }) => (
                        <th key={label} onClick={() => key && toggleSort(key)}
                          className={cn("px-3 py-2.5 text-left text-muted-foreground font-normal",
                            key && "cursor-pointer hover:text-foreground select-none")}>
                          <div className="flex items-center gap-1">
                            {label}
                            {key && <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((t, i) => {
                      const win = t.pnlDeposit > 0;
                      const isLiq = t.exitReason === "LIQ";
                      return (
                        <tr key={`${t.raw.sym}-${t.raw.ts}-${i}`}
                          className={cn("border-b border-border/20 hover:bg-muted/20 transition-colors",
                            isLiq && "bg-orange-500/5")}>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(t.raw.ts)}</td>
                          <td className="px-3 py-2 font-bold text-foreground">{t.raw.sym}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={cn("text-xs",
                              t.raw.direction === "LONG" ? "border-green-500/40 text-green-400" : "border-red-500/40 text-red-400")}>
                              {t.raw.direction === "LONG" ? "📈 LONG" : "📉 SHORT"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={cn("text-xs",
                              t.actualDir === "LONG" ? "border-green-500/40 text-green-400" : "border-red-500/40 text-red-400")}>
                              {t.actualDir === "LONG" ? "🚀 ЛОНГ" : "🔴 ШОРТ"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{t.raw.adx.toFixed(1)}</td>
                          <td className="px-3 py-2 text-muted-foreground">{t.raw.entry.toPrecision(5)}</td>
                          <td className="px-3 py-2 text-muted-foreground">{t.exitPrice.toPrecision(5)}</td>
                          <td className="px-3 py-2">
                            <span className={cn("px-1.5 py-0.5 rounded text-xs",
                              t.exitReason === "TP"  ? "bg-green-500/10 text-green-400"
                              : t.exitReason === "SL"  ? "bg-red-500/10 text-red-400"
                              : t.exitReason === "LIQ" ? "bg-orange-500/20 text-orange-400 font-bold"
                              : "bg-muted/50 text-muted-foreground")}>
                              {t.exitReason === "TP" ? "✅ TP"
                                : t.exitReason === "SL" ? "🛑 SL"
                                : t.exitReason === "LIQ" ? "⚡ LIQ"
                                : `⏱ ${(t.exitCandleIdx + 1) * 4}ч`}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={cn("font-bold flex items-center gap-1",
                              win ? "text-green-400" : isLiq ? "text-orange-400" : "text-red-400")}>
                              {win ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {fmtP(t.pnlDeposit)}
                            </span>
                          </td>
                          <td className={cn("px-3 py-2 font-bold",
                            win ? "text-green-400" : isLiq ? "text-orange-400" : "text-red-400")}>
                            {fmtU(t.pnlUSDT)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
                  <span className="text-xs text-muted-foreground font-mono">
                    {sorted.length} сделок · страница {page}/{totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="text-xs h-7 px-2">←</Button>
                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      const p = page <= 4 ? i + 1 : page + i - 3;
                      if (p < 1 || p > totalPages) return null;
                      return (
                        <Button key={p} size="sm" variant={p === page ? "default" : "outline"}
                          onClick={() => setPage(p)} className="text-xs h-7 px-2">{p}</Button>
                      );
                    })}
                    <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                      className="text-xs h-7 px-2">→</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Symbol breakdown */}
        {stats && trades.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-4 bg-card/50 border border-border/50 rounded-xl p-4">
            <h3 className="text-sm font-bold text-muted-foreground font-mono uppercase mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Топ по сумм. PnL · {mode === "contrarian" ? "реверс" : "обычный"} · ×{leverage} · {horizonLabel[horizon]}
            </h3>
            <SymbolBreakdown trades={trades} deposit={deposit} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SymbolBreakdown({ trades, deposit }: { trades: ComputedTrade[]; deposit: number }) {
  const bySymbol = useMemo(() => {
    const map: Record<string, { pnls: number[]; wins: number; liqs: number }> = {};
    for (const t of trades) {
      if (!map[t.raw.sym]) map[t.raw.sym] = { pnls: [], wins: 0, liqs: 0 };
      map[t.raw.sym].pnls.push(t.pnlDeposit);
      if (t.pnlDeposit > 0) map[t.raw.sym].wins++;
      if (t.exitReason === "LIQ") map[t.raw.sym].liqs++;
    }
    return Object.entries(map)
      .map(([sym, { pnls, wins, liqs }]) => ({
        sym, n: pnls.length, wins, liqs,
        winRate: wins / pnls.length * 100,
        total: pnls.reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [trades]);

  const maxAbs = Math.max(...bySymbol.map(x => Math.abs(x.total)), 1);
  const top = bySymbol.slice(0, 10);
  const bot = [...bySymbol].sort((a, b) => a.total - b.total).slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[{ label: "🏆 Лучшие 10", items: top }, { label: "💀 Худшие 10", items: bot }].map(({ label, items }) => (
        <div key={label}>
          <p className="text-xs text-muted-foreground font-mono mb-2">{label}</p>
          <div className="space-y-1.5">
            {items.map(s => (
              <div key={s.sym} className="flex items-center gap-2 text-xs font-mono">
                <span className="w-16 font-bold text-foreground truncate">{s.sym}</span>
                <span className="text-muted-foreground w-8 text-right">{s.n}шт</span>
                <span className="text-muted-foreground w-12 text-right">{s.winRate.toFixed(0)}%WR</span>
                {s.liqs > 0 && <span className="text-orange-400 text-xs">⚡{s.liqs}</span>}
                <div className="flex-1 h-1.5 bg-muted/40 rounded overflow-hidden">
                  <div className={cn("h-full rounded transition-all", s.total >= 0 ? "bg-green-500" : "bg-red-500")}
                    style={{ width: `${Math.min(100, Math.abs(s.total) / maxAbs * 100)}%` }} />
                </div>
                <span className={cn("w-20 text-right font-bold",
                  s.total >= 0 ? "text-green-400" : "text-red-400")}>
                  {fmtP(s.total, 1)}
                </span>
                <span className={cn("w-20 text-right text-muted-foreground")}>
                  {fmtU(s.total * deposit / 100)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
