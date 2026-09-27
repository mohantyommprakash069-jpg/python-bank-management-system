CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY,
	"account_no" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"age" integer NOT NULL,
	"email" text NOT NULL,
	"pin" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
