import { getCurrentProfile, getAnnouncements } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const priorityConfig = {
  normal: { label: "Info", className: "border-blue-300 text-blue-700 bg-blue-50" },
  important: { label: "Importante", className: "border-amber-300 text-amber-700 bg-amber-50" },
  urgent: { label: "Urgente", className: "border-red-300 text-red-700 bg-red-50" },
};

export default async function ComunicadosPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const announcements = await getAnnouncements(profile.organization_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comunicados</h1>
        <p className="text-muted-foreground">Noticias y avisos de tu comunidad</p>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No hay comunicados aun</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const config = priorityConfig[announcement.priority as keyof typeof priorityConfig] ?? priorityConfig.normal;
            const authorName = announcement.profiles?.full_name ?? "Administracion";
            return (
              <Card key={announcement.id} className={
                announcement.priority === "urgent" ? "border-red-200 bg-red-50/30" :
                announcement.priority === "important" ? "border-amber-200 bg-amber-50/30" : ""
              }>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      announcement.priority === "urgent" ? "bg-red-100" :
                      announcement.priority === "important" ? "bg-amber-100" : "bg-blue-100"
                    }`}>
                      {announcement.priority === "urgent" ? (
                        <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      ) : announcement.priority === "important" ? (
                        <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{announcement.title}</h3>
                        <Badge variant="outline" className={config.className}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{authorName}</span>
                        <span>{new Date(announcement.published_at).toLocaleDateString("es")}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
