import { describe, it, expect } from "vitest";
import { joinWorkspacePath, parentWorkspacePath } from "./workspacePathJoin";

describe("joinWorkspacePath", () => {
  it("joins POSIX parents with /", () => {
    expect(joinWorkspacePath("/Users/me/Documents/GitHub", "demo")).toBe(
      "/Users/me/Documents/GitHub/demo"
    );
  });

  it("joins Windows parents with \\", () => {
    expect(joinWorkspacePath("C:\\Users\\me\\Documents\\GitHub", "demo")).toBe(
      "C:\\Users\\me\\Documents\\GitHub\\demo"
    );
  });
});

describe("parentWorkspacePath", () => {
  it("extracts POSIX and Windows parents", () => {
    expect(parentWorkspacePath("/Users/me/Documents/GitHub/demo")).toBe(
      "/Users/me/Documents/GitHub"
    );
    expect(parentWorkspacePath("C:\\Users\\me\\Documents\\GitHub\\demo")).toBe(
      "C:\\Users\\me\\Documents\\GitHub"
    );
  });
});
