import type { TerminalLine } from "@/lib/dashboardTerminalTypes";

/** Text from the most recent command line through the end of the buffer. */
export function textFromLastCommand(lines: TerminalLine[]): string {
  let start = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].kind === "command") {
      start = i;
      break;
    }
  }
  if (start < 0) return "";
  return lines
    .slice(start)
    .map((line) => line.text)
    .join("\n");
}
