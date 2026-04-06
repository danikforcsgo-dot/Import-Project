import { motion, AnimatePresence } from "framer-motion";
import { Target, X, RefreshCw, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatMoney, cn } from "@/lib/utils";
import type { TradingState } from "@workspace/api-client-react";
import { useState, useEffect } from "react";

const TRAIL_PCT = 0.5; // должно совпадать со scanner.py TRAIL_PCT

interface PositionPnlEntry {
  symbol: string;
  unrealizedProfit: number;
  currentPrice: number;
}

interface PositionPnlData {
  unrealizedProfit?: number;
  currentPrice?: number;
  symbol?: string;
  noPosition?: boolean;
  positions?: PositionPnlEntry[];
}

interface BotPanelProps {
  title: string;
  data: TradingState;
  exchangeBalance?: number | null;
  positionPnl?: PositionPnlData | null;
  onToggle?: (enabled: boolean) => void;
  isToggling?: boolean;
  onClosePosition?: (token: string) => void;
  isClosing?: boolean;
  onReconcile?: () => void;
  isReconciling?: boolean;
}

interface LocalOpenPos {
  token?: string;
  direction?: string;
  entry_price?: number;
  qty?: number;
  tp?: number;
  sl?: number;
  tp_price?: number;
  sl_price?: number;
  best_price?: number;
  atr?: number;
  adx?: number;
  collateral?: number;
  position_value?: number;
  opened_at?: string;
  dca_entries?: number;
  last_dca_at?: string;
}

