"use client";

import { useState } from "react";

export interface FileNode {
  name: string;
  relativePath: string;
  absolutePath: string;
  isDirectory: boolean;
  children?: FileNode[];
}

interface FileTreeProps {
  tree: FileNode[];
  selectedFile: string | null;
  onSelectFile: (relativePath: string) => void;
}

export default function FileTree({ tree, selectedFile, onSelectFile }: FileTreeProps) {
  return (
    <div style={{ padding: "8px", overflowY: "auto", height: "100%", fontSize: "13px" }}>
      {tree.map((node) => (
        <TreeNode
          key={node.relativePath}
          node={node}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          level={0}
        />
      ))}
    </div>
  );
}

interface TreeNodeProps {
  node: FileNode;
  selectedFile: string | null;
  onSelectFile: (relativePath: string) => void;
  level: number;
}

function TreeNode({ node, selectedFile, onSelectFile, level }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = selectedFile === node.relativePath;

  const handleToggle = () => {
    if (node.isDirectory) {
      setIsOpen(!isOpen);
    } else {
      onSelectFile(node.relativePath);
    }
  };

  return (
    <div>
      <div
        onClick={handleToggle}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "4px 8px",
          paddingLeft: `${level * 16 + 8}px`,
          borderRadius: "4px",
          cursor: "pointer",
          backgroundColor: isSelected ? "var(--color-bg-active)" : "transparent",
          color: isSelected ? "var(--color-accent-fg)" : "var(--color-fg-default)",
          fontWeight: isSelected ? "600" : "normal",
          fontSize: "13px",
          transition: "background-color 0.1s",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        {node.isDirectory ? (
          <span style={{ marginRight: "6px", display: "flex", alignItems: "center", width: "16px" }}>
            {isOpen ? (
              // Down chevron
              <svg width="12" height="12" viewBox="0 0 16 16" fill="var(--color-fg-muted)">
                <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"></path>
              </svg>
            ) : (
              // Right chevron
              <svg width="12" height="12" viewBox="0 0 16 16" fill="var(--color-fg-muted)">
                <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"></path>
              </svg>
            )}
          </span>
        ) : (
          <span style={{ marginRight: "6px", display: "flex", alignItems: "center", width: "16px" }}>
            {/* File Icon */}
            <svg width="12" height="12" viewBox="0 0 16 16" fill="var(--color-fg-muted)">
              <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v8.086A1.75 1.75 0 0113.75 15H3.75A1.75 1.75 0 012 13.25V1.75zm1.75-.25a.25.25 0 00-.25.25v11.5c0 .138.112.25.25.25h10a.25.25 0 00.25-.25V5.5h-3.25a1.75 1.75 0 01-1.75-1.75V1.5H3.75zm7.25 0v2.25c0 .414.336.75.75.75h2.25l-3-3z"></path>
            </svg>
          </span>
        )}

        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {node.name}
        </span>
      </div>

      {node.isDirectory && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.relativePath}
              node={child}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
