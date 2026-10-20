import { exportWaitlist } from "@/features/waitlist/service";
import { queryFromUrl } from "@/features/waitlist/input";
import { failure } from "@/lib/http/result";
export async function GET(request: Request) {
  try {
    return await exportWaitlist(queryFromUrl(request));
  } catch (error) {
    return failure(error);
  }
}
