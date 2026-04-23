import { cn } from "@/lib/utils";

/**
 * Skeleton con shimmer estilo Linear.
 * Uso: <Skeleton className="h-6 w-40" />
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "shimmer relative overflow-hidden rounded-md bg-cloud",
        className,
      )}
    />
  );
}
