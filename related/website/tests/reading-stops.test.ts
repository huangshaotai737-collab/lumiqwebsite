import { describe, expect, it } from "vitest";
import { readingStop } from "@/components/home/readingStops";

describe("reading stops", () => {
  const stops = [0, 0.32, 0.7];
  it("settles in the scroll direction without skipping the next composition", () => {
    expect(readingStop(0.1, stops, 1, 0.5)).toBe(0.32);
    expect(readingStop(0.6, stops, -1, 0.5)).toBe(0.32);
  });
  it("does not advance an already settled composition due to rounding", () => {
    expect(readingStop(0.321, stops, 1)).toBe(0.321);
  });
  it("leaves the final reading hold freely when scrolling onward", () => {
    expect(readingStop(0.85, stops, 1)).toBe(0.85);
    expect(readingStop(0.85, stops, -1)).toBe(0.7);
  });
  it("does not pull distant content across a long reading area", () => {
    expect(readingStop(0.34, stops, 1, 0.2)).toBe(0.34);
  });
});
