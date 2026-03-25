const base = import.meta.env.BASE_URL;

export default function TitleSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080c14]">
      <img
        src={`${base}hero.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        alt="Trading terminal"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#080c14]/80 via-[#080c14]/50 to-[#00d4aa]/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-transparent to-transparent" />

      <div className="absolute top-0 left-0 w-[40vw] h-[40vh] rounded-full bg-[#00d4aa]/5 blur-[8vw]" />
      <div className="absolute bottom-[10vh] right-[5vw] w-[30vw] h-[30vh] rounded-full bg-[#3b82f6]/8 blur-[6vw]" />

      <div className="relative flex flex-col justify-between h-full px-[7vw] py-[7vh]">
        <div className="flex items-center gap-[1.5vw]">
          <div className="w-[0.4vw] h-[3vh] bg-[#00d4aa] rounded-full" />
          <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.2vw] text-[#00d4aa] tracking-[0.25em] uppercase font-medium">
            Algorithmic Trading System
          </span>
        </div>

        <div>
          <div className="flex items-baseline gap-[2vw] mb-[2vh]">
            <h1 style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[8vw] font-bold tracking-tight leading-[0.9] text-white">
              Kokojambo
            </h1>
            <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[8vw] font-bold tracking-tight leading-[0.9] text-[#00d4aa]">
              Trade
            </span>
          </div>
          <div className="w-[12vw] h-[0.3vh] bg-gradient-to-r from-[#00d4aa] to-transparent mb-[3vh]" />
          <p style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.5vw] text-[#94a3b8] leading-relaxed max-w-[50vw]">
            Фьючерсная торговля BingX с плечом 15× <br />
            EMA 20/80 · ADX · ATR · DCA до 10 входов
          </p>
        </div>

        <div className="flex items-center gap-[4vw]">
          <div className="flex gap-[2vw]">
            <div className="px-[1.2vw] py-[0.8vh] border border-[#1e2d45] bg-[#0f1623]/80 rounded-lg">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[0.3vh]">Биржа</div>
              <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.3vw] text-white font-semibold">BingX</div>
            </div>
            <div className="px-[1.2vw] py-[0.8vh] border border-[#1e2d45] bg-[#0f1623]/80 rounded-lg">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[0.3vh]">Плечо</div>
              <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.3vw] text-[#00d4aa] font-semibold">15×</div>
            </div>
            <div className="px-[1.2vw] py-[0.8vh] border border-[#1e2d45] bg-[#0f1623]/80 rounded-lg">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[0.3vh]">Таймфрейм</div>
              <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.3vw] text-white font-semibold">4H</div>
            </div>
            <div className="px-[1.2vw] py-[0.8vh] border border-[#1e2d45] bg-[#0f1623]/80 rounded-lg">
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider mb-[0.3vh]">Max позиций</div>
              <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.3vw] text-white font-semibold">2</div>
            </div>
          </div>
          <div style={{fontFamily: "JetBrains Mono, monospace"}} className="ml-auto text-[1.1vw] text-[#475569]">
            v2.0 · March 2026
          </div>
        </div>
      </div>
    </div>
  );
}
