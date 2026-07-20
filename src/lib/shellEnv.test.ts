import { describe, it, expect, afterEach } from "vitest";
import { createRequire } from "node:module";
import path from "node:path";
import { promises as fs } from "node:fs";
import os from "node:os";

const shellEnvPath = path.join(process.cwd(), "shellEnv.js");
const requireShellEnv = createRequire(path.join(process.cwd(), "package.json"));
const {
  augmentProcessEnv,
  getLoginShellPath,
  resolveCommand,
  defaultShellId,
  resolveShellInvocation,
  buildLoginCommandArgv,
} = requireShellEnv(shellEnvPath);

describe("shellEnv", () => {
  it("augments PATH with login shell entries", () => {
    const env = augmentProcessEnv({ FOO: "bar" });
    expect(env.FOO).toBe("bar");
    expect(env.PATH).toBeTruthy();
    expect(typeof env.PATH).toBe("string");
    expect(env.PATH!.length).toBeGreaterThan(0);
    expect(env.npm_config_prefix).toBeUndefined();
  });

  it("does not re-inject stripped keys from process.env into a cleaned base", () => {
    const previousTurbo = process.env.TURBO_CACHE_DIR;
    const previousNext = process.env.NEXT_RUNTIME;
    const previousTurbopack = process.env.TURBOPACK;
    const previousStandalone = process.env.__NEXT_PRIVATE_STANDALONE_CONFIG;
    process.env.TURBO_CACHE_DIR = "/tmp/should-not-leak";
    process.env.NEXT_RUNTIME = "nodejs";
    process.env.TURBOPACK = "1";
    process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = '{"distDirRoot":".next"}';
    try {
      const env = augmentProcessEnv({ FOO: "bar", PATH: "/usr/bin" });
      expect(env.FOO).toBe("bar");
      expect(env.TURBO_CACHE_DIR).toBeUndefined();
      expect(env.NEXT_RUNTIME).toBeUndefined();
      expect(env.TURBOPACK).toBeUndefined();
      expect(env.__NEXT_PRIVATE_STANDALONE_CONFIG).toBeUndefined();
    } finally {
      if (previousTurbo === undefined) delete process.env.TURBO_CACHE_DIR;
      else process.env.TURBO_CACHE_DIR = previousTurbo;
      if (previousNext === undefined) delete process.env.NEXT_RUNTIME;
      else process.env.NEXT_RUNTIME = previousNext;
      if (previousTurbopack === undefined) delete process.env.TURBOPACK;
      else process.env.TURBOPACK = previousTurbopack;
      if (previousStandalone === undefined) delete process.env.__NEXT_PRIVATE_STANDALONE_CONFIG;
      else process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = previousStandalone;
    }
  });

  it("returns a stable cached login shell PATH", () => {
    const first = getLoginShellPath();
    const second = getLoginShellPath();
    expect(second).toBe(first);
  });

  it("resolves npm appropriately for the platform", () => {
    const npmPath = resolveCommand("npm");
    if (process.platform === "win32") {
      expect(npmPath).toBe("npm");
    } else {
      expect(npmPath).toMatch(/npm$/);
      expect(npmPath.startsWith("/")).toBe(true);
    }
  });

  it("rejects untrusted command names", () => {
    if (process.platform === "win32") {
      expect(resolveCommand("rm")).toBe("rm");
      return;
    }
    expect(() => resolveCommand("rm")).toThrow(/untrusted/i);
  });

  it("defaults shell id by platform", () => {
    if (process.platform === "win32") {
      expect(defaultShellId()).toBe("powershell");
    } else {
      expect(["zsh", "bash", "fish", "sh"]).toContain(defaultShellId());
    }
  });

  it("builds Windows PowerShell argv for spawnLoginCommand", () => {
    if (process.platform !== "win32") return;
    const inv = resolveShellInvocation("powershell");
    expect(inv.kind).toBe("powershell");
    expect(inv.executable.toLowerCase()).toContain("powershell");

    const built = buildLoginCommandArgv("npm -v", {
      cwd: "C:\\Users\\test\\project",
      shell: "powershell",
    });
    expect(built.executable.toLowerCase()).toContain("powershell");
    expect(built.args).toEqual([
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Set-Location -LiteralPath 'C:\\Users\\test\\project'; npm -v",
    ]);
  });

  it("builds Windows cmd argv for spawnLoginCommand", () => {
    if (process.platform !== "win32") return;
    const built = buildLoginCommandArgv("dir", {
      cwd: "C:\\Users\\test\\My Project",
      shell: "cmd",
    });
    expect(built.executable).toBe("cmd.exe");
    expect(built.args[0]).toBe("/d");
    expect(built.args[1]).toBe("/s");
    expect(built.args[2]).toBe("/c");
    expect(built.args[3]).toContain("cd /d");
    expect(built.args[3]).toContain("&& dir");
  });

  it("builds POSIX -ilc argv off Windows", () => {
    if (process.platform === "win32") return;
    const built = buildLoginCommandArgv("npm -v", {
      cwd: "/tmp/project",
      shell: "zsh",
    });
    expect(built.args[0]).toBe("-ilc");
    expect(built.args[1]).toContain("cd ");
    expect(built.args[1]).toContain("npm -v");
  });
});

describe("shellEnv against a login shell that leaks OSC shell-integration noise", () => {
  const originalShell = process.env.SHELL;
  let tmpDir: string | undefined;

  afterEach(async () => {
    if (originalShell === undefined) delete process.env.SHELL;
    else process.env.SHELL = originalShell;
    delete requireShellEnv.cache[shellEnvPath];
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("still resolves a clean npm path and PATH when the shell prints OSC junk before its real output", async () => {
    if (process.platform === "win32") return;

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "omnisync-fakeshell-"));
    const fakeShellPath = path.join(tmpDir, "fake-shell.sh");
    const ESC = "\x1b";
    const BEL = "\x07";
    const oscJunk =
      `${ESC}]1337;RemoteHost=test@host${BEL}` +
      `${ESC}]1337;CurrentDir=/fake/app.asar.unpacked/.next/standalone${BEL}` +
      `${ESC}]1337;ShellIntegrationVersion=14;shell=zsh${BEL}`;
    const script =
      "#!/bin/sh\n" +
      `printf '%s' '${oscJunk}'\n` +
      'if [ "$1" = "-ilc" ]; then eval "$2"; else eval "$1"; fi\n';

    await fs.writeFile(fakeShellPath, script);
    await fs.chmod(fakeShellPath, 0o755);
    process.env.SHELL = fakeShellPath;
    delete requireShellEnv.cache[shellEnvPath];

    const fresh = requireShellEnv(shellEnvPath);

    const pathValue: string = fresh.getLoginShellPath();
    expect(pathValue).not.toMatch(/\x1b/);
    expect(pathValue.split(":").every((part: string) => part.startsWith("/"))).toBe(true);

    const npmPath: string = fresh.resolveCommand("npm");
    expect(npmPath).not.toMatch(/\x1b/);
    expect(npmPath.startsWith("/")).toBe(true);
    expect(npmPath.endsWith("npm")).toBe(true);
  });
});
