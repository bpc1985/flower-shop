const { defineConfig, loadEnv } = require("@medusajs/utils");

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const { env } = require("./src/lib/env");
const { logger } = require("./src/lib/logger");

// Fails fast if required env vars are missing
env;

logger.info("Medusa backend starting", { env: process.env.NODE_ENV });

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          ...(process.env.GOOGLE_CLIENT_ID
            ? [
                {
                  resolve: "@medusajs/medusa/auth-google",
                  id: "google",
                  options: {
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
                    callbackUrl: `${process.env.BACKEND_URL || "http://localhost:9000"}/auth/customer/google/callback`,
                  },
                },
              ]
            : []),
          {
            resolve: "./src/modules/phone-otp",
            id: "phone-otp",
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          ...(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET
            ? [
                {
                  resolve: "./src/modules/vnpay",
                  id: "vnpay",
                  options: {
                    tmnCode: process.env.VNPAY_TMN_CODE,
                    hashSecret: process.env.VNPAY_HASH_SECRET,
                    vnpUrl: process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                    vnpApiUrl: process.env.VNPAY_API_URL || "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
                    returnUrl: process.env.VNPAY_RETURN_URL || "http://localhost:8000/checkout/result/vnpay",
                    ipnUrl: process.env.VNPAY_IPN_URL || "http://localhost:9000/api/hooks/vnpay",
                  },
                },
              ]
            : []),
          ...(process.env.ZALOPAY_APP_ID && process.env.ZALOPAY_KEY1 && process.env.ZALOPAY_KEY2
            ? [
                {
                  resolve: "./src/modules/zalopay",
                  id: "zalopay",
                  options: {
                    appId: process.env.ZALOPAY_APP_ID,
                    key1: process.env.ZALOPAY_KEY1,
                    key2: process.env.ZALOPAY_KEY2,
                    endpoint: process.env.ZALOPAY_ENDPOINT || "https://sandbox.zalopay.vn/v001/tpe",
                    callbackUrl: process.env.ZALOPAY_CALLBACK_URL || "http://localhost:9000/api/hooks/zalopay",
                  },
                },
              ]
            : []),
          ...(process.env.MOMO_PARTNER_CODE && process.env.MOMO_ACCESS_KEY && process.env.MOMO_SECRET_KEY
            ? [
                {
                  resolve: "./src/modules/momo",
                  id: "momo",
                  options: {
                    partnerCode: process.env.MOMO_PARTNER_CODE,
                    accessKey: process.env.MOMO_ACCESS_KEY,
                    secretKey: process.env.MOMO_SECRET_KEY,
                    publicKey: process.env.MOMO_PUBLIC_KEY || "",
                    endpoint: process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn",
                    returnUrl: process.env.MOMO_RETURN_URL || "http://localhost:8000/checkout/result/momo",
                    ipnUrl: process.env.MOMO_IPN_URL || "http://localhost:9000/api/hooks/momo",
                  },
                },
              ]
            : []),
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          ...(process.env.GHN_TOKEN && process.env.GHN_SHOP_ID
            ? [
                {
                  resolve: "./src/modules/ghn",
                  id: "ghn",
                  options: {
                    token: process.env.GHN_TOKEN,
                    shopId: parseInt(process.env.GHN_SHOP_ID || "0") || 0,
                    fromDistrictId: parseInt(process.env.GHN_FROM_DISTRICT_ID || "0") || 0,
                    fromWardCode: process.env.GHN_FROM_WARD_CODE || "",
                    endpoint: process.env.GHN_ENDPOINT || "https://dev-online-gateway.ghn.vn/shiip/public-api",
                  },
                },
              ]
            : []),
          ...(process.env.GHTK_TOKEN
            ? [
                {
                  resolve: "./src/modules/ghtk",
                  id: "ghtk",
                  options: {
                    token: process.env.GHTK_TOKEN,
                  },
                },
              ]
            : []),
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/cache-redis",
      options: { redisUrl: process.env.REDIS_URL },
    },
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: { redisUrl: process.env.REDIS_URL },
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
            },
          },
        ],
      },
    },
  ],
});
