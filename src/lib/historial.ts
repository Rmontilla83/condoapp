import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Historial de cambios (migration 069). Reutiliza `auth_events`, que ya guardaba
 * las invitaciones y los cambios de alícuota: cada acción de la administración
 * deja quién la hizo, cuándo y sobre qué.
 *
 * Nunca interrumpe la acción: si el registro falla, la operación ya ocurrió y
 * decirle «error» a quien la hizo sería falso.
 */
export async function registrarEvento(params: {
  orgId: string;
  actorId: string | null;
  evento: EventoHistorial;
  datos?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { error } = await createAdminClient().from("auth_events").insert({
      organization_id: params.orgId,
      actor_id: params.actorId,
      event: params.evento,
      payload: params.datos ?? {},
    });
    if (error) console.error("[historial]", params.evento, error.message);
  } catch (e) {
    console.error("[historial]", params.evento, e);
  }
}

/** Lo que se muestra en /admin/historial. Un evento que no esté aquí no sale. */
export const EVENTOS = {
  // Unidades y personas
  unit_created: { area: "Unidades", texto: "Creó una unidad" },
  aliquots_updated: { area: "Unidades", texto: "Cambió alícuotas" },
  ownership_mode_updated: { area: "Unidades", texto: "Cambió el tipo de ocupación de una unidad" },
  unit_member_removed: { area: "Personas", texto: "Retiró a una persona de una unidad" },
  unit_invite_sent: { area: "Personas", texto: "Invitó a una persona a una unidad" },
  access_code_generated: { area: "Personas", texto: "Generó un código de acceso" },
  code_redeemed: { area: "Personas", texto: "Canjeó un código y quedó asociado a la unidad" },
  tenant_permissions_updated: { area: "Personas", texto: "Cambió el alcance de un inquilino" },
  owner_contacts_imported: { area: "Personas", texto: "Aplicó una planilla de contactos" },
  portal_invite_sent: { area: "Personas", texto: "Invitó a propietarios al portal" },
  access_code_revoked: { area: "Personas", texto: "Revocó un código de acceso" },
  admin_cuenta_creada: { area: "Personas", texto: "Creó una cuenta de administración" },
  admin_funcion_cambiada: { area: "Personas", texto: "Cambió la función de una cuenta de administración" },
  // Cobranza
  invoices_issued: { area: "Cobranza", texto: "Emitió cuotas" },
  invoice_run_voided: { area: "Cobranza", texto: "Anuló una emisión de cuotas" },
  invoice_voided: { area: "Cobranza", texto: "Anuló un recibo" },
  payment_approved: { area: "Cobranza", texto: "Aprobó un pago" },
  payment_rejected: { area: "Cobranza", texto: "Rechazó un pago" },
  payment_registered: { area: "Cobranza", texto: "Registró un pago recibido" },
  late_fees_issued: { area: "Cobranza", texto: "Emitió intereses de mora" },
  late_fee_rate_updated: { area: "Cobranza", texto: "Cambió la tasa de mora" },
  opening_balances_loaded: { area: "Cobranza", texto: "Cargó saldos de apertura" },
  unit_credit_registered: { area: "Cobranza", texto: "Registró un saldo a favor" },
  payment_plan_created: { area: "Cobranza", texto: "Creó un convenio de pago" },
  payment_plan_closed: { area: "Cobranza", texto: "Cerró un convenio de pago" },
  // Gastos, ingresos y fondos
  expense_recorded: { area: "Finanzas", texto: "Registró un gasto" },
  expense_voided: { area: "Finanzas", texto: "Anuló un gasto" },
  income_recorded: { area: "Finanzas", texto: "Registró otro ingreso" },
  income_voided: { area: "Finanzas", texto: "Anuló otro ingreso" },
  fund_config_updated: { area: "Fondos", texto: "Cambió el porcentaje de un fondo" },
  fund_movement_recorded: { area: "Fondos", texto: "Registró un movimiento de un fondo" },
  fund_movement_voided: { area: "Fondos", texto: "Anuló un movimiento de un fondo" },
  budget_saved: { area: "Presupuesto", texto: "Guardó el presupuesto" },
  budget_approved: { area: "Presupuesto", texto: "Aprobó el presupuesto" },
  budget_archived: { area: "Presupuesto", texto: "Archivó el presupuesto" },
  // Documentos, censo y Junta
  document_version_uploaded: { area: "Documentos", texto: "Subió una versión de un documento" },
  document_version_published: { area: "Documentos", texto: "Publicó una versión de un documento" },
  document_version_rejected: { area: "Documentos", texto: "Devolvió una versión de un documento" },
  document_archived: { area: "Documentos", texto: "Archivó un documento" },
  document_visibility_updated: { area: "Documentos", texto: "Cambió quién ve un documento" },
  census_updated: { area: "Censo", texto: "Actualizó la documentación de una unidad" },
  census_validated: { area: "Censo", texto: "Validó la documentación de una unidad" },
  census_approved: { area: "Censo", texto: "Aprobó la documentación de una unidad" },
  census_visibility_updated: { area: "Censo", texto: "Cambió quién ve el censo" },
  junta_task_saved: { area: "Junta", texto: "Guardó una tarea de la Junta" },
  // Configuración y revisión de la carga
  org_policies_updated: { area: "Configuración", texto: "Cambió las reglas para inquilinos" },
  verificacion_aclarada: { area: "Revisión de la carga", texto: "Anotó una aclaratoria" },
  verificacion_hallazgo_aclarado: { area: "Revisión de la carga", texto: "Aclaró un hallazgo de varias unidades" },
  verificacion_reabierta: { area: "Revisión de la carga", texto: "Reabrió un dato aclarado" },
} as const;

export type EventoHistorial = keyof typeof EVENTOS;
