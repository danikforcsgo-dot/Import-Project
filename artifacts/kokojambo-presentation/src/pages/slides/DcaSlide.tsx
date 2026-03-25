export default function DcaSlide() {
  const entries = [
    { n: 1, label: "Первый вход", pct: "-20%", color: "#f59e0b", width: "15%" },
    { n: 2, label: "DCA #1", pct: "-40%", color: "#f97316", width: "25%" },
    { n: 3, label: "DCA #2", pct: "-60%", color: "#ef4444", width: "38%" },
    { n: 4, label: "DCA #3", pct: "-80%", color: "#dc2626", width: "52%" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080c14]">
      <div className="absolute bottom-0 right-0 w-[45vw] h-[50vh] bg-[#f59e0b]/4 blur-[10vw]" />

      <div className="relative flex h-full px-[7vw] py-[6vh] gap-[4vw]">
        <div className="flex flex-col w-[48%]">
          <div className="mb-[4vh]">
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#00d4aa] tracking-[0.2em] uppercase mb-[1vh]">
              DCA Strategy
            </div>
            <h2 style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[3.8vw] font-bold text-white leading-tight">
              Dollar Cost<br />
              <span className="text-[#f59e0b]">Averaging</span>
            </h2>
          </div>

          <div className="space-y-[2vh] flex-1">
            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.5vw] flex items-center gap-[1.5vw]">
              <div className="text-center w-[5vw]">
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[3vw] font-bold text-[#f59e0b]">10</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.8vw] text-[#475569]">входов</div>
              </div>
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.2vw] font-semibold text-white">MAX_DCA = 10</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#64748b]">До 10 усреднений на позицию</div>
              </div>
            </div>

            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.5vw] flex items-center gap-[1.5vw]">
              <div className="text-center w-[5vw]">
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[3vw] font-bold text-[#ff4f50]">20%</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.8vw] text-[#475569]">триггер</div>
              </div>
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.2vw] font-semibold text-white">DCA_LOSS_PCT = 0.20</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#64748b]">-20% от залога = DCA вход</div>
              </div>
            </div>

            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.5vw] flex items-center gap-[1.5vw]">
              <div className="text-center w-[5vw]">
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[3vw] font-bold text-[#3b82f6]">1h</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.8vw] text-[#475569]">интервал</div>
              </div>
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.2vw] font-semibold text-white">DCA_MIN_INTERVAL = 3600s</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#64748b]">Минимум 1 час между усреднениями</div>
              </div>
            </div>

            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.5vw]">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] mb-[1vh]">При 15× плече — -20% залога это:</div>
              <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.8vw] font-bold text-[#94a3b8]">~1.33% <span className="text-[#64748b] text-[1.1vw] font-normal">движения цены</span></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1">
          <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[2vh]">Схема усреднения</div>
          <div className="flex-1 border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2vw] flex flex-col justify-between">
            <div className="space-y-[2.5vh]">
              {entries.map((e) => (
                <div key={e.n} className="flex items-center gap-[1.5vw]">
                  <div className="w-[2.5vw] h-[2.5vw] rounded-full border-2 flex items-center justify-center shrink-0" style={{borderColor: e.color}}>
                    <span style={{fontFamily: "Space Grotesk, sans-serif", color: e.color}} className="text-[1vw] font-bold">{e.n}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-[0.5vh]">
                      <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">{e.label}</span>
                      <span style={{fontFamily: "JetBrains Mono, monospace", color: e.color}} className="text-[1vw] font-bold">{e.pct} залога</span>
                    </div>
                    <div className="w-full h-[0.5vh] bg-[#1e2d45] rounded-full">
                      <div className="h-full rounded-full" style={{width: e.width, backgroundColor: e.color}} />
                    </div>
                  </div>
                </div>
              ))}

              <div className="border-t border-[#1e2d45] pt-[2vh]">
                <div className="flex items-center gap-[1.5vw]">
                  <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#1e2d45] flex items-center justify-center shrink-0">
                    <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[0.9vw] text-[#475569]">...</span>
                  </div>
                  <div>
                    <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#475569]">До DCA #9 включительно (MAX_DCA = 10)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#1e2d45] pt-[2vh] mt-[2vh]">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] mb-[1vh]">Telegram уведомление при DCA:</div>
              <div className="bg-[#080c14] rounded-xl p-[1.2vw] border border-[#1e2d45]">
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#94a3b8]">
                  <span className="text-[#ff4f50]">DCA #2</span> · <span className="text-[#f59e0b]">CFX-USDT</span> LONG<br />
                  Loss: <span className="text-[#ff4f50]">-22.4% от залога</span><br />
                  Следующий DCA: ≥ 40% убытка
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
