import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const mockAnnouncements = [
  {
    id: "1",
    title: "Fumigación programada para este sábado",
    content: "Se realizará fumigación general en todas las áreas comunes el sábado 12 de abril de 8:00 AM a 12:00 PM. Favor cerrar ventanas y mantener mascotas dentro de los apartamentos.",
    priority: "important" as const,
    author: "Junta Directiva",
    publishedAt: "2026-04-10",
  },
  {
    id: "2",
    title: "Corte de agua programado",
    content: "El próximo martes 15 de abril habrá corte de agua de 9:00 AM a 2:00 PM por mantenimiento del tanque principal. Recomendamos almacenar agua.",
    priority: "urgent" as const,
    author: "Administración",
    publishedAt: "2026-04-09",
  },
  {
    id: "3",
    title: "Nuevas normas de estacionamiento",
    content: "A partir del 1 de mayo, cada apartamento tendrá máximo 2 puestos asignados. Los puestos de visitantes serán por reserva a través de la app. Se colocarán nuevas señalizaciones esta semana.",
    priority: "normal" as const,
    author: "Junta Directiva",
    publishedAt: "2026-04-07",
  },
  {
    id: "4",
    title: "Bienvenidos a CondoApp",
    content: "Tu comunidad ahora es digital. Desde aquí podrás pagar tus cuotas, reportar problemas de mantenimiento, reservar áreas comunes y mantenerte informado de todo lo que pasa en el condominio.",
    priority: "normal" as const,
    author: "CondoApp",
    publishedAt: "2026-04-01",
  },
];

const priorityConfig = {
  normal: { label: "Info", className: "border-blue-300 text-blue-700 bg-blue-50", icon: "info" },
  important: { label: "Importante", className: "border-amber-300 text-amber-700 bg-amber-50", icon: "warning" },
  urgent: { label: "Urgente", className: "border-red-300 text-red-700 bg-red-50", icon: "urgent" },
};

export default function ComunicadosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comunicados</h1>
        <p className="text-muted-foreground">Noticias y avisos de tu comunidad</p>
      </div>

      <div className="space-y-4">
        {mockAnnouncements.map((announcement) => {
          const config = priorityConfig[announcement.priority];
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
                      <span>{announcement.author}</span>
                      <span>{announcement.publishedAt}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
