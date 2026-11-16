import { listOrders, parseOrderQuery } from "@/features/orders/service";
import { responseFor } from "@/features/team/service";
import { failure } from "@/lib/http/result";
export async function GET(request: Request) {
  try {
    return responseFor(
      await listOrders(
        parseOrderQuery(Object.fromEntries(new URL(request.url).searchParams)),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
