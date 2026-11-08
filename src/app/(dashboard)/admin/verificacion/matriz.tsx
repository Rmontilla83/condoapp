"use client";

import { useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icono } from "@/components/ui/icono";
import { tabla } from "@/components/contabilidad/ui";
import {
  CAMPOS,
  ETIQUETA_CAMPO,
  ETIQUETA_COLOR,
  type Color,
  type DatoVerificado,
  type FilaVerificacion,
  type HallazgoColectivo,
} from "@/lib/verificacion";
import { aclararDato, aclararHallazgo, reabrirDato } from "./actions";

const FORMA: Record<Color, string> = {
  verde: "rounded-full bg-emerald-600 text-white",
  amarillo: "rounded-[5px] bg-amber-400 text-amber-950",
  rojo: "rotate-45 rounded-[5px] bg-red-600 text-white",
};

const PASTILLA: Record<Color, string> = {
  verde: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amarillo: "border-amber-200 bg-amber-50 text-amber-800",
  rojo: "border-red-200 bg-red-50 text-red-700",
};

const boton = "rounded-lg bg-marine-deep px-4 py-2 text-sm font-medium text-frost disabled:opacity-50";
const filtro = (activo: boolean) =>
  `rounded-full border px-3 py-1.5 text-[13px] font-medium ${
    activo ? "border-marine-deep bg-marine-deep text-frost" : "border-border bg-card text-mute hover:text-marine-deep"
  }`;

/** La forma repite lo que dice el color, para que se lea también sin distinguirlo. */
function Marca({ color, aclarado = false }: { color: Color; aclarado?: boolean }) {
  const etiqueta = aclarado ? "Aclarado" : ETIQUETA_COLOR[color];
  return (
    <span
      role="img"
      aria-label={etiqueta}
      title={etiqueta}
      className={`inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center text-[13px] font-bold leading-none ${
        aclarado ? "rounded-full border-2 border-emerald-600 bg-card text-emerald-700" : FORMA[color]
      }`}
    >
      {color === "verde" ? (
        <Icono nombre="check" className="h-3.5 w-3.5 stroke-[3]" />
      ) : color === "amarillo" ? (
        <span aria-hidden>–</span>
      ) : (
        <span aria-hidden className="-rotate-45">!</span>
      )}
    </span>
  );
}

