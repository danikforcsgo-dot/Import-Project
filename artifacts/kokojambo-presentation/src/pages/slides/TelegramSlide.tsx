export default function TelegramSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080c14]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#080c14] via-[#080c14] to-[#2481cc]/8" />

      <div className="relative flex h-full px-[7vw] py-[6vh] gap-[4vw]">
        <div className="flex flex-col w-[42%]">
          <div className="mb-[4vh]">
            <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[1vw] text-[#00d4aa] tracking-[0.2em] uppercase mb-[1vh]">
              Notifications
            </div>
            <h2 style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[3.8vw] font-bold text-white leading-tight">
              Telegram<br />
              <span className="text-[#2481cc]">Bot</span>
            </h2>
          </div>

          <div className="space-y-[2vh] flex-1">
            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.5vw]">
              <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.2vw] font-semibold text-white mb-[1vh]">Типы уведомлений</div>
              <div className="space-y-[1vh]">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#00d4aa] shrink-0" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Открытие позиции (LONG/SHORT)</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#ff4f50] shrink-0" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Закрытие по SL / TP</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#f59e0b] shrink-0" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">DCA усреднение позиции</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#3b82f6] shrink-0" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Топ-10 сигналов (каждые 4ч)</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#a855f7] shrink-0" />
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">Статус активных позиций</span>
                </div>
              </div>
            </div>

            <div className="border border-[#1e2d45] bg-[#0f1623] rounded-xl p-[1.5vw]">
              <div style={{fontFamily: "Space Grotesk, sans-serif"}} className="text-[1.2vw] font-semibold text-white mb-[1vh]">Технические детали</div>
              <div className="space-y-[0.8vh]">
                <div className="flex justify-between">
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#64748b]">Bot Token</span>
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">ENV: TELEGRAM_BOT_TOKEN</span>
                </div>
                <div className="flex justify-between">
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#64748b]">Chat ID</span>
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">ENV: TELEGRAM_CHAT_ID</span>
                </div>
                <div className="flex justify-between">
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#64748b]">Формат</span>
                  <span style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-[#94a3b8]">HTML parse mode</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 gap-[2vh]">
          <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.9vw] text-[#64748b] uppercase tracking-wider">Примеры сообщений</div>

          <div className="bg-[#17212b] rounded-2xl p-[2vw] border border-[#2481cc]/20 flex-1 flex flex-col gap-[2vh] overflow-hidden">
            <div className="flex items-start gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#00d4aa]/20 border border-[#00d4aa]/40 flex items-center justify-center shrink-0 mt-[0.3vh]">
                <span className="text-[#00d4aa] text-[1vw]">K</span>
              </div>
              <div className="bg-[#2b5278] rounded-xl p-[1.2vw] flex-1">
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-white leading-relaxed">
                  <span className="text-[#00d4aa] font-bold">ОТКРЫТА ПОЗИЦИЯ</span><br />
                  Пара: <span className="text-[#f59e0b]">CFX-USDT</span> · LONG<br />
                  Цена входа: <span className="text-white">0.1823</span><br />
                  Размер: <span className="text-white">847.3 CFX</span><br />
                  Залог: <span className="text-white">10.30 USDT</span><br />
                  SL: <span className="text-[#ff4f50]">0.1701</span> · TP: <span className="text-[#00d4aa]">0.1986</span><br />
                  ADX: <span className="text-[#f59e0b]">31.4</span> · ATR: <span className="text-[#a855f7]">0.00223</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#00d4aa]/20 border border-[#00d4aa]/40 flex items-center justify-center shrink-0 mt-[0.3vh]">
                <span className="text-[#00d4aa] text-[1vw]">K</span>
              </div>
              <div className="bg-[#2b5278] rounded-xl p-[1.2vw] flex-1">
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-white leading-relaxed">
                  <span className="text-[#f59e0b] font-bold">DCA #1</span> · CFX-USDT LONG<br />
                  Убыток: <span className="text-[#ff4f50]">-22.4% от залога</span><br />
                  Добавлено: <span className="text-white">10.10 USDT</span><br />
                  Новая цена входа: <span className="text-white">0.1764</span><br />
                  Следующий DCA при: <span className="text-[#f59e0b]">-40% залога</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#00d4aa]/20 border border-[#00d4aa]/40 flex items-center justify-center shrink-0 mt-[0.3vh]">
                <span className="text-[#00d4aa] text-[1vw]">K</span>
              </div>
              <div className="bg-[#2b5278] rounded-xl p-[1.2vw] flex-1">
                <div style={{fontFamily: "JetBrains Mono, monospace"}} className="text-[0.95vw] text-white leading-relaxed">
                  <span className="text-[#00d4aa] font-bold">ЗАКРЫТА ПО TP</span><br />
                  Пара: <span className="text-[#f59e0b]">CFX-USDT</span> LONG<br />
                  PnL: <span className="text-[#00d4aa]">+14.8 USDT (+143.7%)</span><br />
                  Продолжительность: <span className="text-white">18 ч 42 мин</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
