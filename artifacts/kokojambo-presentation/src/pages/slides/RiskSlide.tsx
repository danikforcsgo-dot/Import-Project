export default function RiskSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080c14]">
      <div className="absolute top-0 left-[30vw] w-[50vw] h-[50vh] bg-[#a855f7]/4 blur-[10vw]" />

      <div className="relative flex flex-col h-full px-[7vw] py-[6vh]">
        <div className="mb-[4vh]">
          <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#00d4aa] tracking-[0.2em] uppercase mb-[1vh]">
            Risk Management
          </div>
          <h2 style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[3.8vw] font-bold text-white leading-tight">
            Управление рисками
          </h2>
        </div>

        <div className="flex gap-[2vw] flex-1">
          <div className="flex flex-col gap-[2vh] w-[55%]">
            <div className="flex gap-[2vw]">
              <div className="flex-1 border border-[#ff4f50]/30 bg-[#0f1623] rounded-2xl p-[2vw] text-center">
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[1vh]">Stop Loss</div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[5vw] font-bold text-[#ff4f50] leading-none mb-[1vh]">5.5×</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">ATR</div>
              </div>
              <div className="flex-1 border border-[#00d4aa]/30 bg-[#0f1623] rounded-2xl p-[2vw] text-center">
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[1vh]">Take Profit</div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[5vw] font-bold text-[#00d4aa] leading-none mb-[1vh]">7.0×</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">ATR</div>
              </div>
            </div>

            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2vw]">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[2vh]">Risk / Reward Ratio</div>
              <div className="flex items-center gap-[2vw]">
                <div>
                  <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[4vw] font-bold text-white">1 : 1.27</div>
                  <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#64748b] mt-[0.5vh]">TP/SL = 7.0 / 5.5</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-[0.8vw] mb-[1vh]">
                    <div className="h-[1.2vh] rounded-full bg-[#ff4f50]" style={{width: "43%"}} />
                    <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#ff4f50]">SL — 5.5 ATR</span>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="h-[1.2vh] rounded-full bg-[#00d4aa]" style={{width: "57%"}} />
                    <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#00d4aa]">TP — 7.0 ATR</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2vw]">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[2vh]">Размер позиции</div>
              <div className="flex items-baseline gap-[1.5vw]">
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[4vw] font-bold text-[#f59e0b]">10%</div>
                <div>
                  <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#94a3b8]">от баланса USDT</div>
                  <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">POSITION_SIZE_PCT = 0.10</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[2vh] flex-1">
            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2vw] flex-1">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[2vh]">Плечо и риск</div>
              <div className="text-center mb-[2vh]">
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[5.5vw] font-bold text-white">15×</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#64748b]">Cross Margin · BingX</div>
              </div>
              <div className="space-y-[1.2vh]">
                <div className="flex justify-between items-center py-[0.8vh] border-b border-[#1e2d45]">
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">SL при 15× плече</span>
                  <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] text-[#ff4f50] font-semibold">~6.7% цены</span>
                </div>
                <div className="flex justify-between items-center py-[0.8vh] border-b border-[#1e2d45]">
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">TP при 15× плече</span>
                  <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] text-[#00d4aa] font-semibold">~8.5% цены</span>
                </div>
                <div className="flex justify-between items-center py-[0.8vh] border-b border-[#1e2d45]">
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Max одновременных</span>
                  <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] text-white font-semibold">2 позиции</span>
                </div>
                <div className="flex justify-between items-center py-[0.8vh]">
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Max капитала в рынке</span>
                  <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] text-[#f59e0b] font-semibold">20% депозита</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
