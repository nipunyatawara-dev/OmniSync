export type CloneStreamEvent =
  | { type: "log"; message: string }
  | { type: "error"; message: string }
  | { type: "success"; path?: string };

/**
 * Parse one NDJSON line from the clone API stream.
 * Returns null for blank / incomplete JSON (caller should keep buffering).
 */
export function parseCloneStreamLine(line: string): CloneStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;

  if (record.type === "log" && typeof record.message === "string") {
    return { type: "log", message: record.message };
  }
  if (record.type === "error" && typeof record.message === "string") {
    return { type: "error", message: record.message };
  }
  if (record.type === "success") {
    return {
      type: "success",
      path: typeof record.path === "string" ? record.path : undefined,
    };
  }

  return null;
}

export type ConsumeCloneStreamResult = {
  succeeded: boolean;
  path?: string;
  logs: string[];
};

/**
 * Read the clone NDJSON body. Throws on stream error events.
 * Requires a final success event - otherwise the clone is treated as failed.
 */
export async function consumeCloneStream(
  body: ReadableStream<Uint8Array>,
  onLog?: (message: string) => void
): Promise<ConsumeCloneStreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let succeeded = false;
  let path: string | undefined;
  const logs: string[] = [];

  const handleLine = (line: string) => {
    const event = parseCloneStreamLine(line);
    if (!event) return;

    if (event.type === "log") {
      logs.push(event.message);
      onLog?.(event.message);
      return;
    }
    if (event.type === "error") {
      throw new Error(event.message);
    }
    if (event.type === "success") {
      succeeded = true;
      path = event.path;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      handleLine(line);
    }
  }

  if (buffer.trim()) {
    handleLine(buffer);
  }

  if (!succeeded) {
    throw new Error("Clone finished without a success confirmation from the server.");
  }

  return { succeeded, path, logs };
}
