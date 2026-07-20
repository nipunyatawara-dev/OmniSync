import { createRequire } from "node:module";
import type { ChildProcess } from "child_process";
import path from "node:path";

type EnvMap = Record<string, string | undefined>;

/** Options for spawnLoginCommand / spawnTool — shell is a preference id, not Node's spawn.shell. */
export type ShellSpawnOptions = {
  cwd?: string;
  env?: EnvMap;
  /** Preference id: powershell | cmd | bash | zsh | fish | sh */
  shell?: string;
};

export type ShellInvocation = {
  id: string;
  kind: "powershell" | "cmd" | "posix";
  executable: string;
};

type ShellEnvModule = {
  getLoginShellPath: () => string;
  augmentProcessEnv: (base?: EnvMap) => NodeJS.ProcessEnv;
  resolveCommand: (name: string) => string;
  spawnLoginCommand: (commandLine: string, options?: ShellSpawnOptions) => ChildProcess;
  spawnTool: (name: string, args: string[], options?: ShellSpawnOptions) => ChildProcess;
  clearShellEnvCache: () => void;
  defaultShellId: () => string;
  resolveShellInvocation: (shellId?: string) => ShellInvocation;
  buildLoginCommandArgv: (
    commandLine: string,
    options?: { cwd?: string; shell?: string }
  ) => { executable: string; args: string[]; windowsHide?: boolean };
};

const requireFromCwd = createRequire(path.join(process.cwd(), "package.json"));

let shellEnvModule: ShellEnvModule | null = null;

function loadShellEnv(): ShellEnvModule {
  if (!shellEnvModule) {
    shellEnvModule = requireFromCwd(path.join(process.cwd(), "shellEnv.js")) as ShellEnvModule;
  }
  return shellEnvModule;
}

export function getLoginShellPath(): string {
  return loadShellEnv().getLoginShellPath();
}

export function augmentProcessEnv(base: EnvMap = process.env): NodeJS.ProcessEnv {
  return loadShellEnv().augmentProcessEnv(base);
}

export function resolveCommand(name: string): string {
  return loadShellEnv().resolveCommand(name);
}

export function spawnLoginCommand(commandLine: string, options: ShellSpawnOptions = {}) {
  return loadShellEnv().spawnLoginCommand(commandLine, options);
}

export function spawnTool(name: string, args: string[], options: ShellSpawnOptions = {}) {
  return loadShellEnv().spawnTool(name, args, options);
}

export function clearShellEnvCache() {
  return loadShellEnv().clearShellEnvCache();
}

export function defaultShellId(): string {
  return loadShellEnv().defaultShellId();
}

export function resolveShellInvocation(shellId?: string): ShellInvocation {
  return loadShellEnv().resolveShellInvocation(shellId);
}

export function buildLoginCommandArgv(
  commandLine: string,
  options: { cwd?: string; shell?: string } = {}
) {
  return loadShellEnv().buildLoginCommandArgv(commandLine, options);
}
