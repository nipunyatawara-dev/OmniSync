import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/workspace/file-content/route";
import * as profiles from "@/lib/profiles";
import * as pathSafety from "@/lib/pathSafety";
import { promises as fs } from "fs";

vi.mock("@/lib/profiles", () => ({
  getActiveProfile: vi.fn(),
}));

vi.mock("@/lib/pathSafety", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/pathSafety")>();
  return {
    ...actual,
    resolveSafePath: vi.fn(),
  };
});

vi.mock("fs", () => ({
  promises: {
    stat: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

describe("file-content route", () => {
  const workspace = "/workspace";

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(profiles.getActiveProfile).mockResolvedValue({
      id: "p1",
      name: "Test",
      profession: "dev",
      workspacePath: workspace,
      createdAt: "",
      updatedAt: "",
    });
    vi.mocked(pathSafety.resolveSafePath).mockResolvedValue("/workspace/readme.md");
  });

  it("GET rejects files over read limit", async () => {
    vi.mocked(fs.stat).mockResolvedValue({ size: 3 * 1024 * 1024 } as Awaited<ReturnType<typeof fs.stat>>);

    const req = new Request("http://localhost/api/workspace/file-content?file=readme.md");
    const res = await GET(req);
    expect(res.status).toBe(413);
  });

  it("POST rejects content over write limit", async () => {
    const req = new Request("http://localhost/api/workspace/file-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: "readme.md", content: "x".repeat(2 * 1024 * 1024 + 1) }),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it("GET reads file within limit", async () => {
    vi.mocked(fs.stat).mockResolvedValue({ size: 10 } as Awaited<ReturnType<typeof fs.stat>>);
    vi.mocked(fs.readFile).mockResolvedValue("hello");

    const req = new Request("http://localhost/api/workspace/file-content?file=readme.md");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe("hello");
  });

  it("GET returns binary metadata for images without reading as utf-8", async () => {
    vi.mocked(pathSafety.resolveSafePath).mockResolvedValue("/workspace/logo.png");
    vi.mocked(fs.stat).mockResolvedValue({ size: 12 } as Awaited<ReturnType<typeof fs.stat>>);

    const req = new Request("http://localhost/api/workspace/file-content?file=logo.png");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ isBinary: true, mimeType: "image/png" });
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it("GET raw serves image bytes with correct content type", async () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    vi.mocked(pathSafety.resolveSafePath).mockResolvedValue("/workspace/logo.png");
    vi.mocked(fs.stat).mockResolvedValue({ size: pngBytes.byteLength } as Awaited<ReturnType<typeof fs.stat>>);
    vi.mocked(fs.readFile).mockResolvedValue(pngBytes);

    const req = new Request("http://localhost/api/workspace/file-content?file=logo.png&raw=1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Content-Length")).toBe(String(pngBytes.byteLength));
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.equals(pngBytes)).toBe(true);
  });
});
