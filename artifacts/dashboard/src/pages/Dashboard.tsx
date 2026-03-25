import { Terminal, Trash2, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { ScannerStatus } from "@/components/ScannerStatus";
import { BotPanel } from "@/components/BotPanel";
import { StatisticsPanel } from "@/components/StatisticsPanel";
import { MarketsPanel } from "@/components/MarketsPanel";
import { Button } from "@/components/ui/button";
import { useLiveState, useLiveControls, useBingxBalance, useClearTelegramMessages, usePositionPnl, useSleepMode, useReconcilePositions } from "@/hooks/use-kokojambo";
import { useState } from "react";

export default function Dashboard() {
  const live = useLiveState();
  const { toggleLive, closePositionMutation } = useLiveControls();
  const { data: bingxBalance } = useBingxBalance();
  const rawData = live.data as Record<string, unknown> | undefined;
  const hasOpenPos = !!(rawData?.open_positions && (rawData.open_positions as unknown[]).length > 0) || !!(live.data?.open_position);
  const { data: positionPnl } = usePositionPnl(hasOpenPos);
  const clearTg = useClearTelegramMessages();
  const { isSleepMode, toggle: sleepToggle } = useSleepMode();
  const reconcile = useReconcilePositions();
  const [tgConfirm, setTgConfirm] = useState(false);
  const [tgResult, setTgResult] = useState<string | null>(null);

  const handleClearTg = () => {
    if (!tgConfirm) { setTgConfirm(true); return; }
    clearTg.mutate(undefined, {
      onSuccess: (d) => {
        setTgResult(`Удалено: ${d.deleted} сообщений`);
        setTgConfirm(false);
        setTimeout(() => setTgResult(null), 4000);
      },
      onError: () => { setTgConfirm(false); },
    });
  };

  const fade = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, type: "spring", stiffness: 280, damping: 22 } }),
  };

  return (
    <div className="min-h-screen pb-4 relative">
      <main className="max-w-[1280px] mx-auto px-3 sm:px-5 pt-3 relative z-10">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-3 border-b border-border/40 pb-3"
        >
          <div className="p-1.5 bg-primary/10 rounded border border-primary/30">
            <Terminal className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent leading-none">
              KOKOJAMBOTRADE
            </h1>
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase mt-0.5">
              Pro Algorithmic Trading Terminal
            </p>
          </div>

          {/* HEADER BUTTONS */}
          <div className="flex items-center gap-2">
            {tgResult && (
              <span className="text-xs text-success font-mono">{tgResult}</span>
            )}

            {/* SLEEP MODE BUTTON */}
            <Button
              size="sm"
              variant="outline"
              className={`gap-2 text-xs h-8 px-3 transition-all ${
                sleepToggle.isPending
                  ? "opacity-60"
                  : isSleepMode
                  ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-400"
                  : "border-green-500/60 bg-green-500/10 text-green-400 hover:bg-red-500/10 hover:border-red-500/60 hover:text-red-400"
              }`}
              onClick={() => sleepToggle.mutate(!isSleepMode)}
              disabled={sleepToggle.isPending}
              title={isSleepMode ? "Нажми чтобы пробудить бота" : "Нажми чтобы поставить бота на паузу"}
            >
              {sleepToggle.isPending ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  <span>...</span>
                </>
              ) : isSleepMode ? (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Спящий режим</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span>Сервисы активны</span>
                </>
              )}
            </Button>

            {/* TELEGRAM CLEAR BUTTON */}
            <Button
              size="sm"
              variant={tgConfirm ? "destructive" : "outline"}
              className="gap-1.5 text-xs h-8 px-3"
              onClick={handleClearTg}
              disabled={clearTg.isPending}
              onBlur={() => setTimeout(() => setTgConfirm(false), 200)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearTg.isPending ? "Удаление..." : tgConfirm ? "Подтвердить?" : "Очистить TG"}
            </Button>
          </div>
        </motion.div>

        {/* SCANNER — full width */}
        <motion.div custom={0} variants={fade} initial="hidden" animate="visible" className="mb-3">
          <ScannerStatus />
        </motion.div>

        {/* STATISTICS — full width */}
        <motion.div custom={1} variants={fade} initial="hidden" animate="visible" className="mb-3">
          <StatisticsPanel />
        </motion.div>

        {/* SECOND ROW: Markets (left) + Live Trading (right) — same level */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">

          {/* LEFT — Markets */}
          <motion.div custom={2} variants={fade} initial="hidden" animate="visible" className="flex flex-col">
            <MarketsPanel />
          </motion.div>

          {/* RIGHT — Live Trading */}
          <motion.div custom={3} variants={fade} initial="hidden" animate="visible" className="lg:col-span-2 flex flex-col">
            <BotPanel
              title="LIVE TRADING"
              data={live.data || {}}
              exchangeBalance={bingxBalance?.balance ?? null}
              positionPnl={positionPnl ?? null}
              onToggle={(enabled) => toggleLive.mutate({ data: { enabled } })}
              isToggling={toggleLive.isPending}
              onClosePosition={(token) => closePositionMutation.mutate(token)}
              isClosing={closePositionMutation.isPending}
              onReconcile={() => reconcile.mutate()}
              isReconciling={reconcile.isPending}
            />
          </motion.div>

        </div>
      </main>
    </div>
  );
}
