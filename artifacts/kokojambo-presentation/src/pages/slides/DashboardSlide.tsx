export default function DashboardSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080c14]">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d4aa]/30 to-transparent" />
      <div className="absolute bottom-0 right-0 w-[50vw] h-[50vh] bg-[#00d4aa]/3 blur-[12vw]" />

      <div className="relative flex h-full px-[7vw] py-[6vh]">
        <div className="flex flex-col w-full">
          <div className="mb-[4vh]">
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#00d4aa] tracking-[0.2em] uppercase mb-[1vh]">
              Dashboard
            </div>
            <h2 style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[3.8vw] font-bold text-white leading-tight">
              Панель управления
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-[2vw] flex-1">
            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2vw] flex flex-col">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[2vh]">Bot Panel</div>
              <div className="space-y-[1.5vh] flex-1">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#00d4aa]" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Управление ботом (ON/OFF)</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#00d4aa]" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Активные позиции в реальном времени</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#00d4aa]" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Синхронизация с BingX (Reconcile)</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#00d4aa]" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">PnL позиции, DCA статус</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#00d4aa]" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Топ сигналы с ранжированием ADX</span>
                </div>
              </div>
            </div>

            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2vw] flex flex-col">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[2vh]">Statistics Panel</div>
              <div className="space-y-[1.5vh] flex-1">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#3b82f6]" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Общий PnL (реализованный)</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#3b82f6]" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Win Rate и количество сделок</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#3b82f6]" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Торговые комиссии, фандинг</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#3b82f6]" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">График PnL по времени</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#3b82f6]" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">История последних сделок</span>
                </div>
              </div>
            </div>

            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2vw] flex flex-col">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[2vh]">API Endpoints</div>
              <div className="space-y-[1.2vh] flex-1">
                <div className="bg-[#080c14] rounded-lg p-[0.8vw]">
                  <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.85vw]">
                    <span className="text-[#00d4aa]">GET </span>
                    <span className="text-[#94a3b8]">/api/live-trading/status</span>
                  </div>
                </div>
                <div className="bg-[#080c14] rounded-lg p-[0.8vw]">
                  <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.85vw]">
                    <span className="text-[#f59e0b]">POST </span>
                    <span className="text-[#94a3b8]">/api/live-trading/toggle</span>
                  </div>
                </div>
                <div className="bg-[#080c14] rounded-lg p-[0.8vw]">
                  <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.85vw]">
                    <span className="text-[#f59e0b]">POST </span>
                    <span className="text-[#94a3b8]">/api/live-trading/reconcile</span>
                  </div>
                </div>
                <div className="bg-[#080c14] rounded-lg p-[0.8vw]">
                  <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.85vw]">
                    <span className="text-[#00d4aa]">GET </span>
                    <span className="text-[#94a3b8]">/api/income/stats</span>
                  </div>
                </div>
                <div className="bg-[#080c14] rounded-lg p-[0.8vw]">
                  <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.85vw]">
                    <span className="text-[#00d4aa]">GET </span>
                    <span className="text-[#94a3b8]">/api/signals/ranking</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-[2.5vh] grid grid-cols-2 gap-[2vw]">
            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.5vw] flex items-center gap-[1.5vw]">
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.2vw] font-semibold text-white mb-[0.5vh]">Auto-refresh</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">React Query polling каждые 30 секунд</div>
              </div>
            </div>
            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.5vw] flex items-center gap-[1.5vw]">
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.2vw] font-semibold text-white mb-[0.5vh]">Production</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">kokojambotrade1.replit.app · GCE VM</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
