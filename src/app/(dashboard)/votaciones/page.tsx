import { redirect } from "next/navigation";

/**
 * Redirect permanente — /votaciones se renombró a /decisiones en E3.
 * Mantenemos este archivo para no romper bookmarks viejos.
 */
export default function VotacionesRedirect() {
  redirect("/decisiones");
}
