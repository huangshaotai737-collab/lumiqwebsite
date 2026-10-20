import { listCustomers } from "@/features/customers/service";
import { queryFromUrl } from "@/features/waitlist/input";
import { responseFor } from "@/features/team/service";
import { failure } from "@/lib/http/result";
export async function GET(request: Request) {
  try {
    return responseFor(await listCustomers(queryFromUrl(request)));
  } catch (error) {
    return failure(error);
  }
}
