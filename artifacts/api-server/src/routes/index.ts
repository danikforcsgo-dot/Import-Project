import { Router, type IRouter } from "express";
import healthRouter from "./health";
import signalsRouter from "./signals";
import scannerRouter from "./scanner";
import tradingRouter from "./trading";
import bingxBalanceRouter from "./bingx-balance";
import telegramRouter from "./telegram";

const router: IRouter = Router();

router.use(healthRouter);
router.use(signalsRouter);
router.use(scannerRouter);
router.use(tradingRouter);
router.use(bingxBalanceRouter);
router.use(telegramRouter);

export default router;
