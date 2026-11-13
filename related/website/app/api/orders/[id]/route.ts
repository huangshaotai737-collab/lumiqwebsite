import { getOwnOrder } from "@/features/orders/service";
import { orderResponse } from "@/features/orders/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return orderResponse(await getOwnOrder((await params).id));
}
