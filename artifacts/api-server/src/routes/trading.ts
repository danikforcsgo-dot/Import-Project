import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tradingStateTable, scannerStatusTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const BINGX_BASE = "https://open-api.bingx.com";

function bingxSign(params: Record<string, string | number>, secret: string): string {
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return crypto.createHmac("sha256", secret).update(query).digest("hex");
}

async function bingxPost(path: string, params: Record<string, string | number>, apiKey: string, secret: string) {
  const withTs: Record<string, string | number> = { ...params, timestamp: Date.now() };
  withTs.signature = bingxSign(withTs, secret);
  const qs = new URLSearchParams(withTs as Record<string, string>).toString();
  const r = await fetch(`${BINGX_BASE}${path}?${qs}`, {
    method: "POST",
    headers: { "X-BX-APIKEY": apiKey },
    signal: AbortSignal.timeout(10000),
  });
  return r.json() as Promise<Record<string, unknown>>;
}

async function bingxDelete(path: string, params: Record<string, string | number>, apiKey: string, secret: string) {
  const withTs: Record<string, string | number> = { ...params, timestamp: Date.now() };
  withTs.signature = bingxSign(withTs, secret);
  const qs = new URLSearchParams(withTs as Record<string, string>).toString();
  const r = await fetch(`${BINGX_BASE}${path}?${qs}`, {
    method: "DELETE",
    headers: { "X-BX-APIKEY": apiKey },
    signal: AbortSignal.timeout(10000),
  });
  return r.json() as Promise<Record<string, unknown>>;
}

async function bingxGet(path: string, params: Record<string, string | number>, apiKey: string, secret: string) {
  const withTs: Record<string, string | number> = { ...params, timestamp: Date.now() };
  withTs.signature = bingxSign(withTs, secret);
  const qs = new URLSearchParams(withTs as Record<string, string>).toString();
  const r = await fetch(`${BINGX_BASE}${path}?${qs}`, {
    headers: { "X-BX-APIKEY": apiKey },
    signal: AbortSignal.timeout(10000),
  });
  return r.json() as Promise<Record<string, unknown>>;
}

const router: IRouter = Router();

// Файл, куда scanner.py пишет стейт.
// Пробуем несколько мест — путь зависит от окружения (dev vs prod).
const _cwd = process.cwd();
const LIVE_FILE_CANDIDATES = [
  path.resolve(_cwd, "../../live_trading.json"),           // dev: из dist/  → workspace root
  path.resolve(_cwd, "../../../live_trading.json"),         // prod: глубже
  path.resolve(_cwd, "live_trading.json"),                  // запуск из workspace root
  "/home/runner/workspace/live_trading.json",               // абсолютный путь Replit
];
const LIVE_FILE = LIVE_FILE_CANDIDATES[0];
const LIVE_FILE_LOCAL = LIVE_FILE_CANDIDATES[2];

function writeLiveFile(data: unknown): boolean {
  const json = JSON.stringify(data, null, 2);
  for (const candidate of LIVE_FILE_CANDIDATES) {
    try {
      fs.writeFileSync(candidate, json, "utf-8");
      return true;
    } catch {
      // пробуем следующий
    }
  }
  return false;
}

