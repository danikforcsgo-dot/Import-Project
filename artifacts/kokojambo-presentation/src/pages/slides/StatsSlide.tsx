export default function StatsSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080c14]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#080c14] via-[#0a1020] to-[#080c14]" />
      <div className="absolute top-[20vh] left-[10vw] w-[30vw] h-[40vh] bg-[#00d4aa]/5 blur-[10vw]" />
      <div className="absolute bottom-[10vh] right-[10vw] w-[25vw] h-[30vh] bg-[#3b82f6]/5 blur-[8vw]" />

      <div className="relative flex flex-col h-full px-[7vw] py-[6vh]">
        <div className="mb-[5vh]">
          <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#00d4aa] tracking-[0.2em] uppercase mb-[1vh]">
            Key Metrics
          </div>
          <h2 style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[3.8vw] font-bold text-white leading-tight">
            Параметры системы
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-[2vw] mb-[3vh]">
          <div className="border border-[#00d4aa]/20 bg-gradient-to-b from-[#00d4aa]/5 to-transparent rounded-2xl p-[2vw] text-center">
            <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[7vw] font-bold text-[#00d4aa] leading-none mb-[1vh]">15×</div>
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">Cross Leverage</div>
          </div>
          <div className="border border-[#3b82f6]/20 bg-gradient-to-b from-[#3b82f6]/5 to-transparent rounded-2xl p-[2vw] text-center">
            <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[7vw] font-bold text-[#3b82f6] leading-none mb-[1vh]">109</div>
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">Токенов в скане</div>
          </div>
          <div className="border border-[#f59e0b]/20 bg-gradient-to-b from-[#f59e0b]/5 to-transparent rounded-2xl p-[2vw] text-center">
            <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[7vw] font-bold text-[#f59e0b] leading-none mb-[1vh]">10</div>
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">Макс. DCA входов</div>
          </div>
          <div className="border border-[#a855f7]/20 bg-gradient-to-b from-[#a855f7]/5 to-transparent rounded-2xl p-[2vw] text-center">
            <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[7vw] font-bold text-[#a855f7] leading-none mb-[1vh]">4H</div>
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">Таймфрейм</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-[2vw]">
          <div className="border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2vw]">
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.85vw] text-[#64748b] uppercase tracking-wider mb-[1.5vh]">Индикаторы</div>
            <div className="space-y-[1vh]">
              <div className="flex justify-between items-center">
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">EMA Fast</span>
                <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-[#3b82f6]">20</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">EMA Slow</span>
                <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-[#3b82f6]">80</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">ADX Period</span>
                <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-[#f59e0b]">14</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">ATR Period</span>
                <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-[#a855f7]">14</span>
              </div>
            </div>
          </div>

          <div className="border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2vw]">
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.85vw] text-[#64748b] uppercase tracking-wider mb-[1.5vh]">Risk Params</div>
            <div className="space-y-[1vh]">
              <div className="flex justify-between items-center">
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">SL_ATR</span>
                <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-[#ff4f50]">5.5×</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">TP_ATR</span>
                <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-[#00d4aa]">7.0×</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Position size</span>
                <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-[#f59e0b]">10%</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Max positions</span>
                <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-white">2</span>
              </div>
            </div>
          </div>

          <div className="border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2vw]">
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.85vw] text-[#64748b] uppercase tracking-wider mb-[1.5vh]">DCA Params</div>
            <div className="space-y-[1vh]">
              <div className="flex justify-between items-center">
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Trigger loss</span>
                <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-[#ff4f50]">20%</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Min interval</span>
                <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-[#3b82f6]">1h</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Max DCA</span>
                <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-[#f59e0b]">10</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Price move @15×</span>
                <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-[#64748b]">1.33%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
