import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Activity, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
      setUrgent(diff < 5 * 60_000); // последние 5 минут — жёлтый
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

interface StatisticsPanelProps {
  openPosition: { direction?: string } | null;
}

export function StatisticsPanel({ openPosition }: StatisticsPanelProps) {
  const { data } = useSignalStats();
  const { remaining, urgent } = useNextCandleCountdown(4);

  const hasPos = !!openPosition;
  const lastSig = data?.lastSignal;
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

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">Позиции открыты</span>
          <span className={cn(
            "px-2 py-0.5 rounded-full border font-mono text-xs font-bold uppercase",
            hasPos
              ? "bg-success/20 text-success border-success/40"
              : "bg-muted/20 text-muted-foreground border-border/40"
          )}>
            {hasPos ? "ДА" : "НЕТ"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">Сигналов за 24ч</span>
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-primary" />
            <span className="font-mono text-sm font-bold leading-none">{data?.todayCount ?? "—"}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
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