function loadFromFile(file: string): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(file, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function getTradingState(key: string, _fallbackFile?: string): Promise<Record<string, unknown>> {
  try {
    const rows = await db.select().from(tradingStateTable).where(eq(tradingStateTable.id, key));
    if (rows.length > 0) {
      return rows[0].data as Record<string, unknown>;
    }
  } catch {}

  // Пробуем scanner's файл (workspace root), затем локальный
  const fromFile = loadFromFile(LIVE_FILE) ?? loadFromFile(LIVE_FILE_LOCAL);
  if (fromFile) return fromFile;

  return {
    balance: 0,
    initial_balance: 0,
    enabled: false,
    open_position: null,
    trades: [],
    stats: { total: 0, wins: 0, losses: 0, total_pnl: 0 },
  };
}

async function saveTradingState(key: string, data: Record<string, unknown>) {
  await db
    .insert(tradingStateTable)
    .values({ id: key, data })
    .onConflictDoUpdate({
      target: tradingStateTable.id,
      set: { data, updatedAt: new Date() },
    });
}

router.get("/live-trading", async (req, res) => {
  try {
    // Отключаем браузерное кеширование — данные меняются часто (позиции, баланс)
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");

    // Читаем из БД первым — она всегда актуальна (scanner синхронизирует через POST /sync,
    // toggle пишет напрямую). Это корректно работает и в dev и в prod.
    // Файл используется только как fallback (первый запуск до первого sync).
    let state: Record<string, unknown> | null = null;
    try {
      const rows = await db.select().from(tradingStateTable).where(eq(tradingStateTable.id, "live"));
      if (rows.length > 0) {
        state = rows[0].data as Record<string, unknown>;
      }
    } catch {}

    if (!state) {
      // Fallback: файл (актуален в dev до первого DB-sync)
      state = loadFromFile(LIVE_FILE) ?? loadFromFile(LIVE_FILE_LOCAL);
    }

    res.json(state ?? {
      balance: 0,
      initial_balance: 0,
      enabled: false,
      open_position: null,
      trades: [],
      stats: { total: 0, wins: 0, losses: 0, total_pnl: 0 },
    });
  } catch (err) {
    req.log.error(err, "Failed to get live trading state");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/live-trading/sync", async (req, res) => {
  try {
    const incoming = req.body as Record<string, unknown>;

    // Сохраняем enabled из БД — управляется только через /toggle.
    // Сканер не должен перезаписывать этот флаг своим in-memory значением.
    const current = await getTradingState("live");
    incoming.enabled = current.enabled;

    await saveTradingState("live", incoming);

    // Обновляем файл — используем writeLiveFile с перебором путей.
    writeLiveFile(incoming);

    res.json(incoming);
  } catch (err) {
    req.log.error(err, "Failed to sync live trading state");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/live-trading/toggle", async (req, res) => {
  try {
    const { enabled } = req.body as { enabled: boolean };

    // 1. Обновляем trading state (enabled флаг)
    const state = await getTradingState("live");
    state.enabled = enabled;
    await saveTradingState("live", state);

    // 2. Записываем enabled в JSON-файл (scanner.py читает его как fallback).
    // writeLiveFile пробует несколько путей — не падает если один недоступен.
    const wrote = writeLiveFile(state);
    req.log.info(`Bot toggled: enabled=${enabled}, file_write=${wrote}`);

    // 4. Уведомление в Telegram
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (botToken && chatId) {
        const text = enabled
          ? "✅ *Торговля включена*\n\nБот активен — при сигнале открою позицию."
          : "🔒 *Торговля выключена*\n\nСканер продолжает работу и пришлёт сигналы, но позиции открывать не буду.";
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
        }).catch(() => {});
      }
    } catch {}

    res.json({ ...state, success: true });
  } catch (err) {
    req.log.error(err, "Failed to toggle live trading");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/scanner/sleep", async (req, res) => {
  try {
    const { enabled } = req.body as { enabled: boolean };

    // 1. Обновляем статус сканера (пауза + флаг спящего режима)
    let scanStatus: Record<string, unknown> = { isPaused: false, isSleepMode: false };
    try {
      const rows = await db.select().from(scannerStatusTable).where(eq(scannerStatusTable.id, 1));
      if (rows.length > 0) scanStatus = rows[0].data as Record<string, unknown>;
    } catch {}
    const newScanStatus = { ...scanStatus, isPaused: enabled, isSleepMode: enabled };
    await db
      .insert(scannerStatusTable)
      .values({ id: 1, data: newScanStatus })
      .onConflictDoUpdate({ target: scannerStatusTable.id, set: { data: newScanStatus, updatedAt: new Date() } });

    // 2. Обновляем live trading (включаем/выключаем бота)
    const state = await getTradingState("live");
    state.enabled = !enabled;
    await saveTradingState("live", state);
    try {
      const liveFile = path.resolve(process.cwd(), "../../live_trading.json");
      fs.writeFileSync(liveFile, JSON.stringify(state, null, 2), "utf-8");
    } catch {}

    // 3. Уведомление в Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      const text = enabled
        ? "🌙 *Спящий режим включён*\n\nСканер остановлен, торговля приостановлена. Открытые позиции продолжают отслеживаться."
        : "☀️ *Бот пробуждён*\n\nСканер запущен, торговля активна. Жду сигналов...";
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
      }).catch(() => {});
    }

    res.json({ success: true, sleepMode: enabled });
  } catch (err) {
    req.log.error(err, "Failed to toggle sleep mode");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/live-trading/pnl-analysis", async (req, res) => {
  const apiKey = process.env.BINGX_API_KEY;
  const secretKey = process.env.BINGX_SECRET_KEY;
  if (!apiKey || !secretKey) return res.json({ today: null, week: null, month: null });

  try {
    const now = Date.now();
    const todayStartMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").getTime();
    const weekStartMs  = now - 7  * 24 * 60 * 60 * 1000;
    const monthStartMs = now - 30 * 24 * 60 * 60 * 1000;

    const raw = await bingxGet(
      "/openApi/swap/v2/user/income",
      { startTime: monthStartMs, limit: 1000 },
      apiKey, secretKey
    ) as { data?: Array<{ income: string; time: number; incomeType: string }> };

    const items = raw?.data ?? [];
    let today = 0, week = 0, month = 0;
    // TRADING_FEE is the correct type name in BingX API (not COMMISSION)
    const INCLUDE_TYPES = new Set(["REALIZED_PNL", "FUNDING_FEE", "TRADING_FEE"]);

    for (const item of items) {
      if (!INCLUDE_TYPES.has(item.incomeType)) continue;
      const ts  = Number(item.time);
      const val = parseFloat(item.income) || 0;
      month += val;
      if (ts >= weekStartMs)  week  += val;
      if (ts >= todayStartMs) today += val;
    }

    // Fetch current balance for % calculation
    let currentBalance: number | null = null;
    try {
      const balRaw = await bingxGet("/openApi/swap/v2/user/balance", {}, apiKey, secretKey) as { data?: { balance?: { balance?: string; equity?: string } } };
      const eq = balRaw?.data?.balance?.equity;
      if (eq) currentBalance = parseFloat(eq);
    } catch { /* ignore */ }

    const pct = (val: number) => currentBalance && currentBalance > 0 ? (val / currentBalance) * 100 : null;

    res.json({
      today, week, month,
      todayPct:  pct(today),
      weekPct:   pct(week),
      monthPct:  pct(month),
      balance:   currentBalance,
    });
  } catch (err) {
    req.log.warn(err, "pnl-analysis failed");
    res.json({ today: null, week: null, month: null });
  }
});

