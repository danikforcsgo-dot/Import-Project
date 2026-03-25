const base = import.meta.env.BASE_URL;

export default function ClosingSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080c14]">
      <img
        src={`${base}hero.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover opacity-15"
        alt="Trading terminal"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-[#080c14]/80 to-[#080c14]/60" />
      <div className="absolute top-0 left-0 w-[50vw] h-[50vh] bg-[#00d4aa]/5 blur-[12vw]" />

      <div className="relative flex flex-col h-full px-[7vw] py-[7vh] justify-between">
        <div className="flex items-center gap-[1.5vw]">
          <div className="w-[0.4vw] h-[3vh] bg-[#00d4aa] rounded-full" />
          <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.2vw] text-[#00d4aa] tracking-[0.25em] uppercase font-medium">
            Tech Stack
          </span>
        </div>

        <div>
          <div className="flex flex-wrap gap-[1.5vw] mb-[5vh]">
            <div className="flex items-center gap-[0.8vw] px-[1.5vw] py-[1vh] border border-[#1e2d45] bg-[#0f1623]/80 rounded-full">
              <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-[#3b82f6]" />
              <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">Python 3.11</span>
            </div>
            <div className="flex items-center gap-[0.8vw] px-[1.5vw] py-[1vh] border border-[#1e2d45] bg-[#0f1623]/80 rounded-full">
              <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-[#00d4aa]" />
              <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">Node.js / Express</span>
            </div>
            <div className="flex items-center gap-[0.8vw] px-[1.5vw] py-[1vh] border border-[#1e2d45] bg-[#0f1623]/80 rounded-full">
              <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-[#f59e0b]" />
              <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">React + Vite</span>
            </div>
            <div className="flex items-center gap-[0.8vw] px-[1.5vw] py-[1vh] border border-[#1e2d45] bg-[#0f1623]/80 rounded-full">
              <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-[#a855f7]" />
              <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">PostgreSQL</span>
            </div>
            <div className="flex items-center gap-[0.8vw] px-[1.5vw] py-[1vh] border border-[#1e2d45] bg-[#0f1623]/80 rounded-full">
              <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-[#ff4f50]" />
              <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">ccxt · pandas · numpy · ta</span>
            </div>
            <div className="flex items-center gap-[0.8vw] px-[1.5vw] py-[1vh] border border-[#1e2d45] bg-[#0f1623]/80 rounded-full">
              <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-[#2481cc]" />
              <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">Telegram Bot API</span>
            </div>
            <div className="flex items-center gap-[0.8vw] px-[1.5vw] py-[1vh] border border-[#1e2d45] bg-[#0f1623]/80 rounded-full">
              <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-[#00d4aa]" />
              <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">BingX API (HMAC SHA256)</span>
            </div>
            <div className="flex items-center gap-[0.8vw] px-[1.5vw] py-[1vh] border border-[#1e2d45] bg-[#0f1623]/80 rounded-full">
              <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-[#3b82f6]" />
              <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">Drizzle ORM · React Query</span>
            </div>
          </div>

          <div className="flex items-baseline gap-[2vw] mb-[2vh]">
            <h1 style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[6vw] font-bold tracking-tight leading-[0.9] text-white">
              Kokojambo
            </h1>
            <span style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[6vw] font-bold tracking-tight leading-[0.9] text-[#00d4aa]">
              Trade
            </span>
          </div>
          <div className="w-[10vw] h-[0.3vh] bg-gradient-to-r from-[#00d4aa] to-transparent mb-[2.5vh]" />
          <p style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1.4vw] text-[#64748b]">
            Алгоритмическая торговля. Без эмоций. На автопилоте.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-[4vw]">
            <div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#475569] mb-[0.5vh]">Production</div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">kokojambotrade1.replit.app</div>
            </div>
            <div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#475569] mb-[0.5vh]">Биржа</div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">BingX Futures USDT</div>
            </div>
            <div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#475569] mb-[0.5vh]">Версия</div>
              <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#94a3b8]">v2.0 · March 2026</div>
            </div>
          </div>
          <div className="text-right">
            <div className="w-[2vw] h-[2vw] rounded-full bg-[#00d4aa] ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
