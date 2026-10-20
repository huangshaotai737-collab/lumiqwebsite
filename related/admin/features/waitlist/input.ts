import { HttpError } from "@/lib/http/result";
export type OperationsQuery = {
  search: string;
  status: "all" | "new" | "contacted" | "closed";
  page: number;
  pageSize: number;
};
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseQuery(
  value: Partial<Record<keyof OperationsQuery, unknown>>,
): OperationsQuery {
  const search = value.search ?? "";
  const status = value.status ?? "all";
  const page = Number(value.page ?? 1);
  const pageSize = Number(value.pageSize ?? 25);
  if (
    typeof search !== "string" ||
    search.length > 254 ||
    typeof status !== "string" ||
    !["all", "new", "contacted", "closed"].includes(status) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 1000000 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1
  )
    throw new HttpError("INVALID_INPUT", 400);
  return {
    search: search.trim(),
    status: status as OperationsQuery["status"],
    page,
    pageSize: Math.min(pageSize, 100),
  };
}
export function queryFromUrl(request: Request) {
  return parseQuery(Object.fromEntries(new URL(request.url).searchParams));
}
export function validateNote(
  note: unknown,
  allowEmpty = false,
): asserts note is string {
  if (
    typeof note !== "string" ||
    (!allowEmpty && !note.trim()) ||
    [...note].length > 2000
  )
    throw new HttpError("INVALID_INPUT", 400);
}
