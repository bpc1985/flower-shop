import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_MEDUSA_BACKEND_URL: z.string().url(),
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: z.string().min(1),
});

// ponytail: parse at import time — fails fast on missing vars
// Note: NEXT_PUBLIC_* vars are available at build time but NOT in server components.
// This validates at build time; runtime uses the values directly.
const parsed = envSchema.safeParse({
  NEXT_PUBLIC_MEDUSA_BACKEND_URL:
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
});

if (!parsed.success) {
  throw new Error(
    `Missing required environment variables:\n${parsed.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n")}`
  );
}
