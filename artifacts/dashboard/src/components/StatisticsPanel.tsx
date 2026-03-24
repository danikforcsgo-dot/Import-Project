import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PnlAnalysis {
  today: number | null;
  week: number | null;
  month: number | null;
}

interface SignalStats {
  todayCount: number;
  lastSignal: {
    id: number;
    symbol: string;
    signalType: string;
    price: number;
    createdAt: string;
  } | null;
}

function usePnlAnalysis() {
  return useQuery({
    queryKey: ["/api/live-trading/pnl-analysis"],
    queryFn: async () => {
      const res = await fetch("/api/live-trading/pnl-analysis");
      return res.json() as Promise<PnlAnalysis>;
    },
    refetchInterval: 60000,
  });
}

function useSignalStats() {
  return useQuery({
    queryKey: ["/api/signals/stats"],
    queryFn: async () => {
      const res = await fetch("/api/signals/stats");
      return res.json() as Promise<SignalStats>;
    },
    refetchInterval: 30000,
  });
}

function useNextCandleCountdown(periodHours = 4) {
  const [remaining, setRemaining] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    function tick() {
      const now = Date.now();
      const periodMs = periodHours * 60 * 60 * 1000;
      const nextCandle = Math.ceil(now / periodMs) * periodMs;
      const diff = Math.max(0, nextCandle - now);
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setRemaining(
        h > 0
          ? `${h}ч ${String(m).padStart(2, "0")}м ${String(s).padStart(2, "0")}с`
          : `${String(m).padStart(2, "0")}м ${String(s).padStart(2, "0")}с`
      );
      setUrgent(diff < 5 * 60_000);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [periodHours]);

  return { remaining, urgent };
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}с`;
  if (diff < 3600) return `${Math.floor(diff / 60)}м`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`;
  return `${Math.floor(diff / 86400)}д`;
}

function PnlRow({ label, value }: { label: string; value: number | null }) {
  const isLoading = value === null;
  const isPos = (value ?? 0) >= 0;
  const formatted = isLoading
    ? "—"
    : `${isPos ? "+" : ""}${value!.toFixed(2)} USDT`;

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-1.5">
        {!isLoading && (
          isPos
            ? <TrendingUp className="w-3 h-3 text-success shrink-0" />
            : <TrendingDown className="w-3 h-3 text-danger shrink-0" />
        )}
        <span className={cn(
          "font-mono text-sm font-bold tabular-nums",
          isLoading ? "text-muted-foreground" : isPos ? "text-success" : "text-danger"
        )}>
          {formatted}
        </span>
      </div>
    </div>
  );
}

export function StatisticsPanel() {
  const { data: pnl } = usePnlAnalysis();
  const { data: signals } = useSignalStats();
  const { remaining, urgent } = useNextCandleCountdown(4);

  const lastSig = signals?.lastSignal;
  const tokenName = lastSig?.symbol?.replace("-USDT", "").replace("/USDT:USDT", "") ?? "";

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs font-mono uppercase tracking-widest flex items-center gap-1.5 text-muted-foreground">
          <Activity className="w-4 h-4 text-primary" />
          Статистика
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 flex flex-col gap-2.5">

        <PnlRow label="П/У сегодня"  value={pnl?.today  ?? null} />
        <PnlRow label="П/У за 7 дн." value={pnl?.week   ?? null} />
        <PnlRow label="П/У за 30 дн." value={pnl?.month  ?? null} />

        <div className="border-t border-border/40 pt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            До 4H свечи
          </span>
          <span className={cn(
            "font-mono text-sm font-bold tabular-nums",
            urgent ? "text-warning" : "text-primary"
          )}>
            {remaining || "—"}
          </span>
        </div>

        <div className="border-t border-border/40 pt-2">
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1.5">
            Последний сигнал
          </div>
          {lastSig ? (
            <div className="flex items-center gap-2">
              <span className="font-bold font-mono text-sm">{tokenName}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-xs font-bold font-mono border",
                lastSig.signalType === "BUY"
                  ? "bg-success/20 text-success border-success/40"
                  : "bg-danger/20 text-danger border-danger/40"
              )}>
                {lastSig.signalType}
              </span>
              <span className="text-xs text-muted-foreground font-mono ml-auto">
                {timeAgo(lastSig.createdAt)} назад
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground font-mono">Нет данных</span>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
