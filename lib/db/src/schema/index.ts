import { pgTable, text, serial, boolean, real, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const signalsTable = pgTable("signals", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  signalType: text("signal_type").notNull(),
  price: real("price").notNull(),
  sl: real("sl"),
  tp: real("tp"),
  emaFast: real("ema_fast"),
  emaSlow: real("ema_slow"),
  adx: real("adx"),
  atr: real("atr"),
  sentToTelegram: boolean("sent_to_telegram").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSignalSchema = createInsertSchema(signalsTable).omit({ id: true, createdAt: true });
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signalsTable.$inferSelect;

export const tradingStateTable = pgTable("trading_state", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scannerStatusTable = pgTable("scanner_status", {
  id: serial("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const liveTrading = pgTable("live_trading_state", {
  id: integer("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
