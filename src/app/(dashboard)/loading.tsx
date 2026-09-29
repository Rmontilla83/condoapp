import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lo que se ve apenas se toca un enlace del menú. Sin esto la pantalla se
 * quedaba quieta hasta que el servidor terminaba y el clic parecía perdido; y
 * Next no precarga una página dinámica que no tenga loading.
 */
export default function Cargando() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}
