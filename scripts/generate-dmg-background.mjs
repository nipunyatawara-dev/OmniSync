#!/usr/bin/env node
/**
 * Generates build/dmg/background.png (+ @2x) via the Swift/AppKit renderer.
 * Skips gracefully on non-macOS hosts.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "build", "dmg");
const swiftScript = path.join(__dirname, "generate-dmg-background.swift");

if (process.platform !== "darwin") {
  console.warn("Skipping DMG background generation (macOS only).");
  process.exit(0);
}

if (!fs.existsSync(swiftScript)) {
  console.error("Missing scripts/generate-dmg-background.swift");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

try {
  execSync(`swift "${swiftScript}" "${outDir}"`, {
    cwd: root,
    stdio: "inherit",
  });
} catch (err) {
  console.error("Could not generate DMG background:", err.message);
  process.exit(1);
}
