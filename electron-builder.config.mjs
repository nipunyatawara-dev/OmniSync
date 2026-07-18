import pkg from "./package.json" with { type: "json" };

/** @type {import("electron-builder").Configuration} */
export default {
  appId: "com.omnisync.app",
  productName: "OmniSync",
  artifactName: `OmniSync v${pkg.omnisyncRelease}-mac-\${arch}.\${ext}`,
  directories: {
    output: "dist",
  },
  files: [
    "main.js",
    "preload.js",
    "appPort.js",
    "shellEnv.js",
    "package.json",
    "public/**/*",
    ".next/standalone/**/*",
  ],
  asarUnpack: [".next/standalone/**/*"],
  mac: {
    category: "public.app-category.developer-tools",
    icon: "build/icon.icns",
    identity: null,
    target: ["dmg"],
    extendInfo: {
      CFBundleShortVersionString: pkg.omnisyncRelease,
      // electron-builder defaults CFBundleVersion to package.json "version" (0.1.0),
      // which shows up as the parenthetical in macOS About — keep it in sync with the release label.
      CFBundleVersion: pkg.omnisyncRelease,
    },
  },
  dmg: {
    title: `OmniSync ${pkg.omnisyncRelease}`,
    background: "build/dmg/background.png",
    iconSize: 80,
    iconTextSize: 12,
    window: {
      width: 540,
      height: 380,
    },
    contents: [
      { x: 140, y: 220, type: "file" },
      { x: 400, y: 220, type: "link", path: "/Applications" },
    ],
  },
  win: {
    target: ["nsis"],
  },
  linux: {
    target: ["AppImage"],
  },
};
