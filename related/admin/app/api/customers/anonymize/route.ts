import {
  getPrivacyWorkspace,
  requestAnonymization,
  resumeAnonymization,
} from "@/features/customers/privacy";
import { responseFor } from "@/features/team/service";
import { assertSameOrigin } from "@/lib/http/origin";
import { failure, HttpError } from "@/lib/http/result";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  return responseFor(
    await getPrivacyWorkspace(
      q.get("search") || "",
      Number(q.get("page") || 1),
    ),
  );
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || "");
    let input;
    try {
      input = await request.json();
    } catch {
      throw new HttpError("INVALID_INPUT", 400);
    }
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new HttpError("INVALID_INPUT", 400);
    const keys = Object.keys(input).sort().join(",");
    if (keys === "jobId")
      return responseFor(await resumeAnonymization(input.jobId));
    if (keys !== "reason,userId") throw new HttpError("INVALID_INPUT", 400);
    return responseFor(await requestAnonymization(input));
  } catch (error) {
    return failure(error);
  }
}
