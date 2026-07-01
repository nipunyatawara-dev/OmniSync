import { NextResponse } from "next/server";
import { getGlobalSettings, saveGlobalSettings, type GlobalSettings } from "@/lib/globalSettings";
import { getActiveProfile } from "@/lib/profiles";
import { applyGitIdentity } from "@/lib/git";

export async function GET() {
  const settings = await getGlobalSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updates: Partial<GlobalSettings> = {};

    if (typeof body.gitUsername === "string") updates.gitUsername = body.gitUsername;
    if (typeof body.gitEmail === "string") updates.gitEmail = body.gitEmail;
    if (typeof body.defaultBranch === "string") updates.defaultBranch = body.defaultBranch;
    if (typeof body.autoFetchInterval === "string") updates.autoFetchInterval = body.autoFetchInterval;
    if (typeof body.terminalShell === "string") updates.terminalShell = body.terminalShell;
    if (typeof body.showHiddenFiles === "boolean") updates.showHiddenFiles = body.showHiddenFiles;
    if (typeof body.enableTelemetry === "boolean") updates.enableTelemetry = body.enableTelemetry;
    if (typeof body.accentColor === "string") updates.accentColor = body.accentColor;

    const settings = await saveGlobalSettings(updates);

    // Apply git identity to the active workspace when author fields change
    if (updates.gitUsername !== undefined || updates.gitEmail !== undefined) {
      const profile = await getActiveProfile();
      if (profile?.workspacePath) {
        await applyGitIdentity(profile.workspacePath, settings.gitUsername, settings.gitEmail);
      }
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: unknown) {
    console.error("[settings] save failed:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
