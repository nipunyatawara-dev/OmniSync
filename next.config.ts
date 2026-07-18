import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Dynamic cwd/fs usage in API routes can make NFT trace the whole repo.
  // Keep packaging lean — never ship prior DMGs, coverage, or source trees.
  outputFileTracingExcludes: {
    "*": [
      "./dist/**/*",
      "./build/**/*",
      "./coverage/**/*",
      "./e2e/**/*",
      "./test-results/**/*",
      "./User data/**/*",
      "./.git/**/*",
      "./.cursor/**/*",
      "./src/**/*",
      "./scripts/**/*",
      "./public/**/*",
      "./node_modules/electron/**/*",
      "./node_modules/electron-builder/**/*",
      "./node_modules/playwright/**/*",
      "./node_modules/@playwright/**/*",
      "./node_modules/vitest/**/*",
      "./node_modules/@vitest/**/*",
    ],
  },
};

export default nextConfig;
