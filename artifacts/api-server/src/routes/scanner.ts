import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { scannerStatusTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

let statusCache: Record<string, unknown> = {
  isScanning: false,
  isPaused: false,
  currentSymbol: "",
  tokenIndex: 0,
  totalTokens: 109,
  signalsFoundThisScan: 0,
  lastScanTime: null,
  lastScanDuration: null,
  scanStartTime: null,
};

router.get("/scanner/status", async (req, res) => {
  try {
    const rows = await db.select().from(scannerStatusTable).where(eq(scannerStatusTable.id, 1));
    if (rows.length > 0) {
      res.json(rows[0].data);
    } else {
      res.json(statusCache);
    }
  } catch {
    res.json(statusCache);
  }
});

router.post("/scanner/status", async (req, res) => {
  try {
    const merged = { ...statusCache, ...req.body };
    statusCache = merged;

    await db
      .insert(scannerStatusTable)
      .values({ id: 1, data: merged })
      .onConflictDoUpdate({
        target: scannerStatusTable.id,
        set: { data: merged, updatedAt: new Date() },
      });

    res.json(merged);
  } catch (err) {
    req.log.error(err, "Failed to update scanner status");
    statusCache = { ...statusCache, ...req.body };
    res.json(statusCache);
  }
});

export default router;
