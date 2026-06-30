import { NextResponse } from "next/server";
import { getOauthConfig } from "@/lib/profiles";

const DEFAULT_CLIENT_ID = "Ov23li8zIwN0BXPmjmA4"; // Default public Client ID for OmniSync Device Flow

export async function POST() {
  try {
    const config = await getOauthConfig();
    const clientId = config.githubClientId || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || DEFAULT_CLIENT_ID;

    const res = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        scope: "repo,user",
      }),
    });

    const data = await res.json();
    if (data.error) {
      return NextResponse.json({ error: data.error_description || data.error }, { status: 400 });
    }

    return NextResponse.json({
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      interval: data.interval || 5,
      expiresIn: data.expires_in,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
