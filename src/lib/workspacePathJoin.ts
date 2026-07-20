/** Join a parent directory and child name for display / clone targets (browser-safe). */
export function joinWorkspacePath(parent: string, name: string): string {
  const normalized = parent.replace(/[\\/]+$/, "");
  if (!normalized) return name;

  if (/^[A-Za-z]:/.test(normalized) || normalized.startsWith("\\\\")) {
    return `${normalized}\\${name}`;
  }
  return `${normalized}/${name}`;
}

/** Parent directory of a workspace / clone path (handles Windows and POSIX). */
export function parentWorkspacePath(fullPath: string): string {
  const idx = Math.max(fullPath.lastIndexOf("/"), fullPath.lastIndexOf("\\"));
  if (idx < 0) return "";
  if (idx === 0) return fullPath.slice(0, 1);

  // Keep drive root like C:\
  if (/^[A-Za-z]:\\/.test(fullPath) && idx === 2) {
    return fullPath.slice(0, 3);
  }

  return fullPath.slice(0, idx);
}

/** Final path segment (folder / file name) for Windows and POSIX paths. */
export function basenameWorkspacePath(fullPath: string): string {
  const trimmed = String(fullPath || "").replace(/[\\/]+$/, "");
  if (!trimmed) return "";
  const idx = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  if (idx < 0) return trimmed;
  return trimmed.slice(idx + 1) || trimmed;
}

/**
 * Label for UI headers: prefer profile name, but if it looks like a full filesystem
 * path (common Windows bug from split("/") only), show the folder basename.
 */
export function displayWorkspaceName(name?: string, workspacePath?: string): string {
  const candidate = (name || workspacePath || "").trim();
  if (!candidate) return "Untitled workspace";
  if (/^[A-Za-z]:[\\/]/.test(candidate) || candidate.startsWith("\\\\") || /[\\/]/.test(candidate)) {
    return basenameWorkspacePath(candidate) || candidate;
  }
  return candidate;
}
