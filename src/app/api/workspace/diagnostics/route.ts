import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profiles";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Run commands safely and return stdout or error message
function runCommand(cmd: string, cwd: string): { success: boolean; output: string } {
  try {
    const output = execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    return { success: true, output };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return { success: false, output: err.stdout || err.stderr || err.message || String(error) };
  }
}

export async function GET() {
  const profile = await getActiveProfile();
  if (!profile || !profile.workspacePath) {
    return NextResponse.json({ error: "No active workspace path" }, { status: 400 });
  }

  const cwd = profile.workspacePath;
  const packageJsonPath = path.join(cwd, "package.json");

  const nodeVersion = process.version;
  let npmVersion = "unknown";
  try {
    npmVersion = execSync("npm -v", { encoding: "utf-8" }).trim();
  } catch {}

  let enginesNode = "*";
  let dependencies: Record<string, string> = {};
  const missingDeps: string[] = [];
  const packageJsonExists = fs.existsSync(packageJsonPath);

  if (packageJsonExists) {
    try {
      const pkgContent = fs.readFileSync(packageJsonPath, "utf-8");
      const pkg = JSON.parse(pkgContent);
      enginesNode = pkg.engines?.node || "*";
      dependencies = { ...pkg.dependencies, ...pkg.devDependencies };

      for (const dep of Object.keys(dependencies)) {
        const depPath = path.join(cwd, "node_modules", dep);
        if (!fs.existsSync(depPath)) {
          missingDeps.push(dep);
        }
      }
    } catch {}
  }

  // Node compatibility check
  let isNodeCompatible = true;
  if (enginesNode !== "*") {
    const requiredMajorMatch = enginesNode.match(/\d+/);
    const activeMajorMatch = nodeVersion.match(/\d+/);
    if (requiredMajorMatch && activeMajorMatch) {
      const requiredMajor = parseInt(requiredMajorMatch[0], 10);
      const activeMajor = parseInt(activeMajorMatch[0], 10);
      if (enginesNode.includes(">=") && activeMajor < requiredMajor) {
        isNodeCompatible = false;
      }
    }
  }

  // Check git status
  let gitStatus = "Clean";
  try {
    const gitOut = execSync("git status --porcelain", { cwd, stdio: ["pipe", "pipe", "ignore"], encoding: "utf-8" });
    if (gitOut.trim()) {
      gitStatus = "Modified changes present";
    }
  } catch {
    gitStatus = "Not a Git repository";
  }

  return NextResponse.json({
    nodeVersion,
    npmVersion,
    enginesNode,
    isNodeCompatible,
    packageJsonExists,
    totalDependencies: Object.keys(dependencies).length,
    missingDependencies: missingDeps,
    gitStatus,
  });
}

export async function POST(request: Request) {
  const profile = await getActiveProfile();
  if (!profile || !profile.workspacePath) {
    return NextResponse.json({ error: "No active workspace path" }, { status: 400 });
  }

  const cwd = profile.workspacePath;

  try {
    const { action } = await request.json();

    if (action === "clean-cache") {
      const res = runCommand("npm cache clean --force", cwd);
      return NextResponse.json(res);
    }

    if (action === "clean-modules") {
      const nodeModulesPath = path.join(cwd, "node_modules");
      if (fs.existsSync(nodeModulesPath)) {
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      }
      const res = runCommand("npm install", cwd);
      return NextResponse.json(res);
    }

    if (action === "audit-fix") {
      const res = runCommand("npm audit fix --force", cwd);
      return NextResponse.json(res);
    }

    if (action === "install") {
      const res = runCommand("npm install", cwd);
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
