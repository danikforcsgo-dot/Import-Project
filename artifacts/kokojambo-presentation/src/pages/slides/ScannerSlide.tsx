export default function ScannerSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080c14]">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d4aa]/30 to-transparent" />
      <div className="absolute top-0 right-0 w-[40vw] h-[40vh] bg-[#3b82f6]/4 blur-[10vw]" />

      <div className="relative flex h-full px-[7vw] py-[6vh] gap-[4vw]">
        <div className="flex flex-col w-[40%]">
          <div className="mb-[4vh]">
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#00d4aa] tracking-[0.2em] uppercase mb-[1vh]">
              Scanner Engine
            </div>
            <h2 style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[3.8vw] font-bold text-white leading-tight">
              Сканер рынка
            </h2>
          </div>

          <div className="text-center border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2vw] mb-[2vh]">
            <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[8vw] font-bold text-[#00d4aa] leading-none">109</div>
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.1vw] text-[#64748b] mt-[1vh]">токенов сканируется</div>
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#475569]">фьючерсов BingX USDT</div>
          </div>

          <div className="space-y-[1.5vh]">
            <div className="flex items-center gap-[1vw] border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.2vw]">
              <div className="w-[0.4vw] h-[4vh] rounded-full bg-[#3b82f6] shrink-0" />
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-white">Таймфрейм 4H</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">последние 200 свечей</div>
              </div>
            </div>
            <div className="flex items-center gap-[1vw] border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.2vw]">
              <div className="w-[0.4vw] h-[4vh] rounded-full bg-[#a855f7] shrink-0" />
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-white">Параллельные запросы</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">asyncio + ccxt</div>
              </div>
            </div>
            <div className="flex items-center gap-[1vw] border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.2vw]">
              <div className="w-[0.4vw] h-[4vh] rounded-full bg-[#f59e0b] shrink-0" />
              <div>
                <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.1vw] font-semibold text-white">Ранжирование по ADX</div>
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b]">топ-сигналы в Telegram</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 gap-[2vh]">
          <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider">Цикл сканирования</div>

          <div className="flex-1 border border-[#1e2d45] bg-[#0f1623] rounded-2xl p-[2vw] overflow-hidden">
            <div className="space-y-[0.8vh]">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw]">
                <span className="text-[#475569]">01  </span>
                <span className="text-[#64748b]">async def </span>
                <span className="text-[#3b82f6]">run_scanner</span>
                <span className="text-[#94a3b8]">():</span>
              </div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw]">
                <span className="text-[#475569]">02  </span>
                <span className="text-[#94a3b8]">    symbols = </span>
                <span className="text-[#a855f7]">await </span>
                <span className="text-[#3b82f6]">get_bingx_symbols</span>
                <span className="text-[#94a3b8]">()</span>
              </div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw]">
                <span className="text-[#475569]">03  </span>
                <span className="text-[#94a3b8]">    </span>
                <span className="text-[#64748b]"># </span>
                <span className="text-[#475569]">109 токенов</span>
              </div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw]">
                <span className="text-[#475569]">04  </span>
                <span className="text-[#94a3b8]">    signals = </span>
                <span className="text-[#a855f7]">await </span>
                <span className="text-[#3b82f6]">scan_all</span>
                <span className="text-[#94a3b8]">(symbols, </span>
                <span className="text-[#00d4aa]">'4h'</span>
                <span className="text-[#94a3b8]">)</span>
              </div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw]">
                <span className="text-[#475569]">05  </span>
                <span className="text-[#94a3b8]">    </span>
                <span className="text-[#64748b]"># EMA cross + ADX + ATR</span>
              </div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw]">
                <span className="text-[#475569]">06  </span>
                <span className="text-[#94a3b8]">    ranked = </span>
                <span className="text-[#3b82f6]">sort_by_adx</span>
                <span className="text-[#94a3b8]">(signals)</span>
              </div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw]">
                <span className="text-[#475569]">07  </span>
                <span className="text-[#a855f7]">    await </span>
                <span className="text-[#3b82f6]">send_ranking</span>
                <span className="text-[#94a3b8]">(ranked[:</span>
                <span className="text-[#f59e0b]">10</span>
                <span className="text-[#94a3b8]">])</span>
              </div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw]">
                <span className="text-[#475569]">08  </span>
                <span className="text-[#94a3b8]">    </span>
                <span className="text-[#64748b]"># топ-10 в Telegram</span>
              </div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw]">
                <span className="text-[#475569]">09  </span>
                <span className="text-[#a855f7]">    await </span>
                <span className="text-[#3b82f6]">check_open_positions</span>
                <span className="text-[#94a3b8]">()</span>
              </div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw]">
                <span className="text-[#475569]">10  </span>
                <span className="text-[#a855f7]">    await </span>
                <span className="text-[#3b82f6]">check_dca</span>
                <span className="text-[#94a3b8]">()</span>
              </div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw]">
                <span className="text-[#475569]">11  </span>
                <span className="text-[#a855f7]">    await </span>
                <span className="text-[#3b82f6]">try_open_new</span>
                <span className="text-[#94a3b8]">(ranked, live=</span>
                <span className="text-[#00d4aa]">True</span>
                <span className="text-[#94a3b8]">)</span>
              </div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw]">
                <span className="text-[#475569]">12  </span>
                <span className="text-[#a855f7]">    await </span>
                <span className="text-[#3b82f6]">asyncio.sleep</span>
                <span className="text-[#94a3b8]">(</span>
                <span className="text-[#f59e0b]">14400</span>
                <span className="text-[#94a3b8]">)  </span>
                <span className="text-[#64748b]"># 4h</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-[1.5vw]">
            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.2vw] text-center">
              <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[2.5vw] font-bold text-[#00d4aa]">ADX≥25</div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.8vw] text-[#64748b]">min для входа</div>
            </div>
            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.2vw] text-center">
              <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[2.5vw] font-bold text-[#3b82f6]">ADX≥15</div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.8vw] text-[#64748b]">для сигнала</div>
            </div>
            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.2vw] text-center">
              <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[2.5vw] font-bold text-[#f59e0b]">4H</div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.8vw] text-[#64748b]">цикл сканера</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
