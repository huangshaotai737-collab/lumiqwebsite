import { requireVerifiedUser } from "@/lib/auth/require-user";
import { createOrder, listOwnOrders } from "@/features/orders/service";
import { orderResponse } from "@/features/orders/http";
import { assertSameOrigin } from "@/lib/http/origin";
import { failure, HttpError } from "@/lib/http/result";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  if ([...query.keys()].some((k) => !["page", "pageSize"].includes(k)))
    return failure(new HttpError("INVALID_INPUT", 400));
  return orderResponse(
    await listOwnOrders({
      page: Number(query.get("page") || 1),
      pageSize: Number(query.get("pageSize") || 25),
    }),
  );
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || "");
    const expected = request.headers.get("x-lumiq-customer");
    if (expected && expected !== (await requireVerifiedUser()).userId)
      throw new HttpError("CONFLICT", 409);
    let input;
    try {
      input = await request.json();
    } catch {
      throw new HttpError("INVALID_INPUT", 400);
    }
    const result = await createOrder(input);
    return orderResponse(result, result.ok && result.data.reused ? 200 : 201);
  } catch (error) {
    return failure(error);
  }
}
