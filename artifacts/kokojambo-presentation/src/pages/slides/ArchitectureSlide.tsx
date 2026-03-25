export default function ArchitectureSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080c14]">
      <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-[#3b82f6]/4 blur-[10vw]" />
      <div className="absolute bottom-0 left-0 w-[35vw] h-[35vh] bg-[#00d4aa]/4 blur-[8vw]" />

      <div className="relative flex flex-col h-full px-[7vw] py-[6vh]">
        <div className="mb-[4vh]">
          <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#00d4aa] tracking-[0.2em] uppercase mb-[1vh]">
            System Architecture
          </div>
          <h2 style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[3.8vw] font-bold text-white leading-tight">
            Три компонента системы
          </h2>
        </div>

        <div className="flex gap-[2vw] flex-1 items-stretch">
          <div className="flex-1 border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2.5vw] flex flex-col">
            <div className="flex items-center gap-[1vw] mb-[2.5vh]">
              <div className="w-[3vw] h-[3vw] rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center">
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.5vw] text-[#3b82f6] font-bold">Py</div>
              </div>
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.6vw] font-bold text-white">Scanner</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">Python · scanner.py</div>
              </div>
            </div>
            <div className="space-y-[1.2vh] flex-1">
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.3vw] h-[0.3vw] rounded-full bg-[#3b82f6] mt-[1.1vh] shrink-0" />
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#94a3b8]">Сканирует 109 токенов каждые 4 часа</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.3vw] h-[0.3vw] rounded-full bg-[#3b82f6] mt-[1.1vh] shrink-0" />
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#94a3b8]">Рассчитывает EMA, ADX, ATR индикаторы</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.3vw] h-[0.3vw] rounded-full bg-[#3b82f6] mt-[1.1vh] shrink-0" />
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#94a3b8]">Открывает позиции, управляет DCA</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.3vw] h-[0.3vw] rounded-full bg-[#3b82f6] mt-[1.1vh] shrink-0" />
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#94a3b8]">Telegram уведомления о сигналах</span>
              </div>
            </div>
            <div className="mt-[2vh] pt-[1.5vh] border-t border-[#1e2d45]">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#475569]">ccxt · pandas · numpy · ta</div>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center gap-[1.5vh] px-[1vw]">
            <div className="w-[0.2vw] h-[6vh] bg-gradient-to-b from-[#3b82f6]/50 to-[#00d4aa]/50" />
            <div className="px-[1vw] py-[0.6vh] border border-[#1e2d45] bg-[#0f1623] rounded-full">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">REST API</div>
            </div>
            <div className="w-[0.2vw] h-[6vh] bg-gradient-to-b from-[#00d4aa]/50 to-[#3b82f6]/50" />
          </div>

          <div className="flex-1 border border-[#00d4aa]/20 bg-[#0f1623] rounded-2xl p-[2.5vw] flex flex-col">
            <div className="flex items-center gap-[1vw] mb-[2.5vh]">
              <div className="w-[3vw] h-[3vw] rounded-xl bg-[#00d4aa]/15 border border-[#00d4aa]/30 flex items-center justify-center">
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.5vw] text-[#00d4aa] font-bold">TS</div>
              </div>
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.6vw] font-bold text-white">API Server</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">Node.js · Express</div>
              </div>
            </div>
            <div className="space-y-[1.2vh] flex-1">
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.3vw] h-[0.3vw] rounded-full bg-[#00d4aa] mt-[1.1vh] shrink-0" />
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#94a3b8]">REST API для Dashboard и Scanner</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.3vw] h-[0.3vw] rounded-full bg-[#00d4aa] mt-[1.1vh] shrink-0" />
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#94a3b8]">PostgreSQL: состояние позиций</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.3vw] h-[0.3vw] rounded-full bg-[#00d4aa] mt-[1.1vh] shrink-0" />
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#94a3b8]">Reconcile с реальными позициями BingX</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.3vw] h-[0.3vw] rounded-full bg-[#00d4aa] mt-[1.1vh] shrink-0" />
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#94a3b8]">История PnL, балансы, статистика</span>
              </div>
            </div>
            <div className="mt-[2vh] pt-[1.5vh] border-t border-[#1e2d45]">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#475569]">Express · Drizzle ORM · PostgreSQL</div>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center gap-[1.5vh] px-[1vw]">
            <div className="w-[0.2vw] h-[6vh] bg-gradient-to-b from-[#00d4aa]/50 to-[#3b82f6]/50" />
            <div className="px-[1vw] py-[0.6vh] border border-[#1e2d45] bg-[#0f1623] rounded-full">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">HTTP</div>
            </div>
            <div className="w-[0.2vw] h-[6vh] bg-gradient-to-b from-[#3b82f6]/50 to-[#00d4aa]/50" />
          </div>

          <div className="flex-1 border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2.5vw] flex flex-col">
            <div className="flex items-center gap-[1vw] mb-[2.5vh]">
              <div className="w-[3vw] h-[3vw] rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/30 flex items-center justify-center">
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.5vw] text-[#f59e0b] font-bold">Rx</div>
              </div>
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.6vw] font-bold text-white">Dashboard</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">React · Vite · TypeScript</div>
              </div>
            </div>
            <div className="space-y-[1.2vh] flex-1">
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.3vw] h-[0.3vw] rounded-full bg-[#f59e0b] mt-[1.1vh] shrink-0" />
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#94a3b8]">Мониторинг активных позиций</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.3vw] h-[0.3vw] rounded-full bg-[#f59e0b] mt-[1.1vh] shrink-0" />
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#94a3b8]">Топ сигналы с ADX-ранжированием</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.3vw] h-[0.3vw] rounded-full bg-[#f59e0b] mt-[1.1vh] shrink-0" />
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#94a3b8]">PnL статистика и история</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <div className="w-[0.3vw] h-[0.3vw] rounded-full bg-[#f59e0b] mt-[1.1vh] shrink-0" />
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#94a3b8]">Ручная синхронизация (Reconcile)</span>
              </div>
            </div>
            <div className="mt-[2vh] pt-[1.5vh] border-t border-[#1e2d45]">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#475569]">React Query · Tailwind · Recharts</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
