#!/usr/bin/env node
/**
 * Generates packaging icons from the committed branding asset at public/icon.png.
 * - macOS: build/icon.icns via sips + iconutil
 * - all platforms: build/icon.ico via png-to-ico (needed for Windows NSIS)
 * Never overwrites public/icon.png.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pngPath = path.join(root, "public", "icon.png");
const icnsPath = path.join(root, "build", "icon.icns");
const icoPath = path.join(root, "build", "icon.ico");
const iconsetDir = path.join(root, "build", "icon.iconset");

if (!fs.existsSync(pngPath)) {
  console.error("Missing public/icon.png — add the app branding icon before packaging.");
  process.exit(1);
}

fs.mkdirSync(path.join(root, "build"), { recursive: true });

async function generateIco() {
  const buf = await pngToIco(pngPath);
  fs.writeFileSync(icoPath, buf);
  console.log("Wrote", path.relative(root, icoPath));
}

function generateIcns() {
  if (process.platform !== "darwin") {
    console.warn("Skipping build/icon.icns generation (macOS iconutil unavailable).");
    return;
  }

  try {
    execSync("which sips iconutil", { stdio: "ignore" });
    fs.rmSync(iconsetDir, { recursive: true, force: true });
    fs.mkdirSync(iconsetDir, { recursive: true });

    const sizes = [
      [16, "16x16"],
      [32, "16x16@2x"],
      [32, "32x32"],
      [64, "32x32@2x"],
      [128, "128x128"],
      [256, "128x128@2x"],
      [256, "256x256"],
      [512, "256x256@2x"],
      [512, "512x512"],
      [1024, "512x512@2x"],
    ];

    for (const [size, name] of sizes) {
      const out = path.join(iconsetDir, `icon_${name}.png`);
      execSync(`sips -z ${size} ${size} "${pngPath}" --out "${out}"`, { stdio: "ignore" });
    }

    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, { stdio: "ignore" });
    fs.rmSync(iconsetDir, { recursive: true, force: true });
    console.log("Wrote", path.relative(root, icnsPath));
  } catch (err) {
    console.error("Could not generate build/icon.icns:", err.message);
    process.exit(1);
  }
}

try {
  await generateIco();
  generateIcns();
} catch (err) {
  console.error("Could not generate packaging icons:", err.message);
  process.exit(1);
}
