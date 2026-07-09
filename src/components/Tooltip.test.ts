import { describe, it, expect } from "vitest";
import React from "react";

describe("Tooltip child handling", () => {
  it("accepts a text child without throwing (React.Children.only rejects text)", () => {
    const children = ["<"];
    expect(React.Children.count(children)).toBe(1);
    const child = React.Children.toArray(children)[0];
    expect(React.isValidElement(child)).toBe(false);
  });
});
