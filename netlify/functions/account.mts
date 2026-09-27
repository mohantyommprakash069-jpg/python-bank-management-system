import type { Config, Context } from "@netlify/functions";
import { db } from "../../db/index.js";
import { accounts } from "../../db/schema.js";
import { eq } from "drizzle-orm";

function publicView(row: typeof accounts.$inferSelect) {
  return {
    name: row.name,
    age: row.age,
    email: row.email,
    accountNo: row.accountNo,
    balance: row.balance,
  };
}

async function findAccount(accountNo: string, pin: number) {
  const rows = await db.select().from(accounts).where(eq(accounts.accountNo, accountNo));
  const row = rows[0];
  if (!row || row.pin !== pin) return null;
  return row;
}

export default async (req: Request, context: Context) => {
  const accountNo = context.params.accountNo;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pin = Number(body.pin);
  if (!Number.isInteger(pin)) {
    return Response.json({ error: "PIN is required" }, { status: 400 });
  }

  const account = await findAccount(accountNo, pin);
  if (!account) {
    return Response.json({ error: "No matching account found" }, { status: 404 });
  }

  if (req.method === "POST") {
    const action = body.action;

    if (action === "view") {
      return Response.json(publicView(account));
    }

    if (action === "deposit") {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
        return Response.json(
          { error: "You can deposit an amount below 10000 and above 0" },
          { status: 400 },
        );
      }

      const [updated] = await db
        .update(accounts)
        .set({ balance: account.balance + amount })
        .where(eq(accounts.accountNo, accountNo))
        .returning();

      return Response.json(publicView(updated));
    }

    if (action === "withdraw") {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return Response.json({ error: "Please enter a valid amount" }, { status: 400 });
      }
      if (account.balance < amount) {
        return Response.json({ error: "You don't have that much money" }, { status: 400 });
      }

      const [updated] = await db
        .update(accounts)
        .set({ balance: account.balance - amount })
        .where(eq(accounts.accountNo, accountNo))
        .returning();

      return Response.json(publicView(updated));
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  if (req.method === "PATCH") {
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : account.name;
    const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : account.email;
    let pinValue = account.pin;

    if (body.newPin !== undefined && body.newPin !== "") {
      const newPin = Number(body.newPin);
      if (!Number.isInteger(newPin) || String(newPin).length !== 4) {
        return Response.json({ error: "PIN must contain exactly 4 digits" }, { status: 400 });
      }
      pinValue = newPin;
    }

    const [updated] = await db
      .update(accounts)
      .set({ name, email, pin: pinValue })
      .where(eq(accounts.accountNo, accountNo))
      .returning();

    return Response.json(publicView(updated));
  }

  if (req.method === "DELETE") {
    await db.delete(accounts).where(eq(accounts.accountNo, accountNo));
    return Response.json({ deleted: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/account/:accountNo",
  method: ["POST", "PATCH", "DELETE"],
};
