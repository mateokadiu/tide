-- Better-Auth's Drizzle adapter requires updated_at on the verifications table.
ALTER TABLE "verifications" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
