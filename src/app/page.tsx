"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter as useAppRouter } from "next/navigation";
import FileTree, { FileNode } from "@/components/FileTree";
import CodeViewer from "@/components/CodeViewer";
import DiffViewer from "@/components/DiffViewer";
import ConflictResolver from "@/components/ConflictResolver";
import { UserProfile } from "@/lib/profiles";
import { RunnerStatus } from "@/lib/runner";

interface SyncStatus {
  ahead: number;
  behind: number;
  upstream: string;
}

interface DiagnosticDetails {
  nodeVersion: string;
  npmVersion: string;
  enginesNode: string;
  isNodeCompatible: boolean;
  packageJsonExists: boolean;
  totalDependencies: number;
  missingDependencies: string[];
  gitStatus: string;
}

export default function DashboardPage() {
  const router = useAppRouter();
  const [activeTab, setActiveTab] = useState<"workspace" | "git" | "diagnostics">("workspace");
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Workspace state
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState("main");
  const [isChangingBranch, setIsChangingBranch] = useState(false);

  // Runner state
  const [runnerStatus, setRunnerStatus] = useState<RunnerStatus>({ status: "stopped", pid: null });
  const [runnerLogs, setRunnerLogs] = useState<string[]>([]);
  const [isRunnerLoading, setIsRunnerLoading] = useState(false);

  // Git Collaboration state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ ahead: 0, behind: 0, upstream: "" });
  const [conflictFiles, setConflictFiles] = useState<string[]>([]);
  const [selectedConflictFile, setSelectedConflictFile] = useState<string | null>(null);

  // Diagnostics state
  const [diagData, setDiagData] = useState<DiagnosticDetails | null>(null);
  const [isDiagLoading, setIsDiagLoading] = useState(false);
  const [actionOutput, setActionOutput] = useState<{ success: boolean; output: string } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Polling ref for logs
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Declaring functions before useEffect to avoid hoisting issues
  const loadWorkspaceFiles = async () => {
    try {
      const res = await fetch("/api/workspace/files");
      const data = await res.json();
      setFileTree((data.tree as FileNode[]) || []);
    } catch {}
  };

  const loadGitBranches = async () => {
    try {
      const res = await fetch("/api/workspace/git?action=branches");
      const data = await res.json();
      setBranches((data.branches as string[]) || ["main"]);
      setCurrentBranch(data.current || "main");
    } catch {}
  };

  const loadGitSyncStatus = async () => {
    try {
      const res = await fetch("/api/workspace/git?action=status");
      const data = await res.json();
      setSyncStatus((data.sync as SyncStatus) || { ahead: 0, behind: 0, upstream: "" });
    } catch {}
  };

  const loadConflictFiles = async () => {
    try {
      const res = await fetch("/api/workspace/git?action=conflicts");
      const data = await res.json();
      setConflictFiles((data.conflicts as string[]) || []);
    } catch {}
  };

  const loadDiagnostics = async () => {
    Promise.resolve().then(() => {
      setIsDiagLoading(true);
      setActionOutput(null);
    });
    try {
      const res = await fetch("/api/workspace/diagnostics");
      const data = await res.json();
      setDiagData(data as DiagnosticDetails);
    } catch {} finally {
      setIsDiagLoading(false);
    }
  };

  // 1. Fetch Profile details first
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profiles");
        const data = await res.json();
        if (!data.activeProfileId || data.profiles.length === 0) {
          router.push("/setup");
          return;
        }
        const active = (data.profiles as UserProfile[]).find((p) => p.id === data.activeProfileId);
        if (!active || !active.workspacePath) {
          router.push("/setup");
          return;
        }
        setActiveProfile(active);
      } catch {
        router.push("/setup");
      } finally {
        setIsLoadingProfile(false);
      }
    }
    loadProfile();
  }, [router]);

  // 2. Load Workspace details once profile is loaded
  useEffect(() => {
    if (!activeProfile) return;

    Promise.resolve().then(() => {
      loadWorkspaceFiles();
      loadGitBranches();
      loadGitSyncStatus();
      loadConflictFiles();
    });
  }, [activeProfile]);

  // 3. Poll runner logs and status while running
  useEffect(() => {
    async function checkRunner() {
      try {
        const res = await fetch("/api/workspace/runner");
        const data = await res.json();
        if (data && data.status) {
          setRunnerStatus(data.status as RunnerStatus);
        }
        if (data && data.logs) {
          setRunnerLogs((data.logs as string[]) || []);
        }
      } catch {}
    }

    checkRunner();
    
    pollIntervalRef.current = setInterval(checkRunner, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // 4. Load selected file content
  useEffect(() => {
    if (!selectedFile) {
      Promise.resolve().then(() => {
        setFileContent("");
      });
      return;
    }

    async function loadFileContent() {
      setIsFileLoading(true);
      try {
        const res = await fetch(`/api/workspace/file-content?file=${encodeURIComponent(selectedFile!)}`);
        const data = await res.json();
        if (data.error) {
          setFileContent(`Error loading file: ${data.error}`);
        } else {
          setFileContent(data.content || "");
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setFileContent(`Error loading file: ${msg}`);
      } finally {
        setIsFileLoading(false);
      }
    }
    loadFileContent();
  }, [selectedFile]);

  // Handle Tab Change side-effects
  useEffect(() => {
    if (activeTab === "diagnostics") {
      Promise.resolve().then(() => {
        loadDiagnostics();
      });
    }
  }, [activeTab]);

  const handleBranchChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branch = e.target.value;
    setIsChangingBranch(true);
    try {
      const res = await fetch("/api/workspace/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch-branch", branch }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentBranch(data.current);
        loadWorkspaceFiles();
        setSelectedFile(null);
      } else {
        alert(`Failed to switch branch: ${data.error}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Error switching branch: ${msg}`);
    } finally {
      setIsChangingBranch(false);
    }
  };

  // Spawning development servers
  const handleToggleRunner = async () => {
    setIsRunnerLoading(true);
    const action = runnerStatus?.status === "running" || runnerStatus?.status === "starting" ? "stop" : "start";
    try {
      const res = await fetch("/api/workspace/runner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data && data.success && data.status) {
        setRunnerStatus(data.status as RunnerStatus);
      }
    } catch {} finally {
      setIsRunnerLoading(false);
    }
  };

  // Run diagnostics maintenance tasks
  const handleMaintenanceAction = async (action: string) => {
    setIsActionLoading(true);
    setActionOutput(null);
    try {
      const res = await fetch("/api/workspace/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setActionOutput(data as { success: boolean; output: string });
      loadDiagnostics();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setActionOutput({ success: false, output: msg });
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "var(--color-bg-default)" }}>
        <div className="spinner" style={{ width: "32px", height: "32px" }}></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Banner Header */}
      <header className="header">
        <div className="header-brand">
          <svg height="20" viewBox="0 0 16 16" version="1.1" width="20" fill="var(--color-header-text)">
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 2.69.91 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
          </svg>
          <span style={{ fontSize: "14px", fontWeight: "600" }}>OmniSync Workspace</span>
          <span className="badge badge-info" style={{ fontSize: "10px", marginLeft: "4px" }}>
            {activeProfile?.workspaceType === "automatic" ? "Auto Setup" : "Manual Repo"}
          </span>
        </div>

        {/* Profile Card Header Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600, color: "var(--color-header-text)" }}>{activeProfile?.name}</div>
            <div style={{ fontSize: "11px", color: "var(--color-fg-muted)" }}>{activeProfile?.profession}</div>
          </div>
          
          <button className="btn btn-sm" onClick={async () => {
            await fetch("/api/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "select", id: null }) });
            router.push("/setup");
          }}>
            Log Out
          </button>
        </div>
      </header>

      {/* Main Core Layout */}
      <div className="main-layout">
        {/* Leftmost Sidebar tabs */}
        <nav className="sidebar">
          <button
            onClick={() => setActiveTab("workspace")}
            className={`sidebar-btn ${activeTab === "workspace" ? "active" : ""}`}
            title="Code Workspace"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.72 3.22a.75.75 0 011.06 1.06L2.06 8l3.72 3.72a.75.75 0 11-1.06 1.06L.47 8.53a.75.75 0 010-1.06l4.25-4.25zm6.56 0a.75.75 0 10-1.06 1.06L13.94 8l-3.72 3.72a.75.75 0 101.06 1.06l4.25-4.25a.75.75 0 000-1.06l-4.25-4.25z"></path>
            </svg>
          </button>

          <button
            onClick={() => setActiveTab("git")}
            className={`sidebar-btn ${activeTab === "git" ? "active" : ""}`}
            title="Git Collaboration & Merges"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.292a.25.25 0 01-.427.177L7.177 2.927a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-1.5.75a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm1.5 8.25a.75.75 0 100 1.5.75.75 0 000-1.5zm-1.5.75a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm9.5-6.5a.75.75 0 100-1.5.75.75 0 000 1.5zM10.25 4a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"></path>
              <path d="M3.75 4v8m8-3.5v-3"></path>
            </svg>
          </button>

          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`sidebar-btn ${activeTab === "diagnostics" ? "active" : ""}`}
            title="Diagnostics Dashboard"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.5 0A1.5 1.5 0 000 1.5v13A1.5 1.5 0 001.5 16h13a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0014.5 0h-13zM1 1.5a.5.5 0 01.5-.5h13a.5.5 0 01.5.5v13a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-13zM6.5 3.75A.75.75 0 017 4.5v3.25h2.25a.75.75 0 010 1.5H6.25a.75.75 0 01-.75-.75V4.5a.75.75 0 011-1.25z"></path>
            </svg>
          </button>
        </nav>

        {/* Tab views switcher panels */}
        <main className="content-pane">
          {/* TAB 1: CODE WORKSPACE VIEW */}
          {activeTab === "workspace" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              {/* Top Control Bar */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 16px",
                borderBottom: "1px solid var(--color-border-default)",
                backgroundColor: "var(--color-bg-subtle)",
                flexShrink: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    onClick={handleToggleRunner}
                    disabled={isRunnerLoading}
                    className={`btn ${runnerStatus?.status === "running" || runnerStatus?.status === "starting" ? "btn-danger" : "btn-primary"}`}
                    style={{ minWidth: "120px" }}
                  >
                    {isRunnerLoading ? (
                      <div className="spinner" style={{ width: "12px", height: "12px" }}></div>
                    ) : runnerStatus?.status === "running" || runnerStatus?.status === "starting" ? (
                      <>
                        <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "white", marginRight: "4px" }}></span>
                        Stop Server
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: "4px" }}>
                          <path d="M8 0a8 8 0 110 16A8 8 0 018 0zM4.5 5.5v5l5-2.5-5-2.5z"></path>
                        </svg>
                        Run Server
                      </>
                    )}
                  </button>

                  <div style={{ fontSize: "12px", color: "var(--color-fg-muted)" }}>
                    {runnerStatus?.status === "running" && <span style={{ color: "var(--color-success-fg)", fontWeight: 600 }}>Active (PID: {runnerStatus?.pid})</span>}
                    {runnerStatus?.status === "starting" && <span style={{ color: "var(--color-attention-fg)" }}>Starting...</span>}
                    {runnerStatus?.status === "stopped" && <span>Dev Server Stopped</span>}
                    {runnerStatus?.status === "error" && <span style={{ color: "var(--color-danger-fg)" }}>Error: {runnerStatus?.error}</span>}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-fg-muted)" }}>Active Branch:</span>
                  <select
                    className="form-control"
                    style={{ width: "150px", padding: "3px 8px", fontSize: "13px" }}
                    value={currentBranch}
                    onChange={handleBranchChange}
                    disabled={isChangingBranch}
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Three Column View */}
              <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                {/* Column 1: Left file tree */}
                <div style={{
                  width: "240px",
                  borderRight: "1px solid var(--color-border-default)",
                  backgroundColor: "var(--color-bg-subtle)",
                  overflowY: "auto",
                }}>
                  <div style={{ padding: "12px 16px 4px 16px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "var(--color-fg-muted)" }}>
                    Workspace Files
                  </div>
                  <FileTree
                    tree={fileTree}
                    selectedFile={selectedFile}
                    onSelectFile={(f) => {
                      setSelectedConflictFile(null);
                      setSelectedFile(f);
                    }}
                  />
                </div>

                {/* Column 2: Code Viewer */}
                <div style={{ flex: 2, borderRight: "1px solid var(--color-border-default)", overflow: "hidden" }}>
                  <CodeViewer
                    filePath={selectedFile || ""}
                    content={fileContent}
                    isLoading={isFileLoading}
                  />
                </div>

                {/* Column 3: Commit Diff history */}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <DiffViewer selectedFile={selectedFile} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GIT COLLABORATION AND CONFLICTS PANEL */}
          {activeTab === "git" && (
            <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
              <div style={{
                width: "280px",
                borderRight: "1px solid var(--color-border-default)",
                backgroundColor: "var(--color-bg-subtle)",
                padding: "16px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}>
                <div>
                  <h3 style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "var(--color-fg-muted)", marginBottom: "8px" }}>
                    Synchronization Status
                  </h3>
                  <div className="card" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                    <div>Active upstream: <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>{syncStatus.upstream || "no upstream"}</span></div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <span className={`badge ${syncStatus.ahead > 0 ? "badge-warning" : ""}`}>
                        {syncStatus.ahead} commits ahead
                      </span>
                      <span className={`badge ${syncStatus.behind > 0 ? "badge-danger" : ""}`}>
                        {syncStatus.behind} commits behind
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "var(--color-fg-muted)", marginBottom: "8px" }}>
                    Active Branches
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {branches.map((b) => (
                      <div
                        key={b}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          backgroundColor: currentBranch === b ? "var(--color-accent-bg)" : "transparent",
                          border: `1px solid ${currentBranch === b ? "var(--color-accent-border)" : "transparent"}`,
                          fontWeight: currentBranch === b ? 600 : "normal",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{b}</span>
                        {currentBranch === b && <span className="badge badge-success" style={{ fontSize: "9px", padding: "1px 4px" }}>Active</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "var(--color-fg-muted)", marginBottom: "8px" }}>
                    Active Merge Conflicts
                  </h3>
                  {conflictFiles.length === 0 ? (
                    <div style={{
                      padding: "12px",
                      borderRadius: "6px",
                      backgroundColor: "var(--color-success-bg)",
                      color: "var(--color-success-fg)",
                      border: "1px solid var(--color-success-border)",
                      fontSize: "12px",
                    }}>
                      No merge conflicts detected in this repository.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {conflictFiles.map((file) => (
                        <div
                          key={file}
                          onClick={() => setSelectedConflictFile(file)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            border: `1px solid ${selectedConflictFile === file ? "var(--color-danger-border)" : "var(--color-border-default)"}`,
                            backgroundColor: selectedConflictFile === file ? "var(--color-danger-bg)" : "var(--color-bg-overlay)",
                            color: selectedConflictFile === file ? "var(--color-danger-fg)" : "var(--color-fg-default)",
                            cursor: "pointer",
                            transition: "all 0.1s",
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{file.split("/").pop()}</div>
                          <div style={{ fontSize: "10px", color: "var(--color-fg-muted)", wordBreak: "break-all" }}>{file}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, overflow: "hidden" }}>
                {selectedConflictFile ? (
                  <ConflictResolver
                    relativeFile={selectedConflictFile}
                    onResolved={() => {
                      setSelectedConflictFile(null);
                      loadConflictFiles();
                      loadWorkspaceFiles();
                    }}
                  />
                ) : (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "var(--color-fg-muted)",
                    fontSize: "14px",
                    padding: "24px",
                    textAlign: "center",
                  }}>
                    Select an active merge conflict file from the left sidebar to load the visual 3-pane resolver editor.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTICS DASHBOARD PANEL */}
          {activeTab === "diagnostics" && (
            <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
              <div style={{
                flex: 1.2,
                borderRight: "1px solid var(--color-border-default)",
                padding: "24px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
              }}>
                <h2 style={{ fontSize: "18px", fontWeight: "600", letterSpacing: "-0.5px" }}>
                  Deterministic Environment Scanner
                </h2>

                {isDiagLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="spinner"></div>
                    <span>Checking machine host versions and dependency folders...</span>
                  </div>
                ) : diagData ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div className="card" style={{ padding: "16px" }}>
                        <div style={{ fontSize: "11px", color: "var(--color-fg-muted)", fontWeight: "600", textTransform: "uppercase" }}>Node.js Engine Version</div>
                        <div style={{ fontSize: "20px", fontWeight: "600", marginTop: "4px" }}>{diagData.nodeVersion}</div>
                        <div style={{ marginTop: "8px" }}>
                          {diagData.isNodeCompatible ? (
                            <span className="badge badge-success">Compatible ({diagData.enginesNode})</span>
                          ) : (
                            <span className="badge badge-danger">Mismatch (Required: {diagData.enginesNode})</span>
                          )}
                        </div>
                      </div>

                      <div className="card" style={{ padding: "16px" }}>
                        <div style={{ fontSize: "11px", color: "var(--color-fg-muted)", fontWeight: "600", textTransform: "uppercase" }}>npm Version</div>
                        <div style={{ fontSize: "20px", fontWeight: "600", marginTop: "4px" }}>v{diagData.npmVersion}</div>
                        <div style={{ marginTop: "8px" }}>
                          <span className="badge badge-info">Stable Installed</span>
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-header">Dependencies Audit</div>
                      <div className="card-body" style={{ fontSize: "13px" }}>
                        <div>Total requirements in package.json: <strong style={{ fontSize: "14px" }}>{diagData.totalDependencies}</strong> packages</div>
                        
                        <div style={{ marginTop: "12px" }}>
                          {diagData.missingDependencies.length === 0 ? (
                            <div className="flash flash-success" style={{ margin: 0 }}>
                              No missing local folders. All dependencies present in node_modules directory.
                            </div>
                          ) : (
                            <div className="flash flash-danger" style={{ margin: 0 }}>
                              {diagData.missingDependencies.length} package folders are missing! Development environment is broken. Please run &quot;Reinstall Modules&quot;.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>One-Click Maintenance Tools</h3>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          className="btn"
                          disabled={isActionLoading}
                          onClick={() => handleMaintenanceAction("clean-cache")}
                        >
                          Clear npm Cache
                        </button>
                        <button
                          className="btn btn-danger"
                          disabled={isActionLoading}
                          onClick={() => handleMaintenanceAction("clean-modules")}
                        >
                          Reinstall node_modules
                        </button>
                        <button
                          className="btn"
                          disabled={isActionLoading}
                          onClick={() => handleMaintenanceAction("audit-fix")}
                        >
                          Security Audit Fix
                        </button>
                      </div>
                    </div>

                    {actionOutput && (
                      <div className="card">
                        <div className="card-header" style={{ fontSize: "12px", padding: "8px 12px" }}>
                          <span>Action console output</span>
                          <span className={`badge ${actionOutput.success ? "badge-success" : "badge-danger"}`}>
                            {actionOutput.success ? "Success" : "Failed"}
                          </span>
                        </div>
                        <pre style={{
                          margin: 0,
                          padding: "12px",
                          backgroundColor: "rgba(0,0,0,0.3)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                          color: "#c9d1d9",
                          maxHeight: "180px",
                          overflowY: "auto",
                          whiteSpace: "pre-wrap",
                        }}>
                          {actionOutput.output}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>Diagnostics details unavailable.</div>
                )}
              </div>

              <div style={{
                flex: 1,
                backgroundColor: "var(--color-bg-subtle)",
                borderLeft: "1px solid var(--color-border-default)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--color-border-default)",
                  backgroundColor: "var(--color-bg-overlay)",
                  fontWeight: 600,
                  fontSize: "13px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span>Background Server Console Output Logs</span>
                  <span className={`badge ${runnerStatus?.status === "running" ? "badge-success" : "badge-warning"}`}>
                    {runnerStatus?.status}
                  </span>
                </div>

                <div style={{
                  flex: 1,
                  padding: "16px",
                  backgroundColor: "#05080c",
                  color: "#e6edf3",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  overflowY: "auto",
                  lineHeight: "20px",
                }}>
                  {runnerLogs.length === 0 ? (
                    <div style={{ color: "var(--color-fg-subtle)", fontStyle: "italic" }}>
                      No active logs. Click &quot;Run Server&quot; in the Workspace tab to start live compiler output streaming.
                    </div>
                  ) : (
                    runnerLogs.map((log, idx) => (
                      <div key={idx} style={{
                        color: log.includes("[ERROR]") ? "var(--color-danger-fg)" : "inherit",
                        whiteSpace: "pre-wrap",
                      }}>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
