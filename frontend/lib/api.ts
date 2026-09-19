/**
 * Base URL of the backend Worker. `NEXT_PUBLIC_*` values are inlined at
 * BUILD time, so a deployed build must be produced with the right value
 * (`frontend/.env.production` supplies it for `next build` /
 * `opennextjs-cloudflare build`). The localhost fallback exists for
 * `next dev` only — silently shipping it would make every browser call
 * hit the visitor's own machine, so production builds fail loudly instead.
 */
function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be set for production builds");
  }
  return "http://localhost:8787";
}

const API_BASE_URL = resolveApiBaseUrl();

/**
 * Non-2xx API response. `message` keeps the historical
 * `API request failed: <status> <statusText>` shape so callers that
 * substring-match a status code keep working; new code should read
 * `status` and `code` (the API's `error.code`, e.g. `TOKEN_EXPIRED`).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, statusText: string, code: string | null) {
    super(`API request failed: ${status} ${statusText}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Single point of contact with the backend Worker API. Per
 * docs/03_Technical_Architecture.md, the frontend never talks to D1/R2
 * directly — everything routes through here.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let code: string | null = null;
    try {
      const body = (await res.json()) as { error?: { code?: unknown } };
      if (typeof body.error?.code === "string") code = body.error.code;
    } catch {
      // Non-JSON error body (e.g. a platform error page) — status alone will do.
    }
    throw new ApiError(res.status, res.statusText, code);
  }

  return res.json() as Promise<T>;
}
