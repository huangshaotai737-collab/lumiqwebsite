import { addOrderNote, getStaffOrderDetail } from "@/features/orders/service";
import { responseFor } from "@/features/team/service";
import { assertSameOrigin } from "@/lib/http/origin";
import { failure, HttpError, readJson } from "@/lib/http/result";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return responseFor(await getStaffOrderDetail((await params).id));
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || "");
    const input = await readJson(request);
    if (
      !input ||
      Object.keys(input).length !== 1 ||
      !Object.hasOwn(input, "note")
    )
      throw new HttpError("INVALID_INPUT", 400);
    return responseFor(
      await addOrderNote({ id: (await params).id, note: input.note }),
    );
  } catch (error) {
    return failure(error);
  }
}
