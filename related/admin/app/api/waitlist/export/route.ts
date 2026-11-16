import { exportWaitlist } from "@/features/waitlist/service";
import { queryFromUrl } from "@/features/waitlist/input";
import { failure } from "@/lib/http/result";
import { assertSameOrigin } from "@/lib/http/origin";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || "");
    return await exportWaitlist(queryFromUrl(request));
  } catch (error) {
    return failure(error);
  }
}
