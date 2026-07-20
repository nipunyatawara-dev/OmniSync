import { describe, it, expect } from "vitest";
import {
  joinWorkspacePath,
  parentWorkspacePath,
  basenameWorkspacePath,
  displayWorkspaceName,
} from "./workspacePathJoin";

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

describe("basenameWorkspacePath", () => {
  it("returns the final segment on POSIX and Windows", () => {
    expect(basenameWorkspacePath("/Users/me/Documents/GitHub/demo")).toBe("demo");
    expect(basenameWorkspacePath("C:\\Users\\me\\Documents\\GitHub\\random-stuff-site")).toBe(
      "random-stuff-site"
    );
  });
});

describe("displayWorkspaceName", () => {
  it("keeps plain names", () => {
    expect(displayWorkspaceName("my-app")).toBe("my-app");
  });

  it("extracts folder name when the profile name is a Windows path", () => {
    expect(
      displayWorkspaceName("C:\\Users\\me\\Documents\\GitHub\\random-stuff-site")
    ).toBe("random-stuff-site");
  });

  it("falls back to workspacePath basename", () => {
    expect(displayWorkspaceName(undefined, "/tmp/projects/demo")).toBe("demo");
  });
});
