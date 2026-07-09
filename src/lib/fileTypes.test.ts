import { describe, it, expect } from "vitest";
import { getExtension, getImageMimeType, isImageFile } from "@/lib/fileTypes";

describe("fileTypes", () => {
  it("extracts lowercase extensions", () => {
    expect(getExtension("logo.PNG")).toBe(".png");
    expect(getExtension("src/assets/icon.gif")).toBe(".gif");
    expect(getExtension("noext")).toBe("");
  });

  it("detects common image types", () => {
    expect(isImageFile("a.png")).toBe(true);
    expect(isImageFile("b.GIF")).toBe(true);
    expect(isImageFile("c.jpeg")).toBe(true);
    expect(isImageFile("d.webp")).toBe(true);
    expect(isImageFile("e.svg")).toBe(true);
    expect(isImageFile("readme.md")).toBe(false);
    expect(isImageFile("app.ts")).toBe(false);
  });

  it("returns mime types for images", () => {
    expect(getImageMimeType("photo.jpg")).toBe("image/jpeg");
    expect(getImageMimeType("anim.gif")).toBe("image/gif");
    expect(getImageMimeType("notes.txt")).toBeNull();
  });
});
