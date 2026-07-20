import { ChildProcess } from "child_process";
import path from "path";
import os from "os";
import { spawnLoginCommand } from "@/lib/shellEnv";
import { stripTerminalEscapeSequences } from "@/lib/npmInstall";
import { buildWorkspaceChildEnv } from "@/lib/workspaceProcessEnv";
import type { WorkspaceEnvMode } from "@/lib/workspaceProcessEnv";
import type { TerminalLine, TerminalLineKind } from "@/lib/dashboardTerminalTypes";
import { defaultTerminalShell, terminalPromptSuffix } from "@/lib/globalSettingsTypes";

export type { TerminalLine, TerminalLineKind } from "@/lib/dashboardTerminalTypes";

/** NODE_ENV for free-form terminal: only set when the command clearly needs it. */
export function terminalEnvModeForCommand(command: string): WorkspaceEnvMode {
  const cmd = command.toLowerCase();
  if ((/\bdev\b/.test(cmd) || cmd.includes("next dev")) && !/\bstart\b/.test(cmd)) {
    return "development";
  }
  if (/\bstart\b/.test(cmd) || cmd.includes("next start") || cmd.includes("run preview")) {
    return "production";
  }
  return "inherit";
}

interface TerminalState {
  lines: TerminalLine[];
  nextId: number;
  manualProcess: ChildProcess | null;
  isManualRunning: boolean;
  prompt: string;
  promptSuffix: string;
  shell: string;
}

const MAX_LINES = 5000;

const globalRef = global as typeof globalThis & { dashboardTerminalState?: TerminalState };

if (!globalRef.dashboardTerminalState) {
  const shell = defaultTerminalShell();
  globalRef.dashboardTerminalState = {
    lines: [],
    nextId: 1,
    manualProcess: null,
    isManualRunning: false,
    prompt: "user@localhost workspace",
    promptSuffix: terminalPromptSuffix(shell),
    shell,
  };
}

const state = globalRef.dashboardTerminalState;

export function buildTerminalPrompt(workspacePath: string): string {
  let username = "user";
  try {
    username = os.userInfo().username;
  } catch {
    username = process.env.USER || process.env.USERNAME || "user";
  }

  let hostname = "localhost";
  try {
    hostname = os.hostname().replace(/\.local$/, "");
  } catch {}

  const folder = path.basename(workspacePath) || "workspace";
  return `${username}@${hostname} ${folder}`;
}

export function setTerminalPrompt(prompt: string) {
  state.prompt = prompt;
}

export function setTerminalShell(shell: string) {
  state.shell = shell || defaultTerminalShell();
  state.promptSuffix = terminalPromptSuffix(state.shell);
}

export function getTerminalPrompt(): string {
  return state.prompt;
}

export function getTerminalPromptSuffix(): string {
  return state.promptSuffix;
}

export function appendTerminalLine(text: string, kind: TerminalLineKind = "output") {
  const clean = stripTerminalEscapeSequences(text).replace(/\r$/, "");
  if (!clean && kind === "output") return;

  state.lines.push({
    id: state.nextId++,
    text: clean,
    kind,
  });

  if (state.lines.length > MAX_LINES) {
    state.lines.splice(0, state.lines.length - MAX_LINES);
  }
}

export function logTerminalCommand(command: string, source = "omnisync") {
  appendTerminalLine(`── ${source} ──`, "system");
  appendTerminalLine(`${state.prompt} ${state.promptSuffix} ${command}`, "command");
}

export function clearTerminal() {
  state.lines = [];
}

export function getTerminalSnapshot(sinceId = 0) {
  const lines = sinceId > 0 ? state.lines.filter((line) => line.id > sinceId) : state.lines;
  return {
    lines,
    prompt: state.prompt,
    promptSuffix: state.promptSuffix,
    shell: state.shell,
    isManualRunning: state.isManualRunning,
    lastId: state.lines.length > 0 ? state.lines[state.lines.length - 1].id : 0,
  };
}

function splitProcessLines(text: string): string[] {
  return text.split(/\r?\n/);
}

export async function runManualTerminalCommand(
  cwd: string,
  command: string,
  shell?: string
): Promise<number> {
  if (state.isManualRunning) {
    appendTerminalLine("Another command is still running. Wait for it to finish.", "error");
    return 1;
  }

  const trimmed = command.trim();
  if (!trimmed) return 0;

  if (shell) setTerminalShell(shell);

  logTerminalCommand(trimmed, "manual");
  state.isManualRunning = true;

  return new Promise((resolve) => {
    const child = spawnLoginCommand(trimmed, {
      cwd,
      shell: state.shell,
      env: buildWorkspaceChildEnv(cwd, {
        mode: terminalEnvModeForCommand(trimmed),
      }),
    });

    state.manualProcess = child;

    const handleChunk = (data: Buffer, isError: boolean) => {
      splitProcessLines(data.toString()).forEach((line) => {
        if (line.trim()) {
          appendTerminalLine(line, isError ? "error" : "output");
        }
      });
    };

    child.stdout?.on("data", (data) => handleChunk(data, false));
    child.stderr?.on("data", (data) => handleChunk(data, true));

    child.on("error", (err) => {
      appendTerminalLine(`Failed to start command: ${err.message}`, "error");
      state.isManualRunning = false;
      state.manualProcess = null;
      resolve(1);
    });

    child.on("close", (code) => {
      appendTerminalLine(
        `Process exited with code ${code ?? 0}`,
        code === 0 || code === null ? "system" : "error"
      );
      state.isManualRunning = false;
      state.manualProcess = null;
      resolve(code ?? 1);
    });
  });
}
