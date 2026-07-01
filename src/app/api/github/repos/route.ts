import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profiles";

export async function GET(request: Request) {
  try {
    // Prefer the server-stored token; fall back to a client-provided token,
    // which is only used during initial setup before a profile is saved.
    const profile = await getActiveProfile();
    let token = profile?.gitToken;
    if (!token) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }
    if (!token) {
      return NextResponse.json({ error: "No GitHub token available" }, { status: 401 });
    }

    const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "OmniSync-Local-Client",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[repos] GitHub API error:", res.status, errText);
      return NextResponse.json({ error: "GitHub API request failed" }, { status: res.status });
    }

    interface GitHubRepository {
      id: number;
      name: string;
      full_name: string;
      description: string | null;
      clone_url: string;
      private: boolean;
      owner: {
        login: string;
      };
    }

    const repos = await res.json() as GitHubRepository[];
    
    // Map to a clean, lightweight list of repositories
    const mapped = repos.map((repo: GitHubRepository) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      cloneUrl: repo.clone_url,
      private: repo.private,
      owner: repo.owner.login,
    }));

    return NextResponse.json({ repos: mapped });
  } catch (error: unknown) {
    console.error("[repos] request failed:", error);
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
  }
}
