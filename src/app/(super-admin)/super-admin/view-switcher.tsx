"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { switchViewAs } from "./actions";

const views = [
  { value: null, label: "Super Admin", color: "bg-purple-600" },
  { value: "admin", label: "Admin", color: "bg-primary" },
  { value: "resident", label: "Residente", color: "bg-blue-600" },
];

export function ViewSwitcher({ currentView }: { currentView: string | null }) {
  const [loading, setLoading] = useState(false);

  async function handleSwitch(viewAs: string | null) {
    setLoading(true);
    await switchViewAs(viewAs);
    window.location.reload();
  }

  const current = views.find((v) => v.value === currentView) ?? views[0];

  return (
    <div className="flex items-center gap-1 rounded-xl border bg-card p-1">
      {views.map((v) => (
        <Button
          key={v.label}
          size="sm"
          variant={current.value === v.value ? "default" : "ghost"}
          className={`text-xs h-7 px-3 ${current.value === v.value ? v.color : ""}`}
          onClick={() => handleSwitch(v.value)}
          disabled={loading}
        >
          {v.label}
        </Button>
      ))}
    </div>
  );
}
