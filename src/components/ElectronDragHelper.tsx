"use client";

import { useEffect, useState } from "react";

function isMacElectronClient() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  if (!ua.includes("electron")) return false;
  const platform = window.navigator.platform || "";
  return /mac/i.test(platform) || ua.includes("macintosh");
}

/** macOS-only drag region for hiddenInset title bar — must not render on Windows. */
export default function ElectronDragHelper() {
  const [showDragBar, setShowDragBar] = useState(false);

  useEffect(() => {
    if (!isMacElectronClient()) return;
    document.body.classList.add("electron-app");
    setShowDragBar(true);
    return () => {
      document.body.classList.remove("electron-app");
    };
  }, []);

  if (!showDragBar) return null;
  return <div className="electron-drag-bar" />;
}
