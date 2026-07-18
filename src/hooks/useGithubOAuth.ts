"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BUNDLED_GITHUB_OAUTH_CLIENT_ID } from "@/lib/githubOAuthConstants";

export type OAuthState = "idle" | "authorizing" | "success";

export interface OAuthSuccessData {
  username: string;
  avatarUrl?: string;
}

interface UseGithubOAuthOptions {
  onAuthSuccess: (data: OAuthSuccessData) => void | Promise<void>;
}

async function readJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(
      res.ok
        ? "Server returned an invalid response."
        : `Server error (${res.status}). ${text.slice(0, 120).trim() || "No details."}`
    );
  }
}

export function useGithubOAuth({ onAuthSuccess }: UseGithubOAuthOptions) {
  const [isOAuthModalOpen, setIsOAuthModalOpen] = useState(false);
  const [oauthState, setOauthState] = useState<OAuthState>("idle");
  const [oauthStatusText, setOauthStatusText] = useState("");
  // Bundled public OmniSync GitHub app — Sign in works without a custom Client ID.
  const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(true);
  const [githubClientId, setGithubClientId] = useState(BUNDLED_GITHUB_OAUTH_CLIENT_ID);
  const [showOauthConfigForm, setShowOauthConfigForm] = useState(false);
  const [inputClientId, setInputClientId] = useState("");
  const [isSavingOauthConfig, setIsSavingOauthConfig] = useState(false);
  const [oauthConfigError, setOauthConfigError] = useState("");
  const [userCode, setUserCode] = useState("");
  const [verificationUri, setVerificationUri] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const modalOpenRef = useRef(false);
  const onAuthSuccessRef = useRef(onAuthSuccess);

  useEffect(() => {
    modalOpenRef.current = isOAuthModalOpen;
  }, [isOAuthModalOpen]);

  useEffect(() => {
    onAuthSuccessRef.current = onAuthSuccess;
  }, [onAuthSuccess]);

  const checkOauthConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/config");
      const data = await readJsonResponse(res);
      const clientId =
        (typeof data.clientId === "string" && data.clientId) || BUNDLED_GITHUB_OAUTH_CLIENT_ID;
      // hasConfig is true whenever a client ID is available (saved, env, or bundled).
      setOauthConfigured(data.hasConfig !== false && !!clientId);
      setGithubClientId(clientId);
    } catch {
      // Keep the baked-in public app so Sign in still works if config API fails.
      setOauthConfigured(true);
      setGithubClientId(BUNDLED_GITHUB_OAUTH_CLIENT_ID);
    }
  }, []);

  const startDevicePoll = useCallback((devCode: string, intervalSeconds: number) => {
    let active = true;

    const checkStatus = async () => {
      if (!active || !modalOpenRef.current) {
        active = false;
        return;
      }
      try {
        const res = await fetch("/api/auth/device/poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceCode: devCode }),
        });
        const data = await readJsonResponse(res);

        if (data.status === "success") {
          active = false;
          setOauthStatusText("Signed in — preparing your workspace…");
          setOauthState("success");

          await onAuthSuccessRef.current({
            username: typeof data.username === "string" ? data.username : "",
            avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl : "",
          });

          await new Promise((resolve) => setTimeout(resolve, 1400));
          setIsOAuthModalOpen(false);
          setOauthState("idle");
        } else if (data.status === "error") {
          active = false;
          setOauthState("idle");
          setIsOAuthModalOpen(false);
          alert(
            `Authentication error: ${typeof data.error === "string" ? data.error : "Unknown error"}`
          );
        } else {
          setTimeout(checkStatus, intervalSeconds * 1000);
        }
      } catch (err) {
        console.error("Polling error", err);
        setTimeout(checkStatus, intervalSeconds * 1000);
      }
    };

    setTimeout(checkStatus, intervalSeconds * 1000);
  }, []);

  const triggerGitHubDeviceFlow = useCallback(async () => {
    setIsOAuthModalOpen(true);
    setOauthState("authorizing");
    setOauthStatusText("Requesting authorization codes from GitHub...");
    setUserCode("");
    setVerificationUri("");

    try {
      const res = await fetch("/api/auth/device/code", { method: "POST" });
      const data = await readJsonResponse(res);

      if (data.error) {
        throw new Error(typeof data.error === "string" ? data.error : "Device flow failed");
      }

      setUserCode(typeof data.userCode === "string" ? data.userCode : "");
      setVerificationUri(typeof data.verificationUri === "string" ? data.verificationUri : "");
      setOauthStatusText("Waiting for authorization on GitHub...");

      startDevicePoll(
        typeof data.deviceCode === "string" ? data.deviceCode : "",
        typeof data.interval === "number" ? data.interval : 5
      );
    } catch (err: unknown) {
      setOauthState("idle");
      setIsOAuthModalOpen(false);
      alert(`Failed to start GitHub Device Flow: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [startDevicePoll]);

  const handleSaveOauthConfig = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputClientId) {
        setOauthConfigError("Client ID is required.");
        return;
      }

      setIsSavingOauthConfig(true);
      setOauthConfigError("");

      try {
        const res = await fetch("/api/auth/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: inputClientId, clientSecret: "device_flow_public" }),
        });
        const data = await readJsonResponse(res);
        if (data.success) {
          setOauthConfigured(true);
          setGithubClientId(inputClientId);
          setShowOauthConfigForm(false);
          triggerGitHubDeviceFlow();
        } else {
          setOauthConfigError(
            typeof data.error === "string" ? data.error : "Failed to save configuration."
          );
        }
      } catch (err: unknown) {
        setOauthConfigError(err instanceof Error ? err.message : "Error saving Client ID.");
      } finally {
        setIsSavingOauthConfig(false);
      }
    },
    [inputClientId, triggerGitHubDeviceFlow]
  );

  const handleGitHubSignIn = useCallback(() => {
    // Always start Device Flow — server resolves saved/env/bundled Client ID.
    // Custom Client ID is optional via "Configure Custom GitHub OAuth App".
    setShowOauthConfigForm(false);
    triggerGitHubDeviceFlow();
  }, [triggerGitHubDeviceFlow]);

  const copyUserCode = useCallback(() => {
    navigator.clipboard.writeText(userCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  }, [userCode]);

  const closeOAuthModal = useCallback(() => {
    setIsOAuthModalOpen(false);
    setOauthState("idle");
  }, []);

  return {
    isOAuthModalOpen,
    oauthState,
    oauthStatusText,
    oauthConfigured,
    githubClientId,
    showOauthConfigForm,
    setShowOauthConfigForm,
    inputClientId,
    setInputClientId,
    isSavingOauthConfig,
    oauthConfigError,
    setOauthConfigError,
    userCode,
    verificationUri,
    copiedCode,
    checkOauthConfig,
    handleSaveOauthConfig,
    triggerGitHubDeviceFlow,
    handleGitHubSignIn,
    copyUserCode,
    closeOAuthModal,
  };
}
