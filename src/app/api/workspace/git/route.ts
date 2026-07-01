import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profiles";
import { execFile } from "child_process";
import {
  getCurrentBranch,
  getBranches,
  getSyncStatus,
  getFileCommits,
  getCommitDiff,
  getConflictFiles,
  parseConflictFile,
  getAllRepoCommits,
} from "@/lib/git";
import path from "path";

export async function GET(request: Request) {
  const profile = await getActiveProfile();
  if (!profile || !profile.workspacePath) {
    return NextResponse.json({ error: "No active workspace path" }, { status: 400 });
  }

  const cwd = profile.workspacePath;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    if (action === "all-commits") {
      const commits = await getAllRepoCommits(cwd);
      return NextResponse.json({ commits });
    }

    if (action === "branches") {
      const branches = await getBranches(cwd);
      const current = await getCurrentBranch(cwd);
      return NextResponse.json({ branches, current });
    }

    if (action === "status") {
      const sync = await getSyncStatus(cwd);
      return NextResponse.json({ sync });
    }

    if (action === "commits") {
      const file = searchParams.get("file");
      if (!file) return NextResponse.json({ error: "File parameter missing" }, { status: 400 });
      const commits = await getFileCommits(cwd, file);
      return NextResponse.json({ commits });
    }

    if (action === "diff") {
      const commit = searchParams.get("commit");
      const file = searchParams.get("file");
      if (!commit || !file) {
        return NextResponse.json({ error: "Commit or file parameter missing" }, { status: 400 });
      }
      const diff = await getCommitDiff(cwd, commit, file);
      return NextResponse.json({ diff });
    }

    if (action === "conflicts") {
      const conflicts = await getConflictFiles(cwd);
      return NextResponse.json({ conflicts });
    }

    if (action === "conflict-details") {
      const file = searchParams.get("file");
      if (!file) return NextResponse.json({ error: "File parameter missing" }, { status: 400 });
      const rootPath = path.resolve(cwd);
      const fullPath = path.resolve(rootPath, file);
      if (!fullPath.startsWith(rootPath + path.sep) && fullPath !== rootPath) {
        return NextResponse.json({ error: "Access denied: Invalid file path" }, { status: 403 });
      }
      const details = await parseConflictFile(fullPath);
      return NextResponse.json(details);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[git] GET failed:", err);
    return NextResponse.json({ error: "Failed to read git data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const profile = await getActiveProfile();
  if (!profile || !profile.workspacePath) {
    return NextResponse.json({ error: "No active workspace path" }, { status: 400 });
  }

  const cwd = profile.workspacePath;

  try {
    const { action, branch } = await request.json();

    if (action === "switch-branch") {
      if (!branch || typeof branch !== "string") {
        return NextResponse.json({ error: "Branch parameter missing" }, { status: 400 });
      }

      // Only allow switching to a branch that already exists locally.
      const branches = await getBranches(cwd);
      if (!branches.includes(branch)) {
        return NextResponse.json({ error: "Unknown branch" }, { status: 400 });
      }

      await new Promise<void>((resolve, reject) => {
        execFile("git", ["checkout", branch], { cwd, timeout: 15000 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const current = await getCurrentBranch(cwd);
      return NextResponse.json({ success: true, current });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[git] POST failed:", err);
    return NextResponse.json({ error: "Failed to perform git operation" }, { status: 500 });
  }
}
