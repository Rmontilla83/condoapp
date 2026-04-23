import { createClient } from "@/lib/supabase/server";
import { GrantAccessButton } from "./grant-access-button";
import { AtryumLogo } from "@/components/brand/atryum-logo";

type PassStatus = "valid" | "used" | "cancelled" | "expired" | "not_found";

const STATUS_COPY: Record<PassStatus, { label: string; tone: "cyan" | "ember" | "destructive" }> = {
  valid: { label: "PASE VÁLIDO", tone: "cyan" },
  used: { label: "PASE YA UTILIZADO", tone: "ember" },
  cancelled: { label: "PASE CANCELADO", tone: "destructive" },
  expired: { label: "PASE EXPIRADO", tone: "destructive" },
  not_found: { label: "PASE NO ENCONTRADO", tone: "destructive" },
};

export default async function VerificarPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: pass } = await supabase
    .from("access_passes")
    .select("*, profiles:created_by(full_name)")
    .eq("qr_code", code)
    .single();

  if (!pass) {
    return <VerificarShell status="not_found" />;
  }

  const now = new Date();
  const validUntil = new Date(pass.valid_until);
  const isExpired = validUntil < now;
  const isUsed = pass.status === "used";
  const isCancelled = pass.status === "cancelled";
  const isValid = pass.status === "active" && !isExpired;

  const status: PassStatus = isValid
    ? "valid"
    : isUsed
    ? "used"
    : isCancelled
    ? "cancelled"
    : "expired";

  const ownerName = pass.profiles?.full_name ?? "Propietario";

  return (
    <VerificarShell status={status}>
      <div className="mt-6 space-y-4">
        <div className="rounded-xl bg-cloud/40 border border-border p-4">
          <p className="font-meta text-mute">VISITANTE</p>
          <p className="mt-2 font-display text-[20px] text-marine-deep leading-tight">
            {pass.visitor_name}
          </p>
          <p className="mt-1 font-mono text-[13px] text-mute">{pass.visitor_id_number}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-cloud/40 border border-border p-4">
            <p className="font-meta text-mute">DESTINO</p>
            <p className="mt-2 text-[15px] font-medium text-marine-deep">
              Apto {pass.unit_number || "—"}
            </p>
          </div>
          <div className="rounded-xl bg-cloud/40 border border-border p-4">
            <p className="font-meta text-mute">INVITADO POR</p>
            <p className="mt-2 text-[15px] font-medium text-marine-deep">{ownerName}</p>
          </div>
        </div>

        <div className="rounded-xl bg-cloud/40 border border-border p-4">
          <p className="font-meta text-mute">VÁLIDO HASTA</p>
          <p className="mt-2 text-[14px] font-medium text-marine-deep">
            {validUntil.toLocaleDateString("es", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {status === "valid" && <GrantAccessButton passId={pass.id} />}
      </div>
    </VerificarShell>
  );
}

function VerificarShell({
  status,
  children,
}: {
  status: PassStatus;
  children?: React.ReactNode;
}) {
  const copy = STATUS_COPY[status];
  const toneClasses =
    copy.tone === "cyan"
      ? "bg-cyan text-frost"
      : copy.tone === "ember"
      ? "bg-ember text-marine-deep"
      : "bg-destructive text-frost";

  return (
    <div className="min-h-screen flex flex-col bg-frost">
      <header className="px-6 py-6 md:px-10 md:py-8">
        <AtryumLogo variant="horizontal" tone="marine-deep" className="h-6" />
      </header>

      <main className="flex-1 flex items-center justify-center px-5 pb-12">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className={`${toneClasses} px-6 py-5 text-center`}>
              <p className="font-meta-loose">{copy.label}</p>
            </div>

            <div className="p-6">
              {status === "not_found" && (
                <p className="text-[14px] text-mute text-center leading-relaxed">
                  Este código QR no es válido o no existe en el sistema.
                </p>
              )}
              {children}
            </div>

            <div className="border-t border-border px-6 py-3 text-center">
              <p className="font-meta text-mute">
                VERIFICADO POR <span className="text-cyan">ATRYUM</span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
