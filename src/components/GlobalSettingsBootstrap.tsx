"use client";

import { useEffect } from "react";
import { applyAccentTheme } from "@/lib/accentTheme";
import type { AccentColor } from "@/lib/globalSettings";

/** Loads persisted global settings on app boot and applies client-side theme tokens. */
export default function GlobalSettingsBootstrap() {
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.settings) return;

        const accent = (data.settings.accentColor || "default") as AccentColor;
        applyAccentTheme(accent);

        // Keep localStorage in sync for offline / instant reads in setup UI
        localStorage.setItem("omnisync_global_git_username", data.settings.gitUsername || "");
        localStorage.setItem("omnisync_global_git_email", data.settings.gitEmail || "");
        localStorage.setItem("omnisync_global_default_branch", data.settings.defaultBranch || "main");
        localStorage.setItem("omnisync_global_auto_fetch_interval", data.settings.autoFetchInterval || "5");
        localStorage.setItem("omnisync_global_terminal_shell", data.settings.terminalShell || "zsh");
        localStorage.setItem("omnisync_global_show_hidden", String(!!data.settings.showHiddenFiles));
        localStorage.setItem("omnisync_global_telemetry", String(data.settings.enableTelemetry !== false));
        localStorage.setItem("omnisync_global_accent", accent);
      } catch {
        // Fall back to cached accent if API unavailable
        const cached = localStorage.getItem("omnisync_global_accent") as AccentColor | null;
        if (cached) applyAccentTheme(cached);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
