import { useState } from "react";

interface ModeToggleProps {
  mode: "simple" | "advanced";
  onChange: (mode: "simple" | "advanced") => void;
}

export function useMode() {
  const [mode, setMode] = useState<"simple" | "advanced">(() => {
    const saved = localStorage.getItem("acp-mode");
    return saved === "advanced" ? "advanced" : "simple";
  });

  function handleChange(newMode: "simple" | "advanced") {
    localStorage.setItem("acp-mode", newMode);
    setMode(newMode);
  }

  return [mode, handleChange] as const;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const cls = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs font-medium font-display transition-all duration-150 ${
      active
        ? "bg-surface-highest text-primary"
        : "text-muted hover:text-on-surface"
    }`;

  return (
    <div className="inline-flex rounded-full bg-surface p-0.5 ghost-border">
      <button onClick={() => onChange("simple")} className={cls(mode === "simple")}>Simple</button>
      <button onClick={() => onChange("advanced")} className={cls(mode === "advanced")}>Advanced</button>
    </div>
  );
}
