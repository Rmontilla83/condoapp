import { FichaDeLaUnidad } from "../../cuentas/[unitId]/ficha";

/**
 * La ficha de la unidad, abierta desde Unidades. Es la misma ficha que se ve
 * desde Cuentas por cobrar, pero en esta dirección: así quien venía de Unidades
 * sigue en Unidades (el menú no salta de módulo) y «Volver» regresa ahí.
 */
export default async function FichaDesdeUnidadesPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  return <FichaDeLaUnidad unitId={unitId} origen="unidades" />;
}
