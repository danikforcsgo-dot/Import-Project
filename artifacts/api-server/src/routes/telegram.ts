import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const IDS_FILE = path.resolve(process.cwd(), "../../tg_message_ids.json");

async function tgDelete(msgId: number): Promise<boolean> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, message_id: msgId }),
    });
    const d = await r.json() as { ok: boolean };
    return d.ok;
  } catch {
    return false;
  }
}

router.post("/telegram/clear-messages", async (_req, res) => {
  if (!BOT_TOKEN || !CHAT_ID) {
    res.status(500).json({ success: false, error: "Telegram not configured" });
    return;
  }

  // 1. Загружаем сохранённые ID
  let trackedIds: number[] = [];
  try {
    if (fs.existsSync(IDS_FILE)) {
      trackedIds = JSON.parse(fs.readFileSync(IDS_FILE, "utf-8"));
    }
  } catch { trackedIds = []; }

  // 2. Отправляем зонд — узнаём последний ID в чате
  let probeId: number | null = null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: "🗑" }),
    });
    const d = await r.json() as { ok: boolean; result?: { message_id: number } };
    if (d.ok && d.result) probeId = d.result.message_id;
  } catch { /* ignore */ }

  // 3. Формируем полный набор ID для удаления
  const toDelete = new Set<number>(trackedIds);

  if (probeId !== null) {
    toDelete.add(probeId);
    // Удаляем диапазон: последние 2000 сообщений
    for (let id = probeId; id >= Math.max(1, probeId - 2000); id--) {
      toDelete.add(id);
    }
  }

  // 4. Удаляем параллельно пачками по 25
  let deleted = 0;
  const ids = Array.from(toDelete);
  const BATCH = 25;

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(id => tgDelete(id)));
    deleted += results.filter(Boolean).length;
  }

  // 5. Очищаем файл
  try { fs.writeFileSync(IDS_FILE, JSON.stringify([])); } catch { /* ignore */ }

  res.json({ success: true, deleted, total_attempted: ids.length });
});

export default router;
