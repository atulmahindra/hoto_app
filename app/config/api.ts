/**
 * Centralized API base URLs.
 *
 * The active environment is chosen via the `NEXT_PUBLIC_API_ENV` env variable:
 *   - "dev"   -> https://alytehotoapi.mllqa.com  (default)
 *   - "local" -> http://localhost:5001
 *
 * You can also override the base URL directly with `NEXT_PUBLIC_API_BASE_URL`.
 * QC reports API can be overridden with `NEXT_PUBLIC_QC_API_BASE_URL`.
 */

const ENVIRONMENTS = {
  dev: "https://alytehotoapi.mllqa.com",
  local: "http://localhost:5001",
} as const;

type ApiEnv = keyof typeof ENVIRONMENTS;

const activeEnv = (process.env.NEXT_PUBLIC_API_ENV as ApiEnv) || "dev";

// Primary API base URL (auth, master data, vehicle audit, uploads, etc.)
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ENVIRONMENTS[activeEnv] ||
  ENVIRONMENTS.dev;

// QC reports API base URL (defaults to the primary base URL)
export const QC_API_BASE_URL =
  process.env.NEXT_PUBLIC_QC_API_BASE_URL || API_BASE_URL;
