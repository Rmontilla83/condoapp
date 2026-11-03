import type { Metadata } from "next";
import { PaginaLegal } from "@/components/legal/pagina-legal";

export const metadata: Metadata = { title: "Privacidad · Atryum" };

export default function PrivacidadPage() {
  return (
    <PaginaLegal titulo="Aviso de privacidad">
      <section>
        <h2>Qué datos se usan</h2>
        <ul>
          <li>Tu nombre, correo y teléfono, y la unidad que te corresponde.</li>
          <li>Tus cuotas, pagos, comprobantes y saldos.</li>
          <li>Lo que registras en la aplicación: reservas, visitas, paquetes, reportes y votos.</li>
          <li>Las preguntas que le haces a Atri, el asistente.</li>
        </ul>
      </section>
      <section>
        <h2>Para qué se usan</h2>
        <p>
          Para administrar el condominio: cobrar, llevar las cuentas, avisarte de lo que te toca y prestarte los servicios de la aplicación. También para corregir errores y mejorar Atryum. No vendemos tus datos.
        </p>
      </section>
      <section>
        <h2>Quién los ve</h2>
        <p>
          La administración de tu condominio ve lo necesario para administrar. Lo que ven los demás vecinos depende de lo que tu condominio decida publicar. El equipo de Atryum solo entra a los datos para cargarlos, dar soporte, corregir errores y mejorar la aplicación.
        </p>
      </section>
      <section>
        <h2>Dónde se guardan</h2>
        <p>
          Se guardan fuera de Venezuela, con proveedores externos: Supabase y Vercel para la base de datos y la aplicación, Resend para los correos, y Anthropic para responder las preguntas a Atri cuando funciona con inteligencia artificial.
        </p>
      </section>
      <section>
        <h2>Cuánto tiempo se conservan</h2>
        <p>
          Mientras tu condominio use Atryum. Los recibos y los registros contables no se borran, porque respaldan las cuentas del condominio. Al dejar de usar la aplicación, el condominio puede pedir una copia de sus datos.
        </p>
      </section>
      <section>
        <h2>Tus derechos</h2>
        <p>
          Puedes pedir acceso a tus datos, corregirlos o solicitar que se eliminen cuando corresponda, conforme al artículo 28 de la Constitución. Pídelo a la administración de tu condominio o escribe a <a href="mailto:hola@atryum.net" className="underline">hola@atryum.net</a>.
        </p>
      </section>
      <section>
        <h2>Seguridad</h2>
        <p>
          Aplicamos medidas razonables: acceso con código de un solo uso, permisos por rol y datos separados por condominio. Ningún sistema es infalible. Si detectas algo extraño, avísanos.
        </p>
      </section>
    </PaginaLegal>
  );
}
