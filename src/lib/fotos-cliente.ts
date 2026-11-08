/**
 * Reduce una foto en el navegador antes de subirla.
 *
 * Una foto de teléfono pesa varios MB: Vercel no recibe más de 4,5 MB por
 * petición y los vecinos la descargan con datos móviles. Al redibujarla también
 * se pierden los metadatos, entre ellos la ubicación GPS.
 */
export const MAX_BYTES_FOTO = 600 * 1024;

const LADOS = [1600, 1200, 900];
const CALIDADES = [0.82, 0.68, 0.55];

export async function reducirFoto(archivo: File): Promise<File> {
  const url = URL.createObjectURL(archivo);
  try {
    const imagen = new Image();
    imagen.src = url;
    await imagen.decode();

    for (const lado of LADOS) {
      const escala = Math.min(1, lado / Math.max(imagen.naturalWidth, imagen.naturalHeight));
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.round(imagen.naturalWidth * escala);
      lienzo.height = Math.round(imagen.naturalHeight * escala);
      const ctx = lienzo.getContext("2d");
      if (!ctx) throw new Error("El navegador no pudo procesar la foto");
      // Un PNG transparente saldría con fondo negro en JPEG.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

      for (const calidad of CALIDADES) {
        const blob = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, "image/jpeg", calidad));
        if (blob && blob.size <= MAX_BYTES_FOTO) return new File([blob], "foto.jpg", { type: "image/jpeg" });
      }
    }
    throw new Error("La foto pesa demasiado");
  } finally {
    URL.revokeObjectURL(url);
  }
}
