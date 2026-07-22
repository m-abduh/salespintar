import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_BULL_URL: z.string().default('redis://localhost:6379/1'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL: z.string().default('llama-3.1-8b-instant'),
  GROQ_FALLBACK_MODEL: z.string().default('mixtral-8x7b-32768'),
  GROQ_MAX_TOKENS: z.coerce.number().default(1024),
  GROQ_TEMPERATURE: z.coerce.number().default(0.7),
  GROQ_DAILY_CAP_PER_LEAD: z.coerce.number().default(50),

  WA_SESSIONS_DIR: z.string().default('./wa_sessions'),
  WA_MAX_CONNECTIONS: z.coerce.number().default(50),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  LOG_LEVEL: z.string().default('info'),
  LOG_DIR: z.string().default('./logs'),
  LOG_CORRELATION_ENABLED: z.coerce.boolean().default(true),

  SENTRY_DSN: z.string().default(''),
  SENTRY_ENVIRONMENT: z.string().default('development'),

  BROADCAST_BATCH_SIZE: z.coerce.number().default(20),
  BROADCAST_THROTTLE_MS: z.coerce.number().default(3000),
  BROADCAST_MAX_RETRIES: z.coerce.number().default(3),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten());
  process.exit(1);
}

export const env = parsed.data;
