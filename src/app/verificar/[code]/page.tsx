import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { GrantAccessButton } from "./grant-access-button";

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC] p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Pase no encontrado
            </h1>
            <p className="mt-2 text-sm text-[#64748B]">
              Este codigo QR no es valido o no existe en el sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const validUntil = new Date(pass.valid_until);
  const isExpired = validUntil < now;
  const isUsed = pass.status === "used";
  const isCancelled = pass.status === "cancelled";
  const isValid = pass.status === "active" && !isExpired;

  const ownerName = pass.profiles?.full_name ?? "Propietario";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC] p-4">
      <Card className="w-full max-w-sm overflow-hidden">
        {/* Status header */}
        <div
          className={`px-6 py-4 text-center text-white ${
            isValid
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
              : isUsed
              ? "bg-gradient-to-r from-blue-500 to-blue-600"
              : "bg-gradient-to-r from-red-500 to-red-600"
          }`}
        >
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            {isValid ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
          </div>
          <p className="text-lg font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>
            {isValid
              ? "PASE VALIDO"
              : isUsed
              ? "PASE YA UTILIZADO"
              : isCancelled
              ? "PASE CANCELADO"
              : "PASE EXPIRADO"}
          </p>
        </div>

        <CardContent className="p-6">
          {/* Visitor info */}
          <div className="space-y-4">
            <div className="rounded-xl bg-[#F8FAFC] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Visitante</span>
              </div>
              <div>
                <p className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {pass.visitor_name}
                </p>
                <p className="text-sm text-[#6B7280] mt-0.5">{pass.visitor_id_number}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#F8FAFC] p-3">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Destino</p>
                <p className="text-base font-bold text-[#0F172A] mt-1">
                  Apto {pass.unit_number || "—"}
                </p>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] p-3">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Invitado por</p>
                <p className="text-base font-bold text-[#0F172A] mt-1">{ownerName}</p>
              </div>
            </div>

            <div className="rounded-xl bg-[#F8FAFC] p-3">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Valido hasta</p>
              <p className="text-sm font-semibold text-[#0F172A] mt-1">
                {validUntil.toLocaleDateString("es", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {isValid && <GrantAccessButton passId={pass.id} />}
          </div>
        </CardContent>

        {/* Footer */}
        <div className="border-t px-6 py-3 text-center">
          <p className="text-[11px] text-[#6B7280]">
            Verificado por{" "}
            <span className="font-semibold text-[#0D9488]">Atryum</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
