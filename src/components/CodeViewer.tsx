"use client";

import { useState } from "react";

interface CodeViewerProps {
  filePath: string;
  content: string;
  isLoading: boolean;
}

export default function CodeViewer({ filePath, content, isLoading }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!filePath) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "var(--color-fg-muted)",
        fontSize: "14px",
      }}>
        Select a file from the explorer tree to view its content.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}>
        <div className="spinner" style={{ width: "24px", height: "24px" }}></div>
      </div>
    );
  }

  const lines = content.split("\n");

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", border: "none", borderRadius: 0 }}>
      {/* File Header */}
      <div className="card-header" style={{
        backgroundColor: "var(--color-bg-subtle)",
        borderBottom: "1px solid var(--color-border-default)",
        padding: "8px 16px",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
          <span style={{ fontWeight: 600, color: "var(--color-fg-default)" }}>{filePath}</span>
          <span style={{ color: "var(--color-fg-muted)" }}>|</span>
          <span style={{ color: "var(--color-fg-muted)" }}>{lines.length} lines</span>
          <span style={{ color: "var(--color-fg-muted)" }}>|</span>
          <span style={{ color: "var(--color-fg-muted)" }}>{(new Blob([content]).size / 1024).toFixed(2)} KB</span>
        </div>
        
        <button className="btn btn-sm" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Code Text Area */}
      <div style={{
        flex: 1,
        overflow: "auto",
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        lineHeight: "20px",
        backgroundColor: "var(--color-bg-default)",
        display: "flex",
      }}>
        {/* Line Numbers Gutter */}
        <div style={{
          padding: "16px 8px 16px 16px",
          textAlign: "right",
          userSelect: "none",
          color: "var(--color-fg-subtle)",
          borderRight: "1px solid var(--color-border-default)",
          backgroundColor: "var(--color-bg-subtle)",
          minWidth: "48px",
        }}>
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Content */}
        <pre style={{
          margin: 0,
          padding: "16px",
          overflow: "visible",
          color: "var(--color-fg-default)",
        }}>
          <code>
            {lines.map((line, idx) => (
              <div key={idx} style={{ height: "20px", whiteSpace: "pre" }}>
                {line || " "}
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
