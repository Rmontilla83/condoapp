import type { Metadata } from "next";
import { PaginaLegal } from "@/components/legal/pagina-legal";

export const metadata: Metadata = { title: "Condiciones de uso · Atryum" };

export default function TerminosPage() {
  return (
    <PaginaLegal titulo="Condiciones de uso">
      <section>
        <h2>Qué es Atryum</h2>
        <p>
          Atryum es una aplicación para administrar condominios. Tu condominio decidió usarla, y estas condiciones explican cómo funciona y qué puedes esperar de ella. Al entrar y aceptarlas, quedas de acuerdo con ellas.
        </p>
      </section>
      <section>
        <h2>Quién decide y quién responde</h2>
        <p>
          La junta de condominio y la administración deciden cuánto se cobra, qué se aprueba y qué se publica. También cargan y revisan la información. Atryum es la herramienta: no administra tu condominio ni toma decisiones por él.
        </p>
      </section>
      <section>
        <h2>Lo que Atryum no hace</h2>
        <ul>
          <li>No recibe, no procesa y no custodia dinero. Los pagos van directo a las cuentas de tu condominio.</li>
          <li>No confirma pagos por sí sola: una persona de la administración los compara con el banco.</li>
          <li>No emite facturas fiscales.</li>
          <li>No sustituye al contador, al abogado ni a los libros legales del condominio.</li>
        </ul>
      </section>
      <section>
        <h2>Funciones que necesitan tu criterio</h2>
        <ul>
          <li>La tasa del día viene de un servicio externo que publica la tasa del BCV. Puede retrasarse o fallar.</li>
          <li>Atri, el asistente, es automático y puede equivocarse. Sus respuestas orientan, pero no son comunicación oficial ni asesoría.</li>
          <li>Los técnicos recomendados son un directorio que carga la administración. Cada quien trata directo con ellos y asume el resultado.</li>
          <li>Los códigos de visita apoyan el control de acceso, pero no reemplazan a la vigilancia ni garantizan la seguridad del conjunto.</li>
          <li>Los correos y avisos dependen de proveedores externos y pueden no llegar.</li>
          <li>Las encuestas y asambleas son herramientas de apoyo. Su validez depende de cumplir la ley y el documento de condominio.</li>
        </ul>
      </section>
      <section>
        <h2>Disponibilidad</h2>
        <p>
          Atryum se ofrece tal como está en cada momento. Hacemos lo razonable para mantenerla funcionando y corregir errores, pero puede tener fallas, interrupciones o cambios. Conviene que el condominio guarde sus propias copias de la información importante.
        </p>
      </section>
      <section>
        <h2>Responsabilidad</h2>
        <p>
          En lo que la ley lo permita, Atryum y quienes la desarrollan no responden por daños que vengan del uso de la aplicación o de no poder usarla, ni por decisiones tomadas con su información. Esto no cubre el dolo ni la culpa grave, ni lo que la ley no permita renunciar.
        </p>
      </section>
      <section>
        <h2>Tu cuenta</h2>
        <p>
          Entras con tu correo y un código de un solo uso. Cuida el acceso a ese correo y a tu teléfono, y usa la aplicación solo para lo que corresponde a tu unidad. Lo que hagas con tu cuenta queda registrado.
        </p>
      </section>
      <section>
        <h2>Cambios y ley aplicable</h2>
        <p>
          Podemos cambiar estas condiciones. Si eso pasa, te las volveremos a mostrar al entrar. Se rigen por las leyes de la República Bolivariana de Venezuela. Si tienes dudas, escribe a <a href="mailto:hola@atryum.net" className="underline">hola@atryum.net</a>.
        </p>
      </section>
    </PaginaLegal>
  );
}
