"use client";

import { useState, useTransition } from "react";
import { updateOrgContact } from "./settings-actions";

interface Contacto {
  contact_phone: string;
  contact_email: string;
  office_hours: string;
  concierge_notes: string;
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-cyan";

export function ContactForm({ initial }: { initial: Contacto }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const res = await updateOrgContact(fd);
          if ("error" in res) {
            setFeedback({ type: "error", msg: res.error });
          } else {
            setFeedback({ type: "ok", msg: "Guardado" });
            window.location.reload();
          }
        })
      }
      className="space-y-4"
    >
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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold">Teléfono</span>
          <input name="contact_phone" defaultValue={initial.contact_phone} maxLength={60} placeholder="0414-000-0000" className={inputCls} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold">Correo</span>
          <input name="contact_email" type="email" defaultValue={initial.contact_email} maxLength={200} className={inputCls} />
        </label>
      </div>
      <label className="block space-y-1.5 text-sm">
        <span className="font-semibold">Horario de atención</span>
        <input name="office_hours" defaultValue={initial.office_hours} maxLength={300} placeholder="Lunes a viernes, 8:00 a 12:00" className={inputCls} />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-semibold">Notas para el conserje</span>
        <textarea
          name="concierge_notes"
          defaultValue={initial.concierge_notes}
          maxLength={4000}
          rows={5}
          placeholder="Horario del conserje, normas de la marina, dónde se deja la basura…"
          className={inputCls}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-marine-deep text-frost px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar contacto"}
      </button>
    </form>
  );
}
