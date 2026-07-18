"use client";

import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "omnisync_permissions_dismissed";

type CheckStatus = "checking" | "granted" | "needed" | "unsupported";

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3 4 6v6c0 4.5 3.2 7.9 8 9 4.8-1.1 8-4.5 8-9V6z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Prompts the user for macOS file-system permissions the first time (and on every
 * subsequent launch until granted) they reach the workspace selection screen.
 * Full Disk Access can only ever be toggled by the user in System Settings - Apple
 * gives apps no way to trigger that consent sheet - so we explain why we need it and
 * deep-link straight to the right pane. As a lighter alternative we also offer to
 * request access to just the Documents folder, which is enough for the default
 * "clone into ~/Documents/GitHub" flow and does trigger a native one-time prompt.
 */
function hasPermissionsBridge() {
  return typeof window !== "undefined" && Boolean(window.electron?.checkSystemPermissions);
}

export default function SystemPermissionsPrompt() {
  const [status, setStatus] = useState<CheckStatus>(() =>
    hasPermissionsBridge() ? "checking" : "unsupported"
  );
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "true"
  );
  const [documentsGranted, setDocumentsGranted] = useState(false);
  const [isRequestingDocuments, setIsRequestingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState("");

  const runCheck = useCallback(async () => {
    if (!hasPermissionsBridge()) return;
    try {
      const result = await window.electron!.checkSystemPermissions!();
      setStatus(result.platform !== "darwin" || result.fullDiskAccess ? "granted" : "needed");
    } catch {
      setStatus("unsupported");
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  // Re-check when the user comes back from System Settings, so the prompt clears
  // itself as soon as they flip the toggle without needing to restart the app.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("focus", runCheck);
    return () => window.removeEventListener("focus", runCheck);
  }, [runCheck]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISMISS_KEY, "true");
    }
    setDismissed(true);
  };

  const handleOpenSettings = async () => {
    await window.electron?.openPrivacySettings?.("full-disk-access");
  };

  const handleAllowDocuments = async () => {
    if (!window.electron?.requestFolderAccess) return;
    setIsRequestingDocuments(true);
    setDocumentsError("");
    try {
      const result = await window.electron.requestFolderAccess("Documents");
      if (result.granted) {
        setDocumentsGranted(true);
      } else {
        setDocumentsError(
          "Access wasn't granted. If you previously denied it, open System Settings to allow it manually."
        );
      }
    } finally {
      setIsRequestingDocuments(false);
    }
  };

  if (status !== "needed" || dismissed) return null;

  return (
    <div
      className="gh-connect-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perm-prompt-title"
    >
      <div className="gh-connect-card animate-fade-slide perm-prompt-card">
        <button
          type="button"
          className="gh-connect-close"
          onClick={handleDismiss}
          aria-label="Not now"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        <header className="gh-connect-header">
          <div className="gh-connect-brand perm-prompt-brand">
            <ShieldIcon />
          </div>
          <div>
            <h2 id="perm-prompt-title" className="gh-connect-title">
              Grant file access
            </h2>
            <p className="gh-connect-subtitle">
              OmniSync needs permission to read and write files before it can manage your projects.
            </p>
          </div>
        </header>

        <div className="perm-prompt-body">
          <ul className="perm-prompt-reasons">
            <li>
              Cloned repositories are created in <code>~/Documents/GitHub</code> by default.
            </li>
            <li>
              Running <code>npm install</code>, <code>git</code>, and dev servers requires reading and
              writing files anywhere inside the workspace you choose.
            </li>
            <li>
              Without access, macOS silently blocks these operations with confusing &ldquo;permission
              denied&rdquo; or &ldquo;no such file or directory&rdquo; errors.
            </li>
          </ul>

          <button type="button" className="perm-prompt-primary-btn" onClick={handleOpenSettings}>
            Open System Settings → Full Disk Access
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17 17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="perm-prompt-hint">
            Turn on the toggle next to OmniSync, then come back to this window - we&rsquo;ll pick it up
            automatically.
          </p>

          <div className="perm-prompt-divider">
            <span>or</span>
          </div>

          {documentsGranted ? (
            <p className="perm-prompt-success">Documents folder access granted.</p>
          ) : (
            <>
              <button
                type="button"
                className="perm-prompt-secondary-btn"
                onClick={handleAllowDocuments}
                disabled={isRequestingDocuments}
              >
                {isRequestingDocuments ? "Requesting…" : "Just allow the Documents folder"}
              </button>
              {documentsError && <p className="perm-prompt-error">{documentsError}</p>}
            </>
          )}
        </div>

        <footer className="gh-connect-footer perm-prompt-footer">
          <p>We&rsquo;ll ask again next time you open OmniSync until access is granted.</p>
        </footer>
      </div>
    </div>
  );
}
