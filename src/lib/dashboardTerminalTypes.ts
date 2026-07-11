export type TerminalLineKind = "command" | "output" | "error" | "system";

export interface TerminalLine {
  id: number;
  text: string;
  kind: TerminalLineKind;
}