// Визуальный мини-индикатор уровней цены
function PriceLevelBar({ pos, currentPrice }: { pos: LocalOpenPos; currentPrice: number }) {
  const isLong = pos.direction === "BUY";
  const entry = pos.entry_price ?? 0;
  if (!entry || !currentPrice) return null;

  const tpPrice  = pos.tp_price ?? (pos.tp && pos.tp > 0
    ? entry * (isLong ? 1 + pos.tp / 100 : 1 - pos.tp / 100) : null);
  const bestPr   = pos.best_price ?? entry;
  const tslPrice = TRAIL_PCT > 0
    ? (isLong ? bestPr * (1 - TRAIL_PCT / 100) : bestPr * (1 + TRAIL_PCT / 100))
    : null;

  // Диапазон для нормализации
  const prices = [entry, currentPrice, tpPrice, tslPrice].filter(Boolean) as number[];
  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const pad = (rawMax - rawMin) * 0.3 || entry * 0.002;
  const lo = rawMin - pad;
  const hi = rawMax + pad;
  const norm = (p: number) => Math.max(0, Math.min(100, ((p - lo) / (hi - lo)) * 100));

  // Для LONG — TP сверху, TSL снизу; ось идёт снизу вверх
  const levels = [
    tpPrice  ? { price: tpPrice,     pct: norm(tpPrice),     label: "TP",  color: "#22c55e" } : null,
    { price: entry,      pct: norm(entry),      label: "ENTRY", color: "#94a3b8" },
    tslPrice ? { price: tslPrice,    pct: norm(tslPrice),    label: "TSL", color: "#f97316" } : null,
  ].filter(Boolean) as { price: number; pct: number; label: string; color: string }[];

  const curPct = norm(currentPrice);
  const deltaEntry = ((currentPrice - entry) / entry) * 100 * (isLong ? 1 : -1);

  return (
    <div className="mt-2 pt-2 border-t border-border/40">
      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">Уровни позиции</div>
      <div className="flex gap-3 items-stretch">
        {/* Вертикальная шкала */}
        <div className="relative w-5 flex-shrink-0" style={{ height: 80 }}>
          {/* трек */}
          <div className="absolute left-2 top-0 bottom-0 w-px bg-border/50" />
          {/* уровни */}
          {levels.map(lv => (
            <div
              key={lv.label}
              className="absolute left-0 flex items-center"
              style={{ bottom: `${lv.pct}%`, transform: "translateY(50%)" }}
            >
              <div className="w-4 h-px" style={{ backgroundColor: lv.color }} />
            </div>
          ))}
          {/* текущая цена — точка */}
          <div
            className="absolute left-0.5 w-3 h-3 rounded-full border-2 border-background"
            style={{
              bottom: `${curPct}%`,
              transform: "translateY(50%)",
              backgroundColor: deltaEntry >= 0 ? "#22c55e" : "#ef4444",
            }}
          />
        </div>

        {/* Метки справа */}
        <div className="relative flex-1 text-right" style={{ height: 80 }}>
          {levels.map(lv => (
            <div
              key={lv.label}
              className="absolute right-0 flex items-center gap-1.5 justify-end"
              style={{ bottom: `${lv.pct}%`, transform: "translateY(50%)" }}
            >
              <span className="text-[10px] font-mono font-bold" style={{ color: lv.color }}>{lv.label}</span>
              <span className="text-[10px] font-mono text-muted-foreground">${lv.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
            </div>
          ))}
          {/* текущая цена */}
          <div
            className="absolute right-0 flex items-center gap-1.5 justify-end"
            style={{ bottom: `${curPct}%`, transform: "translateY(50%)" }}
          >
            <span className="text-[10px] font-mono font-bold" style={{ color: deltaEntry >= 0 ? "#22c55e" : "#ef4444" }}>
              NOW {deltaEntry >= 0 ? "+" : ""}{deltaEntry.toFixed(2)}%
            </span>
            <span className="text-[10px] font-mono text-foreground">${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
          </div>
        </div>
      </div>

      {/* TSL best_price строка */}
      {tslPrice && (
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] font-mono text-muted-foreground">TSL лучшая цена</span>
          <span className="text-[10px] font-mono text-orange-400">${bestPr.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
        </div>
      )}
    </div>
  );
}

// Strategy constants — mirrored from scanner.py
const STRATEGY = {
  leverage: 15,
  maxPositions: 2,
  entryPct: 10,
  maxDca: 10,
  slAtr: 5.5,
  tpAtr: 7.0,
  rr: "1:1.27",
  dcaTriggerPct: 1,
  timeframe: "4H",
};

function useTick(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function BotPanel({ title, data, exchangeBalance, positionPnl, onToggle, isToggling, onClosePosition, isClosing, onReconcile, isReconciling }: BotPanelProps) {
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const now = useTick(1000);
  const isEnabled = data.enabled ?? false;
  const storedBalance = data.balance ?? 0;
  const balance = exchangeBalance !== undefined && exchangeBalance !== null ? exchangeBalance : storedBalance;
  const openPositions: LocalOpenPos[] = (
    (data as Record<string, unknown>).open_positions as LocalOpenPos[] | null
  ) ?? (data.open_position ? [data.open_position as LocalOpenPos] : []);

  const openPos = openPositions[0] ?? null;

  return (
    <Card className={cn(
      "flex flex-col transition-all duration-300 h-full",
      !isEnabled && "opacity-75 grayscale-[0.3]"
    )}>
      {/* HEADER */}
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
        <div>
          <CardTitle className={cn("text-sm", title.includes("LIVE") ? "text-danger glow-danger" : "text-primary")}>
            {title}
          </CardTitle>
          {onToggle && (
            <div className="flex items-center gap-2 mt-1">
              <Switch checked={isEnabled} onCheckedChange={onToggle} disabled={isToggling} className="scale-[0.75] origin-left" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                {isEnabled ? "BOT ACTIVE" : "BOT DISABLED"}
              </span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-mono font-bold">{formatMoney(balance)}</div>
          {(exchangeBalance === null || exchangeBalance === undefined) && (
            <div className="text-xs font-mono text-muted-foreground uppercase">● cached</div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2.5 px-4 pb-4">

        {/* STRATEGY PARAMS ROW */}
        <div className="grid grid-cols-4 gap-1.5 p-2 rounded-md bg-background/60 border border-border/40">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest leading-none mb-0.5">ПЛЕЧО</div>
            <div className="text-xs font-bold font-mono text-primary">×{STRATEGY.leverage}</div>
          </div>
          <div className="text-center border-l border-border/40">
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest leading-none mb-0.5">R/R</div>
            <div className="text-xs font-bold font-mono text-success">{STRATEGY.rr}</div>
          </div>
          <div className="text-center border-l border-border/40">
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest leading-none mb-0.5">DCA MAX</div>
            <div className="text-xs font-bold font-mono text-accent">{STRATEGY.maxDca}×</div>
          </div>
          <div className="text-center border-l border-border/40">
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest leading-none mb-0.5">ВХОД</div>
            <div className="text-xs font-bold font-mono text-muted-foreground">{STRATEGY.entryPct}%</div>
          </div>
        </div>

        {/* ACTIVE POSITIONS */}
        <div>
          <div className="text-xs font-bold text-muted-foreground mb-1.5 flex items-center gap-1.5 uppercase tracking-widest">
            <Target className="w-3.5 h-3.5" /> Active Position
            <div className="ml-auto flex items-center gap-2">
              {openPositions.length > 0 && (
                <span className="text-xs font-mono font-normal">
                  {openPositions.length}/{STRATEGY.maxPositions}
                </span>
              )}
              {onReconcile && (
                <button
                  onClick={onReconcile}
                  disabled={isReconciling}
                  title="Синхронизировать позиции с BingX"
                  className={cn(
                    "p-1 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    isReconciling && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <RefreshCw className={cn("w-3 h-3", isReconciling && "animate-spin")} />
                </button>
              )}
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {openPositions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {openPositions.map((pos, idx) => {
                  const symKey = pos.token?.replace("/", "-").replace(":USDT", "") ?? "";
                  const pnlEntry = positionPnl?.positions?.find(p =>
                    p.symbol.replace("/", "-").replace(":USDT", "").replace("-USDT", "") === symKey.replace("-USDT", "")
                  ) ?? null;

                  const isLong = pos.direction === "BUY";
                  const currentPrice = pnlEntry?.currentPrice ?? 0;

                  return (
                    <motion.div
                      key={pos.token ?? idx}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className={cn(
                        "p-3 rounded-lg border",
                        isLong ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
                      )}
                    >
                      {/* Token + badge + collateral */}
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{pos.token?.replace("/USDT:USDT", "")}</span>
                          <Badge variant={isLong ? "success" : "destructive"} className="text-xs px-1.5 py-0 h-5">
                            {isLong ? "LONG" : "SHORT"}
                          </Badge>
                          {pos.adx && pos.adx > 0 && (
                            <span className="text-[10px] font-mono text-muted-foreground">ADX {pos.adx.toFixed(0)}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm font-bold">{formatMoney(pos.collateral)}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">×{STRATEGY.leverage} = {formatMoney((pos.collateral ?? 0) * STRATEGY.leverage)}</div>
                        </div>
                      </div>

                      {/* DCA Progress */}
                      {(() => {
                        const entries = pos.dca_entries ?? 1;
                        const maxEntries = STRATEGY.maxDca;
                        const DCA_INTERVAL_SEC = 3600;
                        const dcaReady = entries >= maxEntries;

                        let dcaStatus: "ready" | "waiting" | "maxed" = "ready";
                        let dcaRemainSec = 0;
                        if (dcaReady) {
                          dcaStatus = "maxed";
                        } else if (pos.last_dca_at) {
                          const elapsed = (now - new Date(pos.last_dca_at).getTime()) / 1000;
                          dcaRemainSec = Math.max(0, DCA_INTERVAL_SEC - elapsed);
                          dcaStatus = dcaRemainSec <= 0 ? "ready" : "waiting";
                        }

                        const fmtDca = (sec: number) => {
                          const h = Math.floor(sec / 3600);
                          const m = Math.floor((sec % 3600) / 60);
                          const s = Math.floor(sec % 60);
                          if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
                          return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
                        };

                        return (
                          <div className="mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Layers className="w-3 h-3 text-muted-foreground shrink-0" />
                              <div className="flex gap-0.5 flex-1">
                                {Array.from({ length: maxEntries }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "h-1.5 flex-1 rounded-sm transition-colors",
                                      i < entries
                                        ? isLong ? "bg-success" : "bg-danger"
                                        : "bg-border"
                                    )}
                                  />
                                ))}
                              </div>
                              <span className="text-xs font-mono font-bold shrink-0">{entries}/{maxEntries}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide">След. DCA</span>
                              <span className={cn(
                                "text-xs font-mono font-bold px-1.5 py-0.5 rounded",
                                dcaStatus === "ready" && "bg-warning/15 text-warning",
                                dcaStatus === "waiting" && "bg-muted/50 text-muted-foreground",
                                dcaStatus === "maxed" && "bg-muted/30 text-muted-foreground/60",
                              )}>
                                {dcaStatus === "ready" && "⚡ ГОТОВ"}
                                {dcaStatus === "waiting" && `⏳ ${fmtDca(dcaRemainSec)}`}
                                {dcaStatus === "maxed" && "✓ макс. записей"}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* LIVE P&L per position */}
                      {pnlEntry && (
                        <div className="flex items-center justify-between border-t border-border/40 pt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono uppercase">Live P&L</span>
                            {(() => {
                              const pnlUsd = pnlEntry.unrealizedProfit;
                              const collateral = pos.collateral ?? 1;
                              const pnlPct = (pnlUsd / collateral) * 100;
                              const isPos = pnlUsd >= 0;
                              return (
                                <>
                                  <span className={cn("text-sm font-bold font-mono", isPos ? "text-success" : "text-danger")}>
                                    {isPos ? "+" : ""}{pnlUsd.toFixed(4)} USDT
                                  </span>
                                  <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded", isPos ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>
                                    {isPos ? "+" : ""}{pnlPct.toFixed(2)}%
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                          {pnlEntry.currentPrice > 0 && (
                            <div className="text-xs text-muted-foreground font-mono">
                              ${pnlEntry.currentPrice.toFixed(4)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Price level bar: entry / current / TP / TSL */}
                      <PriceLevelBar pos={pos} currentPrice={currentPrice} />

                      {/* Close button for every position */}
                      {onClosePosition && (
                        <div className="mt-2 pt-2 border-t border-border/40">
                          {confirmClose !== pos.token ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-danger/40 text-danger hover:bg-danger/10 hover:border-danger font-mono text-xs h-7"
                              onClick={() => setConfirmClose(pos.token as string)}
                              disabled={isClosing}
                            >
                              <X className="w-3 h-3 mr-1.5" />
                              ЗАКРЫТЬ ПОЗИЦИЮ
                            </Button>
                          ) : (
                            <div className="flex gap-1.5">
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1 font-mono text-xs h-7"
                                onClick={() => { onClosePosition(pos.token as string); setConfirmClose(null); }}
                                disabled={isClosing}
                              >
                                {isClosing ? "ЗАКРЫВАЕМ..." : "ПОДТВЕРДИТЬ"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 font-mono text-xs h-7"
                                onClick={() => setConfirmClose(null)}
                                disabled={isClosing}
                              >
                                ОТМЕНА
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-12 flex items-center justify-center border border-dashed border-border rounded-md text-muted-foreground font-mono text-xs bg-background/30"
              >
                Waiting for signals...
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </CardContent>
    </Card>
  );
}
