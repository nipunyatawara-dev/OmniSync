import { promises as fs } from "fs";
import path from "path";

export type AccentColor = "default" | "emerald" | "royal" | "sunset";

export interface GlobalSettings {
  gitUsername: string;
  gitEmail: string;
  defaultBranch: string;
  /** Minutes between background fetches; "0" = manual only */
  autoFetchInterval: string;
  terminalShell: string;
  showHiddenFiles: boolean;
  enableTelemetry: boolean;
  accentColor: AccentColor;
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  gitUsername: "",
  gitEmail: "",
  defaultBranch: "main",
  autoFetchInterval: "5",
  terminalShell: "zsh",
  showHiddenFiles: false,
  enableTelemetry: true,
  accentColor: "default",
};

const USER_DATA_DIR = path.join(process.cwd(), "User data");
const SETTINGS_FILE = path.join(USER_DATA_DIR, "global-settings.json");

async function ensureDir() {
  await fs.mkdir(USER_DATA_DIR, { recursive: true });
}

export async function getGlobalSettings(): Promise<GlobalSettings> {
  try {
    await ensureDir();
    const raw = await fs.readFile(SETTINGS_FILE, "utf-8");
    return { ...DEFAULT_GLOBAL_SETTINGS, ...JSON.parse(raw) };
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === "ENOENT") {
      return { ...DEFAULT_GLOBAL_SETTINGS };
    }
    console.error("[globalSettings] read failed:", error);
    return { ...DEFAULT_GLOBAL_SETTINGS };
  }
}

export async function saveGlobalSettings(
  updates: Partial<GlobalSettings>
): Promise<GlobalSettings> {
  const current = await getGlobalSettings();
  const merged = { ...current, ...updates };
  await ensureDir();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

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
