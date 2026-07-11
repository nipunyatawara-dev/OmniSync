import { describe, it, expect } from "vitest";
import { textFromLastCommand } from "@/lib/terminalCopy";
import type { TerminalLine } from "@/lib/dashboardTerminalTypes";

function line(id: number, text: string, kind: TerminalLine["kind"]): TerminalLine {
  return { id, text, kind };
}

describe("textFromLastCommand", () => {
  it("returns empty string when there is no command", () => {
    expect(textFromLastCommand([line(1, "hello", "output")])).toBe("");
  });

  it("copies from the last command through the end", () => {
    const lines = [
      line(1, "── manual ──", "system"),
      line(2, "user@host app % npm run build", "command"),
      line(3, "building...", "output"),
      line(4, "── git ──", "system"),
      line(5, "user@host app % git fetch", "command"),
      line(6, "fatal: auth failed", "error"),
    ];
    expect(textFromLastCommand(lines)).toBe(
      ["user@host app % git fetch", "fatal: auth failed"].join("\n")
    );
  });
});
