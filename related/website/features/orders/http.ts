import type { ApiResult } from "@/lib/generated/platform/core";
export function orderResponse<T>(result: ApiResult<T>, status = 200) {
  return Response.json(result, {
    status: result.ok
      ? status
      : (
          {
            UNAUTHENTICATED: 401,
            FORBIDDEN: 403,
            INVALID_INPUT: 400,
            NOT_FOUND: 404,
            CONFLICT: 409,
            ORDERING_DISABLED: 409,
            TERMS_CHANGED: 409,
            RATE_LIMITED: 429,
          } as Record<string, number>
        )[result.error] || 503,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
