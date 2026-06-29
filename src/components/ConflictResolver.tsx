"use client";

import { useState, useEffect } from "react";
import { ConflictBlock } from "@/lib/git";

interface ConflictResolverProps {
  relativeFile: string;
  onResolved: () => void;
}

export default function ConflictResolver({ relativeFile, onResolved }: ConflictResolverProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [conflictBlocks, setConflictBlocks] = useState<ConflictBlock[]>([]);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, "ours" | "theirs" | "both" | "pending">>({});
  const [manualOutput, setManualOutput] = useState("");
  const [error, setError] = useState("");

  // Load conflict details
  useEffect(() => {
    async function loadConflicts() {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/workspace/git?action=conflict-details&file=${encodeURIComponent(relativeFile)}`);
        const data = await res.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        const blocks: ConflictBlock[] = data.blocks || [];
        const lines: string[] = data.rawLines || [];

        setConflictBlocks(blocks);
        setRawLines(lines);
        
        const initialRes: Record<string, "ours" | "theirs" | "both" | "pending"> = {};
        blocks.forEach((block: ConflictBlock) => {
          initialRes[block.id] = "pending";
        });
        setResolutions(initialRes);

        // Set initial manual output code
        let output = "";
        lines.forEach((line) => {
          if (line.startsWith("##CONFLICT_BLOCK:") && line.endsWith("##")) {
            const blockId = line.replace("##CONFLICT_BLOCK:", "").replace("##", "");
            const block = blocks.find((b) => b.id === blockId);
            if (block) {
              output += block.original + "\n";
            }
          } else {
            output += line + "\n";
          }
        });
        setManualOutput(output.trim());

      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load conflict files.");
      } finally {
        setIsLoading(false);
      }
    }
    loadConflicts();
  }, [relativeFile]);

  // Recalculate output content based on current selections
  const recalculateOutput = (
    currentResolutions: Record<string, "ours" | "theirs" | "both" | "pending">,
    blocksList: ConflictBlock[],
    rawLinesList: string[]
  ) => {
    let output = "";
    rawLinesList.forEach((line) => {
      if (line.startsWith("##CONFLICT_BLOCK:") && line.endsWith("##")) {
        const blockId = line.replace("##CONFLICT_BLOCK:", "").replace("##", "");
        const block = blocksList.find((b) => b.id === blockId);
        const resolution = currentResolutions[blockId];

        if (block) {
          if (resolution === "ours") {
            output += block.ours + "\n";
          } else if (resolution === "theirs") {
            output += block.theirs + "\n";
          } else if (resolution === "both") {
            output += block.ours + "\n" + block.theirs + "\n";
          } else {
            output += block.original + "\n";
          }
        }
      } else {
        output += line + "\n";
      }
    });

    setManualOutput(output.trim());
  };

  const handleResolveBlock = (blockId: string, choice: "ours" | "theirs" | "both") => {
    setResolutions((prev) => {
      const next = {
        ...prev,
        [blockId]: choice,
      };
      // Recalculate code output immediately when change occurs
      recalculateOutput(next, conflictBlocks, rawLines);
      return next;
    });
  };

  const handleSaveResolution = async () => {
    const pendingBlocks = Object.values(resolutions).filter((r) => r === "pending");
    if (pendingBlocks.length > 0) {
      if (!confirm("Some conflicts are not resolved yet (retaining git markers). Save anyway?")) {
        return;
      }
    }

    try {
      const res = await fetch("/api/workspace/file-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: relativeFile,
          content: manualOutput,
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      alert("Conflicts resolved and saved successfully.");
      onResolved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error saving: ${msg}`);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flash flash-danger" style={{ margin: "24px" }}>
        {error}
      </div>
    );
  }

  const conflictsLeft = Object.values(resolutions).filter((r) => r === "pending").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header bar */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--color-border-default)",
        backgroundColor: "var(--color-bg-subtle)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: 600 }}>Merge Conflict Editor: {relativeFile}</h3>
          <span style={{ fontSize: "12px", color: "var(--color-fg-muted)" }}>
            {conflictsLeft === 0 ? (
              <span style={{ color: "var(--color-success-fg)" }}>All conflicts resolved</span>
            ) : (
              <span>{conflictsLeft} conflicts remaining</span>
            )}
          </span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSaveResolution}>
          Save Resolution
        </button>
      </div>

      {/* 3-Pane conflict layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Pane 1: Current Ours Change */}
        <div style={{
          flex: 1,
          borderRight: "1px solid var(--color-border-default)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-border-default)", backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent-fg)", fontWeight: 600, fontSize: "12px" }}>
            Current Change (Ours / Local)
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "12px", backgroundColor: "rgba(56, 139, 253, 0.02)" }}>
            {conflictBlocks.map((block) => (
              <div key={block.id} style={{ marginBottom: "16px", border: "1px solid var(--color-border-default)", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ padding: "4px 8px", backgroundColor: "var(--color-bg-subtle)", fontSize: "11px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Block {block.id}</span>
                  <button className="btn btn-sm" style={{ padding: "2px 8px", fontSize: "10px" }} onClick={() => handleResolveBlock(block.id, "ours")}>
                    Accept Ours
                  </button>
                </div>
                <pre style={{ margin: 0, padding: "8px", fontFamily: "var(--font-mono)", fontSize: "11px", whiteSpace: "pre-wrap", overflowX: "auto" }}>
                  {block.ours || <span style={{ color: "var(--color-fg-subtle)", fontStyle: "italic" }}>[Empty block]</span>}
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Pane 2: Resulting Code (Editable) */}
        <div style={{
          flex: 1.5,
          borderRight: "1px solid var(--color-border-default)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-border-default)", backgroundColor: "var(--color-bg-overlay)", fontWeight: 600, fontSize: "12px" }}>
            Resulting Code (Live Editable Output)
          </div>
          <textarea
            value={manualOutput}
            onChange={(e) => setManualOutput(e.target.value)}
            style={{
              flex: 1,
              padding: "16px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              lineHeight: "20px",
              backgroundColor: "var(--color-bg-default)",
              color: "var(--color-fg-default)",
              border: "none",
              resize: "none",
              outline: "none",
            }}
          />
        </div>

        {/* Pane 3: Incoming Theirs Change */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-border-default)", backgroundColor: "var(--color-success-bg)", color: "var(--color-success-fg)", fontWeight: 600, fontSize: "12px" }}>
            Incoming Change (Theirs / Remote)
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "12px", backgroundColor: "rgba(46, 160, 67, 0.02)" }}>
            {conflictBlocks.map((block) => (
              <div key={block.id} style={{ marginBottom: "16px", border: "1px solid var(--color-border-default)", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ padding: "4px 8px", backgroundColor: "var(--color-bg-subtle)", fontSize: "11px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Block {block.id}</span>
                  <button className="btn btn-sm" style={{ padding: "2px 8px", fontSize: "10px" }} onClick={() => handleResolveBlock(block.id, "theirs")}>
                    Accept Theirs
                  </button>
                </div>
                <pre style={{ margin: 0, padding: "8px", fontFamily: "var(--font-mono)", fontSize: "11px", whiteSpace: "pre-wrap", overflowX: "auto" }}>
                  {block.theirs || <span style={{ color: "var(--color-fg-subtle)", fontStyle: "italic" }}>[Empty block]</span>}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
