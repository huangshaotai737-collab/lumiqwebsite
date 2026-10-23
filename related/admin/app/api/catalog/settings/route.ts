import { updateCommerceSettings } from "@/features/catalog/service";
import { responseFor } from "@/features/team/service";
import { assertSameOrigin } from "@/lib/http/origin";
import { failure, HttpError } from "@/lib/http/result";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || "");
    let input;
    try {
      input = await request.json();
    } catch {
      throw new HttpError("INVALID_INPUT", 400);
    }
    return responseFor(await updateCommerceSettings(input));
  } catch (error) {
    return failure(error);
  }
}
