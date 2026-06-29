import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profiles";
import { startRunner, stopRunner, getRunnerStatus, getRunnerLogs } from "@/lib/runner";

export async function GET() {
  const profile = await getActiveProfile();
  if (!profile || !profile.workspacePath) {
    return NextResponse.json({ error: "No active workspace path" }, { status: 400 });
  }

  const status = getRunnerStatus();
  const logs = getRunnerLogs();
  return NextResponse.json({ status, logs });
}

export async function POST(request: Request) {
  const profile = await getActiveProfile();
  if (!profile || !profile.workspacePath) {
    return NextResponse.json({ error: "No active workspace path" }, { status: 400 });
  }

  try {
    const { action } = await request.json();

    if (action === "start") {
      const status = startRunner(profile.workspacePath);
      return NextResponse.json({ success: true, status });
    }

    if (action === "stop") {
      const status = stopRunner();
      return NextResponse.json({ success: true, status });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
