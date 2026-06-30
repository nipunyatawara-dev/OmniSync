import { NextResponse } from "next/server";
import { getOauthConfig, saveOauthConfig } from "@/lib/profiles";

export async function GET() {
  try {
    const config = await getOauthConfig();
    const defaultClientId = "Ov23li8zIwN0BXPmjmA4";
    const clientId = config.githubClientId || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || defaultClientId;
    return NextResponse.json({
      hasConfig: true,
      clientId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { clientId, clientSecret } = await request.json();
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "Missing Client ID or Client Secret" }, { status: 400 });
    }
    await saveOauthConfig({
      githubClientId: clientId,
      githubClientSecret: clientSecret,
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
