import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FlaskConical, TrendingUp, TrendingDown, RefreshCw, Loader2,
  BarChart3, Award, AlertTriangle, ChevronUp, ChevronDown, ChevronsUpDown,
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
  pnlPct: number;
  exitPrice: number;
  exitReason: "TP" | "SL" | "TIME";
  exitCandleIdx: number;
}

type SortKey = "ts" | "sym" | "pnlPct" | "adx";
type SortDir = "asc" | "desc";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(ms: number) {
  return new Date(ms).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}
function fmtP(v: number, d = 2) {
  return (v >= 0 ? "+" : "") + v.toFixed(d) + "%";
}

function computeTrade(
  signal: RawSignal,
  mode: "normal" | "contrarian",
  tpPct: number,
  slPct: number,
  horizonCandles: number,
): ComputedTrade {
  const actualDir: "LONG" | "SHORT" =
    mode === "contrarian"
      ? signal.direction === "LONG" ? "SHORT" : "LONG"
      : signal.direction;

  const entry = signal.entry;
  const tpPrice = tpPct > 0
    ? actualDir === "LONG" ? entry * (1 + tpPct / 100) : entry * (1 - tpPct / 100)
    : null;
  const slPrice = slPct > 0
    ? actualDir === "LONG" ? entry * (1 - slPct / 100) : entry * (1 + slPct / 100)
    : null;

  const candles = signal.exits.slice(0, horizonCandles);
  let exitPrice = candles.length > 0 ? candles[candles.length - 1].c : entry;
  let exitReason: "TP" | "SL" | "TIME" = "TIME";
  let exitCandleIdx = candles.length - 1;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (tpPrice !== null) {
      const hit = actualDir === "LONG" ? c.h >= tpPrice : c.l <= tpPrice;
      if (hit) { exitPrice = tpPrice; exitReason = "TP"; exitCandleIdx = i; break; }
    }
    if (slPrice !== null) {
      const hit = actualDir === "LONG" ? c.l <= slPrice : c.h >= slPrice;
      if (hit) { exitPrice = slPrice; exitReason = "SL"; exitCandleIdx = i; break; }
    }
  }

  const rawPnl = actualDir === "LONG"
    ? (exitPrice - entry) / entry * 100
    : (entry - exitPrice) / entry * 100;
  const pnlPct = rawPnl * 15 * 0.10; // leverage × position size

  return { raw: signal, actualDir, pnlPct, exitPrice, exitReason, exitCandleIdx };
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
    refetchInterval: (data) => data?.state?.data?.computing ? 10000 : false,
    staleTime: 55 * 60 * 1000,
  });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-card/60 border border-border/50 rounded-lg p-3 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{label}</span>
      <span className={cn("text-xl font-bold font-mono", positive === true && "text-green-400", positive === false && "text-red-400")}>
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
  const { data, isLoading, isFetching } = useBacktestSignals();

  const refreshMut = useMutation({
    mutationFn: async () => {
      await fetch(`${API_BASE}/api/backtest/refresh`, { method: "POST" });
      qc.removeQueries({ queryKey: ["backtest-signals"] });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backtest-signals"] }),
  });

  // ── Filters ──
  const [days, setDays]         = useState<7 | 14 | 30>(30);
  const [mode, setMode]         = useState<"normal" | "contrarian">("contrarian");
  const [tp, setTp]             = useState(0);
  const [sl, setSl]             = useState(0);
  const [horizon, setHorizon]   = useState(4); // candles: 1=4h,2=8h,4=16h,6=24h
  const [dirFilter, setDirFilter] = useState<"all" | "LONG" | "SHORT">("all");
  const [sortKey, setSortKey]   = useState<SortKey>("ts");
  const [sortDir, setSortDir]   = useState<SortDir>("desc");
  const [page, setPage]         = useState(1);
  const PAGE_SIZE = 50;

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const trades = useMemo(() => {
    if (!data?.signals) return [];
    return data.signals
      .filter(s => s.ts >= cutoff && (dirFilter === "all" || s.direction === dirFilter))
      .map(s => computeTrade(s, mode, tp, sl, horizon));
  }, [data?.signals, cutoff, mode, tp, sl, horizon, dirFilter]);

  const sorted = useMemo(() => {
    return [...trades].sort((a, b) => {
      let va: number | string, vb: number | string;
      if (sortKey === "ts")     { va = a.raw.ts;    vb = b.raw.ts; }
      else if (sortKey === "sym") { va = a.raw.sym; vb = b.raw.sym; }
      else if (sortKey === "adx") { va = a.raw.adx; vb = b.raw.adx; }
      else                       { va = a.pnlPct;   vb = b.pnlPct; }
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
    const wins   = trades.filter(t => t.pnlPct > 0);
    const losses = trades.filter(t => t.pnlPct < 0);
    const pnls   = trades.map(t => t.pnlPct);
    const byTp   = trades.filter(t => t.exitReason === "TP").length;
    const bySl   = trades.filter(t => t.exitReason === "SL").length;
    return {
      total: trades.length,
      wins: wins.length,
      winRate: wins.length / trades.length * 100,
      avgPnl: pnls.reduce((a, b) => a + b, 0) / pnls.length,
      sumPnl: pnls.reduce((a, b) => a + b, 0),
      best: Math.max(...pnls),
      worst: Math.min(...pnls),
      byTp, bySl,
      byTime: trades.length - byTp - bySl,
    };
  }, [trades]);

  const horizonLabel = { 1: "4ч", 2: "8ч", 3: "12ч", 4: "16ч", 6: "24ч" }[horizon] ?? `${horizon * 4}ч`;

  const loading = isLoading || isFetching || refreshMut.isPending;

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
              EMA20/80 + ADX≥15 · ×15 плечо · 10% депо
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refreshMut.mutate()} disabled={loading}
            className="gap-1.5 text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {data?.cached ? `Кэш ${Math.round((data as {cacheAge?: number}).cacheAge ?? 0 / 60)}м` : "Обновить"}
          </Button>
        </motion.div>

        {/* Computing notice */}
        {data?.computing && (
          <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-sm text-yellow-300">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            Загружаем данные с биржи (~30–60 сек)... страница обновится автоматически
          </div>
        )}

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card/50 border border-border/50 rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

          {/* Period */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-mono uppercase">Период</label>
            <div className="flex gap-1">
              {([7, 14, 30] as const).map(d => (
                <button key={d} onClick={() => { setDays(d); setPage(1); }}
                  className={cn("flex-1 rounded px-1.5 py-1 text-xs font-mono border transition-all",
                    days === d ? "bg-primary/20 border-primary/50 text-primary" : "border-border/40 text-muted-foreground hover:border-border")}>
                  {d}д
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-mono uppercase">Режим</label>
            <div className="flex gap-1">
              <button onClick={() => { setMode("normal"); setPage(1); }}
                className={cn("flex-1 rounded px-1.5 py-1 text-xs font-mono border transition-all",
                  mode === "normal" ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "border-border/40 text-muted-foreground hover:border-border")}>
                Обычный
              </button>
              <button onClick={() => { setMode("contrarian"); setPage(1); }}
                className={cn("flex-1 rounded px-1.5 py-1 text-xs font-mono border transition-all",
                  mode === "contrarian" ? "bg-purple-500/20 border-purple-500/50 text-purple-400" : "border-border/40 text-muted-foreground hover:border-border")}>
                Реверс
              </button>
            </div>
          </div>

          {/* Horizon */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-mono uppercase">Горизонт</label>
            <div className="flex gap-1">
              {([1, 2, 4, 6] as const).map(h => (
                <button key={h} onClick={() => { setHorizon(h); setPage(1); }}
                  className={cn("flex-1 rounded px-1 py-1 text-xs font-mono border transition-all",
                    horizon === h ? "bg-primary/20 border-primary/50 text-primary" : "border-border/40 text-muted-foreground hover:border-border")}>
                  {h * 4}ч
                </button>
              ))}
            </div>
          </div>

          {/* TP */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-mono uppercase">TP % от входа</label>
            <div className="flex items-center gap-1">
              <input type="number" min={0} max={200} step={0.5} value={tp || ""}
                onChange={e => { setTp(parseFloat(e.target.value) || 0); setPage(1); }}
                placeholder="0 = выкл"
                className="w-full rounded border border-border/50 bg-background/50 px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-green-500/50" />
              {tp > 0 && <button onClick={() => setTp(0)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>}
            </div>
          </div>

          {/* SL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-mono uppercase">SL % от входа</label>
            <div className="flex items-center gap-1">
              <input type="number" min={0} max={200} step={0.5} value={sl || ""}
                onChange={e => { setSl(parseFloat(e.target.value) || 0); setPage(1); }}
                placeholder="0 = выкл"
                className="w-full rounded border border-border/50 bg-background/50 px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-red-500/50" />
              {sl > 0 && <button onClick={() => setSl(0)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>}
            </div>
          </div>

          {/* Direction filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-mono uppercase">Сигнал</label>
            <div className="flex gap-1">
              {(["all", "LONG", "SHORT"] as const).map(d => (
                <button key={d} onClick={() => { setDirFilter(d); setPage(1); }}
                  className={cn("flex-1 rounded px-1 py-1 text-xs font-mono border transition-all",
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
        </motion.div>

        {/* Stats */}
        {stats && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
            <StatCard label="Сигналов" value={String(stats.total)}
              sub={`${days}д · ${mode === "contrarian" ? "реверс" : "обычный"} · ${horizonLabel}`} />
            <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`}
              sub={`${stats.wins}/${stats.total}`} positive={stats.winRate >= 50} />
            <StatCard label="Avg PnL" value={fmtP(stats.avgPnl)}
              sub="на сделку" positive={stats.avgPnl >= 0} />
            <StatCard label="Сумм. PnL" value={fmtP(stats.sumPnl, 1)}
              sub="% от депо" positive={stats.sumPnl >= 0} />
            <StatCard label="Лучшая" value={fmtP(stats.best)} positive={true} />
            <StatCard label="Худшая" value={fmtP(stats.worst)} positive={false} />
            <StatCard label="Выходы"
              value={`${stats.byTp > 0 ? `${stats.byTp}TP` : ""}${stats.bySl > 0 ? ` ${stats.bySl}SL` : ""}`}
              sub={`${stats.byTime} по времени`} />
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
                        { key: "ts" as SortKey, label: "Дата" },
                        { key: "sym" as SortKey, label: "Токен" },
                        { key: null, label: "Сигнал" },
                        { key: null, label: "Режим" },
                        { key: "adx" as SortKey, label: "ADX" },
                        { key: null, label: "Вход" },
                        { key: null, label: "Выход" },
                        { key: null, label: "Выход по" },
                        { key: "pnlPct" as SortKey, label: "PnL %" },
                      ]).map(({ key, label }) => (
                        <th key={label}
                          onClick={() => key && toggleSort(key)}
                          className={cn(
                            "px-3 py-2.5 text-left text-muted-foreground font-normal",
                            key && "cursor-pointer hover:text-foreground select-none"
                          )}>
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
                      const win = t.pnlPct > 0;
                      return (
                        <tr key={`${t.raw.sym}-${t.raw.ts}-${i}`}
                          className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {fmtDate(t.raw.ts)}
                          </td>
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
                              t.exitReason === "TP" ? "bg-green-500/10 text-green-400"
                                : t.exitReason === "SL" ? "bg-red-500/10 text-red-400"
                                  : "bg-muted/50 text-muted-foreground")}>
                              {t.exitReason === "TP" ? "✅ TP" : t.exitReason === "SL" ? "🛑 SL" : `⏱ ${(t.exitCandleIdx + 1) * 4}ч`}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={cn("font-bold flex items-center gap-1",
                              win ? "text-green-400" : "text-red-400")}>
                              {win ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {fmtP(t.pnlPct)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
                  <span className="text-xs text-muted-foreground font-mono">
                    {sorted.length} сигналов · страница {page}/{totalPages}
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
              <Award className="w-4 h-4" /> Топ по сумм. PnL ({mode === "contrarian" ? "реверс" : "обычный"})
            </h3>
            <SymbolBreakdown trades={trades} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SymbolBreakdown({ trades }: { trades: ComputedTrade[] }) {
  const bySymbol = useMemo(() => {
    const map: Record<string, { pnls: number[]; wins: number }> = {};
    for (const t of trades) {
      if (!map[t.raw.sym]) map[t.raw.sym] = { pnls: [], wins: 0 };
      map[t.raw.sym].pnls.push(t.pnlPct);
      if (t.pnlPct > 0) map[t.raw.sym].wins++;
    }
    return Object.entries(map)
      .map(([sym, { pnls, wins }]) => ({
        sym, n: pnls.length, wins,
        winRate: wins / pnls.length * 100,
        total: pnls.reduce((a, b) => a + b, 0),
        avg: pnls.reduce((a, b) => a + b, 0) / pnls.length,
      }))
      .sort((a, b) => b.total - a.total);
  }, [trades]);

  const top = bySymbol.slice(0, 10);
  const bot = bySymbol.slice(-10).reverse();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[
        { label: "🏆 Лучшие 10", items: top },
        { label: "💀 Худшие 10", items: bot },
      ].map(({ label, items }) => (
        <div key={label}>
          <p className="text-xs text-muted-foreground font-mono mb-2">{label}</p>
          <div className="space-y-1">
            {items.map(s => (
              <div key={s.sym} className="flex items-center gap-2 text-xs font-mono">
                <span className="w-16 font-bold text-foreground truncate">{s.sym}</span>
                <span className="text-muted-foreground w-10 text-right">{s.n}сд</span>
                <span className="text-muted-foreground w-14 text-right">{s.winRate.toFixed(0)}%WR</span>
                <div className="flex-1 h-1.5 bg-muted/40 rounded overflow-hidden">
                  <div className={cn("h-full rounded", s.total >= 0 ? "bg-green-500" : "bg-red-500")}
                    style={{ width: `${Math.min(100, Math.abs(s.total) / Math.max(...bySymbol.map(x => Math.abs(x.total))) * 100)}%` }} />
                </div>
                <span className={cn("w-16 text-right font-bold", s.total >= 0 ? "text-green-400" : "text-red-400")}>
                  {fmtP(s.total, 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
