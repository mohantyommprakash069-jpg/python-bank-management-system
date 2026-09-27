import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: serial().primaryKey(),
  accountNo: text("account_no").notNull().unique(),
  name: text().notNull(),
  age: integer().notNull(),
  email: text().notNull(),
  pin: integer().notNull(),
  balance: integer().notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
