import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { signalsTable, insertSignalSchema } from "@workspace/db/schema";
import { desc, gte, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/signals", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const signals = await db
      .select()
      .from(signalsTable)
      .orderBy(desc(signalsTable.createdAt))
      .limit(limit);
    res.json(signals);
  } catch (err) {
    req.log.error(err, "Failed to get signals");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/signals/stats", async (req, res) => {
  try {
    // Фильтр от полуночи по московскому времени (UTC+3)
    const nowMoscow = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const todayMoscow = nowMoscow.toISOString().slice(0, 10); // YYYY-MM-DD
    const midnightMoscow = new Date(todayMoscow + "T00:00:00+03:00");

    const [{ todayCount }] = await db
      .select({ todayCount: count() })
      .from(signalsTable)
      .where(gte(signalsTable.createdAt, midnightMoscow));

    const [lastSignal] = await db
      .select()
      .from(signalsTable)
      .orderBy(desc(signalsTable.createdAt))
      .limit(1);

    res.json({ todayCount, lastSignal: lastSignal || null });
  } catch (err) {
    req.log.error(err, "Failed to get signal stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/signals", async (req, res) => {
  try {
    const parsed = insertSignalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error });
      return;
    }
    const [signal] = await db.insert(signalsTable).values(parsed.data).returning();
    res.status(201).json(signal);
  } catch (err) {
    req.log.error(err, "Failed to create signal");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
