import { describe, it, expect } from "vitest";
import { parseCloneStreamLine, consumeCloneStream } from "./cloneStream";

describe("parseCloneStreamLine", () => {
  it("parses log, error, and success events", () => {
    expect(parseCloneStreamLine('{"type":"log","message":"hello"}')).toEqual({
      type: "log",
      message: "hello",
    });
    expect(parseCloneStreamLine('{"type":"error","message":"boom"}')).toEqual({
      type: "error",
      message: "boom",
    });
    expect(parseCloneStreamLine('{"type":"success","path":"C:\\\\repo"}')).toEqual({
      type: "success",
      path: "C:\\repo",
    });
  });

  it("returns null for blank or invalid JSON instead of throwing", () => {
    expect(parseCloneStreamLine("")).toBeNull();
    expect(parseCloneStreamLine("  ")).toBeNull();
    expect(parseCloneStreamLine("{partial")).toBeNull();
  });
});

describe("consumeCloneStream", () => {
  function streamFrom(text: string): ReadableStream<Uint8Array> {
    const bytes = new TextEncoder().encode(text);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
  }

  it("requires a success event and returns the clone path", async () => {
    const result = await consumeCloneStream(
      streamFrom(
        [
          JSON.stringify({ type: "log", message: "cloning" }),
          JSON.stringify({ type: "success", path: "/tmp/repo" }),
          "",
        ].join("\n")
      )
    );
    expect(result.succeeded).toBe(true);
    expect(result.path).toBe("/tmp/repo");
    expect(result.logs).toEqual(["cloning"]);
  });

  it("throws on error events instead of continuing", async () => {
    await expect(
      consumeCloneStream(
        streamFrom(
          [
            JSON.stringify({ type: "log", message: "start" }),
            JSON.stringify({ type: "error", message: "git clone failed with exit code 128" }),
          ].join("\n")
        )
      )
    ).rejects.toThrow(/git clone failed with exit code 128/);
  });

  it("throws when the stream ends without success", async () => {
    await expect(
      consumeCloneStream(streamFrom(JSON.stringify({ type: "log", message: "only log" }) + "\n"))
    ).rejects.toThrow(/without a success confirmation/);
  });
});
