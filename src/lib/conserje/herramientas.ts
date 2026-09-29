import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { consultasDelConserje, type ConserjeContexto } from "./consultas";
import type { PropuestaAveria } from "./averia";

export type { ConserjeContexto } from "./consultas";

/**
 * Las consultas del conserje envueltas como herramientas para Claude. La lógica
 * y el filtro de privacidad viven en consultas.ts, compartidos con el modo demo.
 */
export function herramientasDelConserje(
  ctx: ConserjeContexto,
  opciones: { alProponerAveria?: (p: PropuestaAveria) => void } = {},
) {
  const q = consultasDelConserje(ctx);
  const sinArgs = z.object({});
  const json = (x: unknown) => JSON.stringify(x);

  return [
    betaZodTool({
      name: "mi_estado_de_cuenta",
      description:
        "Cuotas pendientes o vencidas de las unidades de quien pregunta, total a pagar en USD y en bolívares a la tasa BCV de hoy, saldo a favor disponible, y comprobantes que reportó y siguen en revisión. Para '¿cuánto debo?', '¿cuándo vence?', '¿ya me aprobaron el pago?', '¿tengo saldo a favor?'.",
      inputSchema: sinArgs,
      run: async () => json(await q.estadoDeCuenta()),
    }),
    betaZodTool({
      name: "historial_de_pagos",
      description:
        "Los últimos pagos aprobados o rechazados de sus unidades, con método, referencia y fecha. Para '¿cuándo pagué la última vez?', '¿por qué me rechazaron?'.",
      inputSchema: sinArgs,
      run: async () => json(await q.historialDePagos()),
    }),
    betaZodTool({
      name: "mi_unidad",
      description:
        "Datos de sus unidades: torre, piso, tipo, alícuota (porcentaje de condominio) y si es propietario o inquilino. Para '¿cuál es mi alícuota?', '¿por qué pago esto?'.",
      inputSchema: sinArgs,
      run: async () => json(await q.miUnidad()),
    }),
    betaZodTool({
      name: "como_pagar",
      description:
        "Cuentas bancarias activas del condominio (transferencia, pago móvil, Zelle) y cómo se reporta un pago en la app.",
      inputSchema: sinArgs,
      run: async () => json(await q.comoPagar()),
    }),
    betaZodTool({
      name: "areas_comunes",
      description:
        "Áreas comunes reservables con capacidad, reglas y políticas de reserva. Úsala antes de consultar disponibilidad para conocer el nombre exacto.",
      inputSchema: sinArgs,
      run: async () => json(await q.areasComunes()),
    }),
    betaZodTool({
      name: "disponibilidad_area",
      description:
        "Horarios ya reservados de un área común en una fecha (sin decir quién reservó); el resto del día está libre, sujeto a las políticas del área.",
      inputSchema: z.object({
        area: z.string().min(1).max(80).describe("Nombre del área, tal como lo devuelve areas_comunes"),
        fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("AAAA-MM-DD, hora local del condominio"),
      }),
      run: async ({ area, fecha }) => json(await q.disponibilidad(area, fecha)),
    }),
    betaZodTool({
      name: "informacion_del_condominio",
      description:
        "Nombre, dirección, número de unidades, teléfono, correo y horario de la administración, cómo se calcula la cuota, recargo por mora y las notas permanentes de la junta (normas, horarios, avisos).",
      inputSchema: sinArgs,
      run: async () => json(await q.condominio()),
    }),
    betaZodTool({
      name: "comunicados_recientes",
      description: "Los últimos comunicados de la administración dirigidos a esta persona.",
      inputSchema: sinArgs,
      run: async () => json(await q.comunicados()),
    }),
    betaZodTool({
      name: "directorio_de_servicios",
      description:
        "Técnicos y proveedores recomendados por el condominio: aires acondicionados, plomería, electricidad, albañilería, pintura, cerrajería, fumigación, línea blanca, internet y cámaras, herrería, vidrios, limpieza, jardinería, piscinas, mudanzas. Para 'se me dañó el aire', 'necesito un plomero', '¿conoces un cerrajero?'. Si el daño es en un área común (ascensor, bomba, pasillo), además sugiere reportarlo en Mantenimiento.",
      inputSchema: z.object({
        categoria: z
          .enum(["aire_acondicionado", "plomeria", "electricidad", "albanileria", "pintura", "cerrajeria", "fumigacion", "jardineria", "piscina", "limpieza", "mudanzas", "tecnologia", "linea_blanca", "herreria", "vidrieria", "otro"])
          .optional()
          .describe("Categoría; omítela para ver todo el directorio"),
      }),
      run: async ({ categoria }) => json(await q.directorioDeServicios(categoria ?? null)),
    }),
    betaZodTool({
      name: "proponer_reporte_de_averia",
      description:
        "Prepara un reporte de avería para que la persona lo revise y lo envíe. NO lo envía: ella ve un formulario ya llenado debajo de tu respuesta y confirma. Úsala cuando cuente un daño: fuga, ascensor parado, luz del pasillo, portón dañado, filtración.",
      inputSchema: z.object({
        titulo: z.string().min(3).max(80).describe("Título corto: 'Fuga en el baño', 'Ascensor de la Torre B parado'"),
        descripcion: z.string().min(3).max(1000).describe("Qué pasa, con las palabras de la persona"),
        categoria: z.enum(["plumbing", "electrical", "structural", "elevator", "security", "cleaning", "access", "hvac", "common_area", "other"]),
        lugar: z.enum(["unidad", "area_comun"]).describe("unidad = dentro de su apartamento; area_comun = pasillo, ascensor, piscina, etc."),
      }),
      run: async (p) => {
        opciones.alProponerAveria?.({ tipo: "reportar_averia", ...p });
        return "Listo: la persona ve el formulario para confirmar el reporte.";
      },
    }),
    betaZodTool({
      name: "mis_solicitudes_de_mantenimiento",
      description: "Las solicitudes de mantenimiento que reportó esta persona y en qué estado están.",
      inputSchema: sinArgs,
      run: async () => json(await q.misSolicitudes()),
    }),
  ];
}
