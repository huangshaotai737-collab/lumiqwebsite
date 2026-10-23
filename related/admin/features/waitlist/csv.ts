import type { WaitlistSummary } from "./service";
// Neutralize the whole field before RFC4180 quoting. Tabs/CR and whitespace-hidden formulas are unsafe too.
export function csvCell(value: string | number) {
  const text = String(value);
  const inert = /^[\t\r]|^\s*[=+@-]|^\s*[\t\r]/u.test(text) ? `'${text}` : text;
  return `"${inert.replaceAll('"', '""')}"`;
}
export function waitlistCsv(rows: WaitlistSummary[]) {
  const columns = [
    "id",
    "email",
    "source",
    "consentVersion",
    "createdAt",
    "status",
    "note",
    "version",
  ] as const;
  return (
    "\uFEFF" +
    [
      columns.map(csvCell).join(","),
      ...rows.map((row) => columns.map((key) => csvCell(row[key])).join(",")),
    ].join("\r\n") +
    "\r\n"
  );
}
