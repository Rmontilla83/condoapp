import { FichaDeLaUnidad } from "./ficha";

/** La ficha de la unidad, abierta desde Cuentas por cobrar. */
export default async function CuentaUnidadPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  return <FichaDeLaUnidad unitId={unitId} origen="cuentas" />;
}
