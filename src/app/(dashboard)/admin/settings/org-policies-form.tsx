"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOrgPolicies } from "../units/actions";

interface Policies {
  tenant_can_vote: boolean;
  tenant_can_see_delinquents: boolean;
  tenant_can_reserve: boolean;
}

const policyMeta: Record<keyof Policies, { title: string; description: string }> = {
  tenant_can_vote: {
    title: "Los inquilinos pueden votar en asambleas",
    description:
      "En muchos países los inquilinos no votan; depende del reglamento. Déjalo apagado si no estás seguro.",
  },
  tenant_can_see_delinquents: {
    title: "Los inquilinos ven la lista completa de morosos",
    description:
      "Si lo activas, los inquilinos ven qué unidades del condominio están atrasadas. Si lo apagas, solo ven la morosidad de su propia unidad.",
  },
  tenant_can_reserve: {
    title: "Los inquilinos pueden reservar áreas comunes",
    description:
      "Piscina, salón, parrilla. La mayoría de condominios lo permite. Apagarlo solo si el reglamento lo restringe a propietarios.",
  },
};

export function OrgPoliciesForm({ initial }: { initial: Policies }) {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policies>(initial);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  function toggle(key: keyof Policies, value: boolean) {
    const next = { ...policies, [key]: value };
    setPolicies(next);
    startTransition(async () => {
      const res = await setOrgPolicies({ [key]: value });
      if (res.error) {
        setPolicies(policies); // revert
        setFeedback({ type: "error", msg: res.error });
      } else {
        setFeedback({ type: "ok", msg: "Actualizado" });
        router.refresh();
      }
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`rounded-lg border p-2.5 text-sm ${
            feedback.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {(Object.keys(policyMeta) as (keyof Policies)[]).map((key) => {
        const meta = policyMeta[key];
        return (
          <label
            key={key}
            className="flex items-start justify-between gap-4 rounded-lg border p-3 cursor-pointer hover:border-primary transition"
          >
            <div className="flex-1">
              <p className="text-sm font-semibold">{meta.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
            </div>
            <input
              type="checkbox"
              checked={policies[key]}
              disabled={pending}
              onChange={(e) => toggle(key, e.target.checked)}
              className="mt-1 h-5 w-5 cursor-pointer"
            />
          </label>
        );
      })}
    </div>
  );
}
