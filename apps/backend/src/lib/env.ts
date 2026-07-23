import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  STORE_CORS: z.string(),
  ADMIN_CORS: z.string(),
  AUTH_CORS: z.string(),
  JWT_SECRET: z.string().min(1),
  COOKIE_SECRET: z.string().min(1),
  S3_FILE_URL: z.string().url(),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  // Auth providers — optional, only needed when using that provider
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  ESMS_API_KEY: z.string().optional(),
  ESMS_SECRET_KEY: z.string().optional(),
  SPEEDSMS_API_KEY: z.string().optional(),
  SPEEDSMS_SENDER_ID: z.string().optional(),
});

export const env = envSchema.parse(process.env);
