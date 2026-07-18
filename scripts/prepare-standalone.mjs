import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { cpSync, mkdirSync, rmSync } from "fs";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standalone, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDest = path.join(standalone, "public");
const shellEnvSrc = path.join(root, "shellEnv.js");
const shellEnvDest = path.join(standalone, "shellEnv.js");

/** Paths that NFT sometimes copies into standalone but must never ship. */
const PRUNE = [
  "dist",
  "build",
  "coverage",
  "e2e",
  "test-results",
  "User data",
  "src",
  "scripts",
  ".git",
  ".cursor",
  ".vscode",
  ".idea",
  "README.md",
  "CHANGELOG.md",
  "AGENTS.md",
  "CLAUDE.md",
  "Antigravity.md",
  "CODEX.md",
  "GEMINI.md",
  "tsconfig.tsbuildinfo",
  "vitest.config.ts",
  "playwright.config.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "next.config.ts",
  "electron-builder.config.mjs",
  "package-lock.json",
];

if (!fs.existsSync(standalone)) {
  console.error('Missing .next/standalone — ensure next.config.ts sets output: "standalone"');
  process.exit(1);
}

for (const name of PRUNE) {
  const target = path.join(standalone, name);
  if (fs.existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
    console.log(`Pruned from standalone: ${name}`);
  }
}

mkdirSync(path.join(standalone, ".next"), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });
cpSync(publicSrc, publicDest, { recursive: true });
cpSync(shellEnvSrc, shellEnvDest);

// Turbopack standalone NFT often omits App Route runtimes (e.g.
// app-route-turbo.runtime.prod.js). Without them, every /api/* route returns
// a bare 500 "Internal Server Error" in the packaged Electron app.
const nextServerSrc = path.join(root, "node_modules", "next", "dist", "compiled", "next-server");
const nextServerDest = path.join(
  standalone,
  "node_modules",
  "next",
  "dist",
  "compiled",
  "next-server"
);
if (!fs.existsSync(nextServerSrc)) {
  console.error(`Missing Next.js runtimes at ${nextServerSrc}`);
  process.exit(1);
}
mkdirSync(nextServerDest, { recursive: true });
let copiedRuntimes = 0;
for (const name of fs.readdirSync(nextServerSrc)) {
  if (!name.endsWith(".runtime.prod.js")) continue;
  cpSync(path.join(nextServerSrc, name), path.join(nextServerDest, name));
  copiedRuntimes += 1;
}
if (copiedRuntimes === 0) {
  console.error("No Next.js *.runtime.prod.js files found to copy into standalone");
  process.exit(1);
}
console.log(`Ensured ${copiedRuntimes} Next.js server runtimes in standalone`);

try {
  const out = execSync(`du -sh "${standalone}"`, { encoding: "utf8" }).trim();
  console.log(`Standalone ready: ${out}`);
} catch {
  console.log("Standalone prepare complete.");
}
