import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:8080,http://localhost:5173")
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)),

  PUBLIC_BASE_URL: z.string().default("http://localhost:8787"),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-pro"),

  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),

  SANDBOX_MODE: z.enum(["docker", "local"]).default("local"),
  WORKSPACE_ROOT: z.string().default("/var/aqualibria/workspaces"),
  SANDBOX_IMAGE: z.string().default("node:20-alpine"),
  SANDBOX_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  MAX_FILE_BYTES: z.coerce.number().int().positive().default(1024 * 1024),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),

  LOG_LEVEL: z.string().default("info"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
