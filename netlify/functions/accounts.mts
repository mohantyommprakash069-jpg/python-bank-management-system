import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { accounts } from "../../db/schema.js";
import { eq } from "drizzle-orm";

function generateAccountNo(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*";

  const chars = [
    ...Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]),
    ...Array.from({ length: 3 }, () => digits[Math.floor(Math.random() * digits.length)]),
    special[Math.floor(Math.random() * special.length)],
  ];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const age = Number(body.age);
  const pin = Number(body.pin);

  if (!name || !email) {
    return Response.json({ error: "Name and email are required" }, { status: 400 });
  }

  if (!Number.isInteger(age) || age < 18) {
    return Response.json({ error: "You must be at least 18 years old to open an account" }, { status: 400 });
  }

  if (!Number.isInteger(pin) || String(pin).length !== 4) {
    return Response.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
  }

  let accountNo = generateAccountNo();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db.select().from(accounts).where(eq(accounts.accountNo, accountNo));
    if (existing.length === 0) break;
    accountNo = generateAccountNo();
  }

  const [created] = await db
    .insert(accounts)
    .values({ name, age, email, pin, accountNo, balance: 0 })
    .returning();

  return Response.json(
    {
      name: created.name,
      age: created.age,
      email: created.email,
      accountNo: created.accountNo,
      balance: created.balance,
    },
    { status: 201 },
  );
};

export const config: Config = {
  path: "/api/accounts",
};
