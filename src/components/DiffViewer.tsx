"use client";

import { useState, useEffect } from "react";
import { GitCommit, DiffLine } from "@/lib/git";

interface DiffViewerProps {
  selectedFile: string | null;
}

export default function DiffViewer({ selectedFile }: DiffViewerProps) {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  // Load commit history for selected file
  useEffect(() => {
    if (!selectedFile) {
      Promise.resolve().then(() => {
        setCommits([]);
        setSelectedCommit(null);
        setDiffLines([]);
      });
      return;
    }

    async function loadHistory() {
      setIsLoadingHistory(true);
      setSelectedCommit(null);
      setDiffLines([]);
      try {
        const res = await fetch(`/api/workspace/git?action=commits&file=${encodeURIComponent(selectedFile!)}`);
        const data = await res.json();
        setCommits(data.commits || []);
        if (data.commits && data.commits.length > 0) {
          setSelectedCommit(data.commits[0].hash);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    loadHistory();
  }, [selectedFile]);

  // Load diff for selected commit
  useEffect(() => {
    if (!selectedCommit || !selectedFile) {
      Promise.resolve().then(() => {
        setDiffLines([]);
      });
      return;
    }

    async function loadDiff() {
      setIsLoadingDiff(true);
      try {
        const res = await fetch(`/api/workspace/git?action=diff&commit=${selectedCommit}&file=${encodeURIComponent(selectedFile!)}`);
        const data = await res.json();
        setDiffLines(data.diff || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingDiff(false);
      }
    }
    loadDiff();
  }, [selectedCommit, selectedFile]);

  if (!selectedFile) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "var(--color-fg-muted)",
        fontSize: "13px",
        padding: "16px",
        textAlign: "center",
      }}>
        Select a file to inspect its Git history.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Commit History Timeline (Top Half) */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        borderBottom: "1px solid var(--color-border-default)",
        padding: "12px",
      }}>
        <h3 style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "var(--color-fg-muted)", marginBottom: "8px" }}>
          Commit Timeline
        </h3>
        
        {isLoadingHistory ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
            <div className="spinner"></div>
          </div>
        ) : commits.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--color-fg-muted)", padding: "8px" }}>
            No commit history found for this file.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {commits.map((commit) => (
              <div
                key={commit.hash}
                onClick={() => setSelectedCommit(commit.hash)}
                style={{
                  padding: "8px",
                  borderRadius: "6px",
                  border: `1px solid ${selectedCommit === commit.hash ? "var(--color-accent-border)" : "var(--color-border-default)"}`,
                  backgroundColor: selectedCommit === commit.hash ? "var(--color-accent-bg)" : "var(--color-bg-subtle)",
                  cursor: "pointer",
                  fontSize: "12px",
                  transition: "all 0.1s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, color: "var(--color-fg-default)" }}>
                    {commit.subject}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--color-fg-muted)" }}>
                    {commit.hash.slice(0, 7)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--color-fg-muted)" }}>
                  <span>{commit.author}</span>
                  <span>{new Date(commit.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diff Analyzer (Bottom Half) */}
      <div style={{
        flex: 1.5,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "8px 12px",
          backgroundColor: "var(--color-bg-subtle)",
          borderBottom: "1px solid var(--color-border-default)",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--color-fg-muted)",
        }}>
          Line Diff Analyzer
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
          {isLoadingDiff ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
              <div className="spinner"></div>
            </div>
          ) : !selectedCommit ? (
            <div style={{ fontSize: "12px", color: "var(--color-fg-muted)", padding: "12px", textAlign: "center" }}>
              Select a commit above to inspect changes.
            </div>
          ) : diffLines.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--color-fg-muted)", padding: "12px", textAlign: "center" }}>
              No modifications shown in this commit.
            </div>
          ) : (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", lineHeight: "18px", whiteSpace: "pre-wrap" }}>
              {diffLines.map((line, idx) => {
                let bgColor = "transparent";
                let textColor = "var(--color-fg-default)";
                let prefix = " ";

                if (line.type === "added") {
                  bgColor = "var(--color-diff-added-bg)";
                  textColor = "var(--color-success-fg)";
                  prefix = "+";
                } else if (line.type === "removed") {
                  bgColor = "var(--color-diff-removed-bg)";
                  textColor = "var(--color-danger-fg)";
                  prefix = "-";
                }

                return (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: bgColor,
                      color: textColor,
                      padding: "0 8px",
                      display: "flex",
                      gap: "8px",
                      borderLeft: line.type === "added" ? "3px solid var(--color-diff-added-line)" : line.type === "removed" ? "3px solid var(--color-diff-removed-line)" : "3px solid transparent",
                    }}
                  >
                    <span style={{ userSelect: "none", color: "var(--color-fg-subtle)", width: "12px" }}>{prefix}</span>
                    <span>{line.content || " "}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
