export default function StrategySlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080c14]">
      <div className="absolute top-[10vh] right-0 w-[40vw] h-[60vh] bg-[#00d4aa]/4 blur-[10vw]" />

      <div className="relative flex h-full px-[7vw] py-[6vh] gap-[5vw]">
        <div className="flex flex-col justify-between w-[45vw]">
          <div>
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#00d4aa] tracking-[0.2em] uppercase mb-[1vh]">
              Trading Strategy
            </div>
            <h2 style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[3.8vw] font-bold text-white leading-tight mb-[3vh]">
              EMA + ADX + ATR<br />
              <span className="text-[#00d4aa]">на свечах 4H</span>
            </h2>
            <p style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.15vw] text-[#94a3b8] leading-relaxed">
              Система торгует в направлении тренда. Сигнал формируется при пересечении быстрой и медленной EMA при подтверждённом ADX и достаточной волатильности ATR.
            </p>
          </div>

          <div className="space-y-[1.5vh]">
            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.5vw] flex items-center gap-[1.5vw]">
              <div className="text-center w-[6vw]">
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[2.5vw] font-bold text-[#3b82f6]">EMA</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.85vw] text-[#475569]">20 / 80</div>
              </div>
              <div className="w-[0.1vw] h-[5vh] bg-[#1e2d45]" />
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.2vw] font-semibold text-white mb-[0.5vh]">Определение тренда</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#64748b]">LONG: EMA20 &gt; EMA80 · SHORT: EMA20 &lt; EMA80</div>
              </div>
            </div>

            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.5vw] flex items-center gap-[1.5vw]">
              <div className="text-center w-[6vw]">
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[2.5vw] font-bold text-[#f59e0b]">ADX</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.85vw] text-[#475569]">14 period</div>
              </div>
              <div className="w-[0.1vw] h-[5vh] bg-[#1e2d45]" />
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.2vw] font-semibold text-white mb-[0.5vh]">Сила тренда</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#64748b]">Сигнал ADX ≥ 15 · Вход ADX ≥ 25</div>
              </div>
            </div>

            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.5vw] flex items-center gap-[1.5vw]">
              <div className="text-center w-[6vw]">
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[2.5vw] font-bold text-[#a855f7]">ATR</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.85vw] text-[#475569]">14 period</div>
              </div>
              <div className="w-[0.1vw] h-[5vh] bg-[#1e2d45]" />
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.2vw] font-semibold text-white mb-[0.5vh]">Расчёт SL и TP</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#64748b]">SL = 5.5 × ATR · TP = 7.0 × ATR</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[2.5vh] flex-1">
          <div className="border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2vw] flex-1">
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[2vh]">LONG Signal Conditions</div>
            <div className="space-y-[1.5vh]">
              <div className="flex items-center gap-[1vw]">
                <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-[#00d4aa]/20 border border-[#00d4aa]/40 flex items-center justify-center">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#00d4aa]" />
                </div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#e2e8f0]">
                  <span className="text-[#00d4aa]">EMA20</span> пересекает <span className="text-[#00d4aa]">EMA80</span> снизу вверх
                </div>
              </div>
              <div className="flex items-center gap-[1vw]">
                <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-[#00d4aa]/20 border border-[#00d4aa]/40 flex items-center justify-center">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#00d4aa]" />
                </div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#e2e8f0]">
                  <span className="text-[#f59e0b]">ADX</span> ≥ 25 (сильный тренд подтверждён)
                </div>
              </div>
              <div className="flex items-center gap-[1vw]">
                <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-[#00d4aa]/20 border border-[#00d4aa]/40 flex items-center justify-center">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#00d4aa]" />
                </div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#e2e8f0]">
                  <span className="text-[#a855f7]">ATR</span> &gt; min_atr (достаточная волатильность)
                </div>
              </div>
              <div className="flex items-center gap-[1vw]">
                <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-[#00d4aa]/20 border border-[#00d4aa]/40 flex items-center justify-center">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#00d4aa]" />
                </div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#e2e8f0]">
                  Свободных позиций &lt; MAX_POSITIONS (2)
                </div>
              </div>
            </div>
          </div>

          <div className="border border-[#ff4f50]/20 bg-[#0f1623] rounded-2xl p-[2vw] flex-1">
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[2vh]">SHORT Signal Conditions</div>
            <div className="space-y-[1.5vh]">
              <div className="flex items-center gap-[1vw]">
                <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-[#ff4f50]/20 border border-[#ff4f50]/40 flex items-center justify-center">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#ff4f50]" />
                </div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#e2e8f0]">
                  <span className="text-[#ff4f50]">EMA20</span> пересекает <span className="text-[#ff4f50]">EMA80</span> сверху вниз
                </div>
              </div>
              <div className="flex items-center gap-[1vw]">
                <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-[#ff4f50]/20 border border-[#ff4f50]/40 flex items-center justify-center">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#ff4f50]" />
                </div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#e2e8f0]">
                  <span className="text-[#f59e0b]">ADX</span> ≥ 25 (нисходящий тренд подтверждён)
                </div>
              </div>
              <div className="flex items-center gap-[1vw]">
                <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-[#ff4f50]/20 border border-[#ff4f50]/40 flex items-center justify-center">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#ff4f50]" />
                </div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.05vw] text-[#e2e8f0]">
                  Те же требования к ATR и позициям
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