function Pastilla({ color }: { color: Color }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${PASTILLA[color]}`}>
      {ETIQUETA_COLOR[color]}
    </span>
  );
}

function FormularioAclarar({
  textoBoton,
  alEnviar,
}: {
  textoBoton: string;
  alEnviar: (nota: string) => Promise<{ error: string } | { success: true }>;
}) {
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError("");
          const r = await alEnviar(nota);
          if ("error" in r) setError(r.error);
          else window.location.reload();
        });
      }}
      className="space-y-2"
    >
      <label className="block text-[13px] text-marine-deep">
        Qué se aclaró y quién lo confirmó
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          maxLength={1000}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-cyan"
        />
      </label>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
      <button type="submit" disabled={pending} className={boton}>
        {pending ? "Guardando…" : textoBoton}
      </button>
    </form>
  );
}

function BotonReabrir({ id }: { id: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await reabrirDato(id);
            if ("error" in r) setError(r.error);
            else window.location.reload();
          })
        }
        className="text-[13px] font-medium text-cyan-ink underline underline-offset-2 disabled:opacity-50"
      >
        {pending ? "Reabriendo…" : "Reabrir"}
      </button>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
    </>
  );
}

function Dato({ dato, etiqueta }: { dato: DatoVerificado; etiqueta: string }) {
  const aclarado = Boolean(dato.aclaradoEn);
  return (
    <section className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <Marca color={dato.efectivo} aclarado={aclarado} />
        <h3 className="text-[14px] font-semibold text-marine-deep">{etiqueta}</h3>
        <span className="ml-auto">
          {aclarado ? (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
              Aclarado
            </span>
          ) : (
            <Pastilla color={dato.efectivo} />
          )}
        </span>
      </div>

      <dl className="space-y-1 text-[13px]">
        {dato.valorFuente && (
          <div>
            <dt className="inline text-mute">{dato.fuente}: </dt>
            <dd className="inline text-marine-deep tabular-nums">{dato.valorFuente}</dd>
          </div>
        )}
        {dato.valorPlanilla && (
          <div>
            <dt className="inline text-mute">Planilla: </dt>
            <dd className="inline text-marine-deep tabular-nums">{dato.valorPlanilla}</dd>
          </div>
        )}
        {!dato.valorFuente && dato.fuente && <p className="text-[12px] text-mute">Fuente: {dato.fuente}</p>}
      </dl>

      {dato.motivo && <p className="text-[13px] text-mute">{dato.motivo}</p>}

      {aclarado ? (
        <div className="space-y-1 rounded-lg bg-frost px-3 py-2 text-[13px]">
          <p className="text-marine-deep">{dato.aclaracion}</p>
          <p className="text-[12px] text-mute">
            {dato.aclaradoPor ?? "Administración"}, {dato.aclaradoEn}
          </p>
          <BotonReabrir id={dato.id} />
        </div>
      ) : (
        dato.estado !== "verde" && (
          <FormularioAclarar textoBoton="Marcar como aclarado" alEnviar={(nota) => aclararDato(dato.id, nota)} />
        )
      )}
    </section>
  );
}

function Hallazgo({ h }: { h: HallazgoColectivo }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          <h2 className="text-[15px] font-semibold text-marine-deep">{h.titulo}</h2>
          <p className="mt-1 text-[13px] text-mute">
            {h.pendientes} de {h.total} unidades con una misma causa. {h.motivo}
          </p>
        </div>
        {!abierto && (
          <button type="button" onClick={() => setAbierto(true)} className={boton}>
            Aclarar las {h.pendientes}
          </button>
        )}
      </div>
      {abierto && (
        <div className="mt-3 max-w-xl">
          <FormularioAclarar
            textoBoton={`Marcar las ${h.pendientes} como aclaradas`}
            alEnviar={(nota) => aclararHallazgo(h.titulo, nota)}
          />
        </div>
      )}
    </section>
  );
}

const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function Matriz({ filas, hallazgos }: { filas: FilaVerificacion[]; hallazgos: HallazgoColectivo[] }) {
  const [torre, setTorre] = useState("");
  const [color, setColor] = useState<Color | "">("");
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);

  const torres = useMemo(() => [...new Set(filas.map((f) => f.torre))], [filas]);
  const visibles = useMemo(() => {
    const q = normal(busqueda.trim());
    return filas.filter(
      (f) =>
        (!torre || f.torre === torre) &&
        (!color || f.general === color) &&
        (!q || normal(`${f.torre} ${f.unidad} ${f.propietario ?? ""}`).includes(q)),
    );
  }, [filas, torre, color, busqueda]);
  const detalle = filas.find((f) => f.unitId === abierta) ?? null;
  const pendientes = hallazgos.filter((h) => h.pendientes > 0);

  return (
    <>
      {pendientes.map((h) => (
        <Hallazgo key={h.titulo} h={h} />
      ))}

      <div className="rounded-2xl border border-border bg-card px-4 py-3 text-[13px] text-mute">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li className="flex items-center gap-2">
            <Marca color="verde" /> Completo y verificado
          </li>
          <li className="flex items-center gap-2">
            <Marca color="amarillo" /> Falta información
          </li>
          <li className="flex items-center gap-2">
            <Marca color="rojo" /> Diferencia por aclarar
          </li>
          <li className="flex items-center gap-2">
            <Marca color="verde" aclarado /> Aclarado por la administración
          </li>
        </ul>
        <p className="mt-2 text-[12px]">
          Alícuota y puesto se comparan con el documento registrado. Propietario, marina y contacto todavía no tienen
          documento: su verde significa que las fuentes coinciden, no que estén probados.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={filtro(torre === "")} onClick={() => setTorre("")} aria-pressed={torre === ""}>
          Todas
        </button>
        {torres.map((t) => (
          <button key={t} type="button" className={filtro(torre === t)} onClick={() => setTorre(t)} aria-pressed={torre === t}>
            Torre {t}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        {(["rojo", "amarillo", "verde"] as Color[]).map((c) => (
          <button
            key={c}
            type="button"
            className={filtro(color === c)}
            onClick={() => setColor(color === c ? "" : c)}
            aria-pressed={color === c}
          >
            {ETIQUETA_COLOR[c]}
          </button>
        ))}
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar unidad o propietario"
          aria-label="Buscar unidad o propietario"
          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-cyan sm:ml-auto sm:w-64"
        />
      </div>

      <div className={tabla.contenedor}>
        <table className="w-full min-w-[26rem] text-left text-[13px]">
          <thead className={tabla.thead}>
            <tr>
              <th scope="col" className={`${tabla.th} sticky left-0 z-10 bg-frost`}>
                Unidad
              </th>
              <th scope="col" className={`${tabla.th} hidden md:table-cell`}>
                Propietario
              </th>
              {CAMPOS.map((c) => (
                <th key={c} scope="col" className={`${tabla.th} text-center`}>
                  {ETIQUETA_CAMPO[c]}
                </th>
              ))}
              <th scope="col" className={`${tabla.th} text-center`}>
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={f.unitId} onClick={() => setAbierta(f.unitId)} className="group cursor-pointer hover:bg-frost/60">
                <td className={`${tabla.td} sticky left-0 z-10 bg-card align-middle group-hover:bg-frost`}>
                  <button type="button" className="whitespace-nowrap font-medium text-marine-deep underline-offset-2 hover:underline">
                    {f.torre} {f.unidad}
                  </button>
                </td>
                <td className={`${tabla.td} hidden max-w-[16rem] truncate align-middle text-marine-deep md:table-cell`}>
                  {f.propietario ?? "—"}
                </td>
                {CAMPOS.map((c) => {
                  const d = f.datos[c];
                  return (
                    <td key={c} className={`${tabla.td} text-center align-middle`}>
                      <span className="inline-flex">
                        {d ? <Marca color={d.efectivo} aclarado={Boolean(d.aclaradoEn)} /> : <Marca color="amarillo" />}
                      </span>
                    </td>
                  );
                })}
                <td className={`${tabla.td} text-center align-middle`}>
                  <Pastilla color={f.general} />
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={CAMPOS.length + 3} className={`${tabla.td} py-8 text-center text-mute`}>
                  Ninguna unidad coincide con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={detalle !== null} onOpenChange={(v) => !v && setAbierta(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {detalle && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Torre {detalle.torre}, {detalle.unidad}
                </DialogTitle>
                <DialogDescription>{detalle.propietario ?? "Sin propietario registrado"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {CAMPOS.map((c) => {
                  const d = detalle.datos[c];
                  return d ? <Dato key={c} dato={d} etiqueta={ETIQUETA_CAMPO[c]} /> : null;
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
