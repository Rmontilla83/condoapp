import { getCurrentProfile, getEffectiveRole, getAnnouncements } from "@/lib/queries";
import { NewAnnouncementDialog } from "./new-announcement-dialog";

const priorityConfig = {
  normal: { label: "INFO", dot: "bg-cyan", tag: "bg-cyan/10 text-cyan" },
  important: { label: "IMPORTANTE", dot: "bg-ember", tag: "bg-ember/15 text-ember" },
  urgent: { label: "URGENTE", dot: "bg-destructive", tag: "bg-destructive/10 text-destructive" },
};

export default async function ComunicadosPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const announcements = await getAnnouncements(profile.organization_id);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-meta-loose text-cyan">COMUNICADOS</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
            Noticias de tu <em className="font-editorial text-cyan">comunidad</em>
          </h1>
        </div>
        {(getEffectiveRole(profile) === "admin" || getEffectiveRole(profile) === "super_admin") && (
          <NewAnnouncementDialog />
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border py-16 text-center">
          <p className="text-[14px] text-mute">No hay comunicados aún.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const config =
              priorityConfig[announcement.priority as keyof typeof priorityConfig] ??
              priorityConfig.normal;
            const authorName = announcement.profiles?.full_name ?? "Administración";
            return (
              <article
                key={announcement.id}
                className="rounded-2xl bg-card border border-border p-5 md:p-6"
              >
                <div className="flex items-start gap-4">
                  <span className={`mt-2 h-2 w-2 rounded-full shrink-0 ${config.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5 mb-2">
                      <h3 className="font-display text-[18px] leading-tight tracking-[-0.02em] text-marine-deep">
                        {announcement.title}
                      </h3>
                      <span className={`font-meta px-2 py-0.5 rounded-md ${config.tag}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-[14.5px] text-marine-deep/80 leading-relaxed">
                      {announcement.content}
                    </p>
                    <div className="mt-4 flex items-center gap-3 font-meta text-mute">
                      <span>{authorName.toUpperCase()}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {new Date(announcement.published_at)
                          .toLocaleDateString("es", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                          .toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
