import "server-only";
import { randomUUID } from "node:crypto";
import type { ApiResult } from "@/lib/generated/platform/core";
import { HttpError } from "@/lib/http/result";
export async function operationsResult<T>(
  operation: () => Promise<T>,
): Promise<ApiResult<T>> {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof HttpError ? error.code : "UNAVAILABLE",
      requestId: randomUUID(),
    };
  }
}
export function operationsRpcError(error: { code?: string } | null) {
  if (!error) return;
  const faults: Record<
    string,
    [ConstructorParameters<typeof HttpError>[0], number]
  > = {
    "42501": ["FORBIDDEN", 403],
    "23505": ["CONFLICT", 409],
    "22023": ["INVALID_INPUT", 400],
    "23514": ["INVALID_INPUT", 400],
    P0002: ["NOT_FOUND", 404],
    P0003: ["RATE_LIMITED", 429],
  };
  const fault = faults[error.code || ""] || ["UNAVAILABLE", 503];
  throw new HttpError(fault[0], fault[1]);
}
