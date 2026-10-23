import { cancelOrder } from "@/features/orders/service";
import { orderResponse } from "@/features/orders/http";
import { assertSameOrigin } from "@/lib/http/origin";
import { failure, HttpError } from "@/lib/http/result";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || "");
    const raw = await request.text();
    if (raw.trim()) {
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new HttpError("INVALID_INPUT", 400);
      }
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).length
      )
        throw new HttpError("INVALID_INPUT", 400);
    }
    return orderResponse(await cancelOrder((await params).id));
  } catch (error) {
    return failure(error);
  }
}