router.get("/scanner/sleep", async (req, res) => {
  try {
    const rows = await db.select().from(scannerStatusTable).where(eq(scannerStatusTable.id, 1));
    const isSleepMode = rows.length > 0
      ? Boolean((rows[0].data as Record<string, unknown>).isSleepMode)
      : false;
    res.json({ isSleepMode });
  } catch {
    res.json({ isSleepMode: false });
  }
});

router.post("/live-trading/close-position", async (req, res) => {
  const apiKey = process.env.BINGX_API_KEY;
  const secretKey = process.env.BINGX_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return res.status(400).json({ error: "API keys not configured" });
  }

  try {
    const state = await getTradingState("live");
    const requestToken = req.body?.token as string | undefined;

    // Ищем нужную позицию: по токену (если передан) или первую
    const allPositions = (state.open_positions as Record<string, unknown>[] | null) ?? [];
    let pos: Record<string, unknown> | null = null;
    if (requestToken && allPositions.length > 0) {
      pos = allPositions.find(p => (p.token as string) === requestToken || (p.symbol as string) === requestToken) ?? null;
    }
    if (!pos) {
      pos = allPositions[0] ?? state.open_position as Record<string, unknown> | null;
    }

    if (!pos) {
      return res.status(400).json({ error: "No open position" });
    }

    const sym = pos.bingx_symbol as string || pos.symbol as string || (pos.token as string)?.replace('/USDT:USDT', '-USDT').replace('/USDC:USDC', '-USDC').replace('/', '-');
    const isLong = (pos.direction as string) === "BUY";
    const qty = pos.qty as number;

    // 1. Отменяем все открытые ордера (TP/SL)
    try {
      await bingxDelete("/openApi/swap/v2/trade/allOpenOrders", { symbol: sym }, apiKey, secretKey);
    } catch {}

    // 2. Закрываем позицию рыночным ордером
    let bingxAlreadyClosed = false;
    let bingxErrorMsg = "";
    try {
      const closeResp = await bingxPost("/openApi/swap/v2/trade/order", {
        symbol: sym,
        side: isLong ? "SELL" : "BUY",
        positionSide: isLong ? "LONG" : "SHORT",
        type: "MARKET",
        quantity: qty,
      }, apiKey, secretKey);

      const code = closeResp.code as number;
      if (code !== 0) {
        // Позиция уже закрыта на бирже — считаем это успехом и чистим дашборд
        bingxAlreadyClosed = true;
        bingxErrorMsg = String(closeResp.msg ?? code);
        req.log.warn({ sym, code, msg: bingxErrorMsg }, "BingX close error — assuming already closed, removing from state");
      }
    } catch (closeErr) {
      // Сетевая ошибка при закрытии — всё равно убираем из дашборда (лучше убрать, чем оставить зависшей)
      bingxAlreadyClosed = true;
      bingxErrorMsg = String(closeErr);
      req.log.warn({ sym, err: bingxErrorMsg }, "BingX close request failed — removing from state anyway");
    }

    // 3. Получаем новый баланс с биржи
    const balResp = await bingxGet("/openApi/swap/v2/user/balance", {}, apiKey, secretKey);
    const balData = (balResp.data as Record<string, unknown>)?.balance as Record<string, unknown> | undefined;
    const newBalance = balData ? parseFloat(String(balData.availableMargin ?? balData.balance ?? 0)) : null;

    // 4. Убираем закрытую позицию из open_positions (всегда — даже если BingX уже закрыл её)
    const closedToken = pos.token as string;
    const remainingPositions = allPositions.filter(p => (p.token as string) !== closedToken);
    const updatedState: Record<string, unknown> = {
      ...state,
      open_positions: remainingPositions,
      open_position: remainingPositions[0] ?? null,
    };
    if (newBalance && newBalance > 0) {
      updatedState.balance = newBalance;
    }
    await saveTradingState("live", updatedState);

    // Пишем во все кандидатные пути — scanner.py использует /home/runner/workspace/live_trading.json
    // writeLiveFile пробует все пути поочерёдно, не падает если один недоступен
    writeLiveFile(updatedState);

    res.json({ success: true, balance: newBalance, state: updatedState });
  } catch (err) {
    req.log.error(err, "Failed to close position");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /live-trading/reconcile
// Читает реальные позиции с BingX и убирает из БД те, которых больше нет на бирже.
router.post("/live-trading/reconcile", async (req, res) => {
  const apiKey = process.env.BINGX_API_KEY;
  const secretKey = process.env.BINGX_SECRET_KEY;
  if (!apiKey || !secretKey) {
    return res.status(400).json({ error: "API keys not configured" });
  }

  try {
    // 1. Реальные открытые позиции на BingX (только с ненулевым qty)
    const bxResp = await bingxGet("/openApi/swap/v2/user/positions", { symbol: "" }, apiKey, secretKey) as {
      data?: Array<{ symbol?: string; positionAmt?: string }>;
    };
    const bxPositions = (bxResp.data ?? []).filter(p => Math.abs(parseFloat(p.positionAmt ?? "0")) > 0);
    const bxSymbols = new Set(bxPositions.map(p => (p.symbol ?? "").toLowerCase()));

    req.log.info({ bxCount: bxPositions.length, symbols: [...bxSymbols] }, "BingX open positions for reconcile");

    // 2. Текущее состояние в БД
    const state = await getTradingState("live");
    const dbPositions = (state.open_positions as Record<string, unknown>[] | null) ?? [];

    // 3. Оставляем только позиции, которые реально открыты на BingX
    const kept = dbPositions.filter(pos => {
      const sym = ((pos.bingx_symbol as string) || (pos.symbol as string) || "").toLowerCase();
      // bingx_symbol = "CFX-USDT", bxSymbols содержат "CFX-USDT"
      return bxSymbols.has(sym);
    });

    const removed = dbPositions.length - kept.length;

    // 4. Обновляем состояние
    const updatedState: Record<string, unknown> = {
      ...state,
      open_positions: kept,
      open_position: kept[0] ?? null,
    };
    await saveTradingState("live", updatedState);
    writeLiveFile(updatedState);

    req.log.info({ before: dbPositions.length, after: kept.length, removed }, "Reconcile done");

    res.json({
      success: true,
      before: dbPositions.length,
      after: kept.length,
      removed,
      bxOpen: bxPositions.length,
    });
  } catch (err) {
    req.log.error(err, "Failed to reconcile positions");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
