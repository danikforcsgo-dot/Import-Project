import { Router, type IRouter } from "express";
import crypto from "crypto";

const router: IRouter = Router();

const BINGX_BASE = "https://open-api.bingx.com";
const CACHE_TTL_MS = 20_000; // 20 seconds

let cachedBalance: number | null = null;
let cacheTime = 0;

function bingxSign(params: Record<string, string | number>, secret: string): string {
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return crypto.createHmac("sha256", secret).update(query).digest("hex");
}

router.get("/live-trading/balance", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");

  const apiKey = process.env.BINGX_API_KEY;
  const secretKey = process.env.BINGX_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return res.status(200).json({ balance: null, error: "API keys not configured" });
  }

  // Возвращаем in-memory кеш если свежий
  const now = Date.now();
  if (cachedBalance !== null && (now - cacheTime) < CACHE_TTL_MS) {
    return res.json({ balance: cachedBalance, cached: true });
  }

  try {
    const params: Record<string, string | number> = {
      timestamp: now,
    };
    params.signature = bingxSign(params, secretKey);

    const qs = new URLSearchParams(params as Record<string, string>).toString();
    const response = await fetch(`${BINGX_BASE}/openApi/swap/v2/user/balance?${qs}`, {
      headers: { "X-BX-APIKEY": apiKey },
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json() as Record<string, unknown>;

    // Ошибка rate-limit — вернуть кеш или null
    if ((data.code as number) === 100410) {
      req.log.warn("BingX rate limited — returning cached balance");
      return res.json({ balance: cachedBalance, rateLimited: true });
    }

    const balData = (data.data as Record<string, unknown>)?.balance as Record<string, unknown> | undefined;

    let balance: number | null = null;
    if (balData && typeof balData === "object") {
      // Показываем equity (баланс включая открытые позиции), затем balance, затем availableMargin
      const val = balData.equity ?? balData.balance ?? balData.availableMargin;
      balance = val !== undefined ? parseFloat(String(val)) : null;
      req.log.info({ equity: balData.equity, balance: balData.balance, availableMargin: balData.availableMargin, result: balance }, "BingX balance raw fields");
    } else {
      req.log.warn({ dataKeys: Object.keys((data.data as Record<string,unknown>) ?? {}), code: data.code }, "BingX balance: unexpected response structure");
    }

    if (balance !== null) {
      cachedBalance = balance;
      cacheTime = now;
    }

    res.json({ balance, raw: data.data });
  } catch (err) {
    req.log.error(err, "Failed to fetch BingX balance");
    // При ошибке вернуть закешированное значение
    res.status(200).json({ balance: cachedBalance, error: "Failed to fetch balance" });
  }
});

// Кеш P&L позиции (обновляем чаще — 15 сек)
const PNL_CACHE_TTL_MS = 15_000;
let cachedPnl: { unrealizedProfit: number; currentPrice: number; symbol: string } | null = null;
let pnlCacheTime = 0;

router.get("/live-trading/position-pnl", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");

  const apiKey = process.env.BINGX_API_KEY;
  const secretKey = process.env.BINGX_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return res.status(200).json({ pnl: null, error: "API keys not configured" });
  }

  const now = Date.now();
  if (cachedPnl !== null && (now - pnlCacheTime) < PNL_CACHE_TTL_MS) {
    return res.json({ ...cachedPnl, cached: true });
  }

  try {
    const params: Record<string, string | number> = { timestamp: now };
    params.signature = bingxSign(params, secretKey);
    const qs = new URLSearchParams(params as Record<string, string>).toString();

    const response = await fetch(`${BINGX_BASE}/openApi/swap/v2/user/positions?${qs}`, {
      headers: { "X-BX-APIKEY": apiKey },
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json() as Record<string, unknown>;

    if ((data.code as number) === 100410) {
      return res.json({ ...(cachedPnl ?? {}), rateLimited: true });
    }

    // BingX возвращает data.data как массив позиций напрямую ИЛИ как объект с .positions
    const rawData = data.data as Record<string, unknown>[] | Record<string, unknown> | undefined;
    let positions: Record<string, unknown>[] = [];
    if (Array.isArray(rawData)) {
      positions = rawData;
    } else if (rawData && typeof rawData === "object" && Array.isArray((rawData as Record<string, unknown>).positions)) {
      positions = (rawData as Record<string, unknown>).positions as Record<string, unknown>[];
    }

    if (positions.length === 0) {
      cachedPnl = null;
      return res.json({ pnl: null, noPosition: true });
    }

    // Return ALL open positions indexed by symbol
    const positionsData = positions.map(pos => ({
      symbol: String(pos.symbol ?? ""),
      unrealizedProfit: parseFloat(String(pos.unrealizedProfit ?? 0)),
      currentPrice: parseFloat(String(pos.markPrice ?? pos.currentPrice ?? 0)),
    }));

    // Also keep legacy single-position fields for backward compat (first position)
    const first = positionsData[0];
    cachedPnl = { unrealizedProfit: first.unrealizedProfit, currentPrice: first.currentPrice, symbol: first.symbol, positions: positionsData };
    pnlCacheTime = now;

    res.json({ unrealizedProfit: first.unrealizedProfit, currentPrice: first.currentPrice, symbol: first.symbol, positions: positionsData });
  } catch (err) {
    req.log.error(err, "Failed to fetch BingX positions P&L");
    res.status(200).json({ ...(cachedPnl ?? {}), error: "Failed to fetch P&L" });
  }
});

export default router;
