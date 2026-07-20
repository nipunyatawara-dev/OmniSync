export type AccentColor = "default" | "emerald" | "royal" | "sunset";

export interface GlobalSettings {
  gitUsername: string;
  gitEmail: string;
  defaultBranch: string;
  /** Minutes between background fetches; "0" = manual only */
  autoFetchInterval: string;
  terminalShell: string;
  showHiddenFiles: boolean;
  accentColor: AccentColor;
}

/** Platform default for the dashboard terminal / runner shell preference. */
export function defaultTerminalShell(
  platform: NodeJS.Platform | string = typeof process !== "undefined" ? process.platform : "darwin"
): string {
  return platform === "win32" ? "powershell" : "zsh";
}

/** Prompt glyph shown after user@host folder in the terminal panel. */
export function terminalPromptSuffix(shellId: string): string {
  const id = (shellId || "").toLowerCase();
  if (id === "powershell" || id === "pwsh" || id === "cmd") return ">";
  if (id === "zsh") return "%";
  return "$";
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  gitUsername: "",
  gitEmail: "",
  defaultBranch: "main",
  autoFetchInterval: "5",
  terminalShell: defaultTerminalShell(),
  showHiddenFiles: true,
  accentColor: "default",
};

/** Resolved fetch interval in ms; 0 when disabled */
export function autoFetchIntervalMs(
  profileAutoFetch: boolean | undefined,
  intervalMinutes: string
): number {
  if (!profileAutoFetch) return 0;
  const minutes = parseInt(intervalMinutes, 10);
  if (!minutes || minutes <= 0) return 0;
  return minutes * 60 * 1000;
}
