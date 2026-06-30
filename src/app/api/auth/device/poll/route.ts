import { NextResponse } from "next/server";
import { getOauthConfig } from "@/lib/profiles";

const DEFAULT_CLIENT_ID = "Ov23li8zIwN0BXPmjmA4"; // Default public Client ID for OmniSync Device Flow

export async function POST(request: Request) {
  try {
    const { deviceCode } = await request.json();
    if (!deviceCode) {
      return NextResponse.json({ error: "Missing deviceCode" }, { status: 400 });
    }

    const config = await getOauthConfig();
    const clientId = config.githubClientId || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || DEFAULT_CLIENT_ID;

    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    const data = await res.json();

    if (data.error) {
      if (data.error === "authorization_pending") {
        return NextResponse.json({ status: "pending" });
      }
      return NextResponse.json({ status: "error", error: data.error_description || data.error });
    }

    const accessToken = data.access_token;

    // Fetch user profile
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "OmniSync-Local-Client",
      },
    });

    if (!userRes.ok) {
      const userErr = await userRes.text();
      return NextResponse.json({ status: "error", error: `Failed to retrieve GitHub profile: ${userErr}` });
    }

    const userData = await userRes.json();
    const username = userData.login;
    const avatarUrl = userData.avatar_url || "";

    return NextResponse.json({
      status: "success",
      token: accessToken,
      username,
      avatarUrl,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ status: "error", error: msg }, { status: 500 });
  }
}
