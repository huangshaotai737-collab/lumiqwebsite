import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Heading, { headingText } from "@/components/Heading";

describe("heading punctuation", () => {
  it("replaces English, Chinese and Japanese full stops with spaces, preserving commas", () => {
    expect(headingText("Explore. Interact.")).toBe("Explore  Interact ");
    expect(headingText("探索。互動，連結。")).toBe("探索 互動，連結 ");
    expect(headingText("暮らしに知性を。家族と、一緒に。")).toBe("暮らしに知性を 家族と、一緒に ");
    expect(headingText("Version 2.0.")).toBe("Version 2.0 ");
  });
  it("formats nested title spans on the server while preserving semantic markup", () => {
    const html = renderToStaticMarkup(React.createElement(Heading, { as: "h1", id: "title" }, "One family.", React.createElement("br"), React.createElement("span", {}, "Different rhythms.")));
    expect(html).toBe('<h1 id="title">One family <br/><span>Different rhythms </span></h1>');
  });
  it("can keep approved sentence punctuation without changing other headings", () => {
    const html = renderToStaticMarkup(React.createElement(Heading, { as: "h1", preservePunctuation: true }, "Interaction.", React.createElement("br"), React.createElement("span", {}, "Reimagined.")));
    expect(html).toBe('<h1>Interaction.<br/><span>Reimagined.</span></h1>');
    expect(html).not.toContain('preservePunctuation');
  });
});
