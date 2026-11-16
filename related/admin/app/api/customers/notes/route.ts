import { listCustomerNotes } from "@/features/customers/service";
import { responseFor } from "@/features/team/service";
export async function GET(request: Request) {
  return responseFor(
    await listCustomerNotes(
      new URL(request.url).searchParams.get("userId") || "",
    ),
  );
}
