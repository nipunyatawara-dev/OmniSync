"use client";

interface BranchFilterMultiSelectProps {
  branches: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function BranchFilterMultiSelect({
  branches,
  selected,
  onChange,
}: BranchFilterMultiSelectProps) {
  const allSelected = branches.length > 0 && selected.length === branches.length;

  const toggle = (branch: string) => {
    if (selected.includes(branch)) {
      onChange(selected.filter((b) => b !== branch));
    } else {
      onChange([...selected, branch]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--color-fg-muted)",
          }}
        >
          Feed branches
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onChange([...branches])}
            disabled={allSelected || branches.length === 0}
            style={{ fontSize: "10px", padding: "2px 8px" }}
          >
            All
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
            style={{ fontSize: "10px", padding: "2px 8px" }}
          >
            Clear
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {branches.map((branch) => {
          const on = selected.includes(branch);
          return (
            <button
              key={branch}
              type="button"
              onClick={() => toggle(branch)}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                padding: "4px 10px",
                borderRadius: "999px",
                border: `1px solid ${on ? "var(--color-accent-border)" : "var(--color-border-default)"}`,
                backgroundColor: on ? "var(--color-accent-bg)" : "transparent",
                color: on ? "var(--color-accent-fg)" : "var(--color-fg-muted)",
                cursor: "pointer",
              }}
            >
              {branch}
            </button>
          );
        })}
        {branches.length === 0 && (
          <span style={{ fontSize: "12px", color: "var(--color-fg-muted)" }}>No local branches</span>
        )}
      </div>
    </div>
  );
}
