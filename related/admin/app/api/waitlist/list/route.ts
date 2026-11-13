import { listWaitlist } from "@/features/waitlist/service";
import { queryFromUrl } from "@/features/waitlist/input";
import { responseFor } from "@/features/team/service";
import { failure } from "@/lib/http/result";
export async function GET(request: Request) {
  try {
    return responseFor(await listWaitlist(queryFromUrl(request)));
  } catch (error) {
    return failure(error);
  }
}
