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
  // Payment providers — optional, only needed when using that provider
  VNPAY_TMN_CODE: z.string().optional(),
  VNPAY_HASH_SECRET: z.string().optional(),
  VNPAY_RETURN_URL: z.string().optional(),
  VNPAY_IPN_URL: z.string().optional(),
  MOMO_PARTNER_CODE: z.string().optional(),
  MOMO_ACCESS_KEY: z.string().optional(),
  MOMO_SECRET_KEY: z.string().optional(),
  MOMO_PUBLIC_KEY: z.string().optional(),
  MOMO_RETURN_URL: z.string().optional(),
  MOMO_IPN_URL: z.string().optional(),
  // Shipping — GHN (required for shipping)
  GHN_TOKEN: z.string().optional(),
  GHN_SHOP_ID: z.string().optional(),
  GHN_FROM_DISTRICT_ID: z.string().optional(),
  GHN_FROM_WARD_CODE: z.string().optional(),
  GHN_ENDPOINT: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
