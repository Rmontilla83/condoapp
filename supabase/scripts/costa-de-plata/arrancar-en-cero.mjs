// Deja Costa de Plata en cero para empezar a operar de verdad.
//
//   node arrancar-en-cero.mjs <respaldo-real> <destino-del-respaldo> --ensayo     prueba todo y deshace
//   node arrancar-en-cero.mjs <respaldo-real> <destino-del-respaldo> --de-verdad  lo hace
//
// Reemplaza a restaurar.py, que volvía a emitir las cuotas de septiembre.
//
// BORRA toda la operación de demostración: cuotas, pagos, saldos, gastos, proveedores,
// comunicados, reservas, visitas, averías, paquetes, encuestas, presupuesto, técnicos,
// caseta, notificaciones, conversaciones con Atri, invitaciones, y la cuenta de pruebas.
//
// CONSERVA lo real: las 103 unidades con sus alícuotas, el grupo Marina con sus 62
// puestos, Caney y Parrillera, las categorías de gasto, la serie de tasas del BCV y el
// logo. Devuelve a cada propietario su nombre real y su correo provisional.
//
// Además deja el 5,69727854 % de la marina en su grupo y crea los centros de costo.
//
// Primero guarda un respaldo completo del estado actual, FUERA del repositorio porque
// tiene datos personales. Nada se borra si el respaldo falla.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const [respaldoReal, destino, modo] = process.argv.slice(2);
if (!respaldoReal || !destino || !["--ensayo", "--de-verdad"].includes(modo)) {
  console.error("Uso: node arrancar-en-cero.mjs <respaldo-real> <destino-del-respaldo> --ensayo|--de-verdad");
  process.exit(1);
}
const ensayo = modo === "--ensayo";

const env = {};
for (const linea of readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/)) {
  const i = linea.indexOf("=");
  if (i > 0 && !linea.trimStart().startsWith("#")) env[linea.slice(0, i).trim()] = linea.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const CLAVE = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: CLAVE, Authorization: `Bearer ${CLAVE}`, "Content-Type": "application/json" };

// El SQL va al proyecto enlazado y el REST al de .env.local: tienen que ser el mismo.
const enlazado = readFileSync(join(REPO, "supabase/.temp/project-ref"), "utf8").trim();
if (!URL_BASE.includes(`//${enlazado}.`)) throw new Error(`supabase link apunta a ${enlazado}, pero .env.local a ${URL_BASE}.`);

const reales = JSON.parse(readFileSync(join(respaldoReal, "reales.json"), "utf8"));
const ORG = reales.organization_id;
const CENTROS = ["General", "Piscina", "Marina", "Torre A", "Torre B", "Torre C"];
const CUENTA_PRUEBA = "prueba@costadeplata.test";
const ALICUOTA_MARINA = 5.69727854;

async function http(metodo, ruta, cuerpo) {
  const r = await fetch(URL_BASE + ruta, { method: metodo, headers: H, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${metodo} ${ruta}: ${r.status} ${texto.slice(0, 300)}`);
  return texto ? JSON.parse(texto) : null;
}

async function todas(ruta) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(URL_BASE + "/rest/v1/" + ruta, { headers: { ...H, Range: `${desde}-${desde + 999}` } });
    if (!r.ok) throw new Error(`GET ${ruta}: ${r.status} ${(await r.text()).slice(0, 300)}`);
    const lote = await r.json();
    filas.push(...lote);
    if (lote.length < 1000) return filas;
  }
}

function sql(texto) {
  const carpeta = mkdtempSync(join(tmpdir(), "arrancar-"));
  const archivo = join(carpeta, "q.sql");
  writeFileSync(archivo, texto);
  const p = spawnSync(`npx --yes supabase@2.118.0 db query --linked --output-format json --file "${archivo}"`, {
    cwd: REPO,
    encoding: "utf8",
    shell: true,
    maxBuffer: 50 * 1024 * 1024,
  });
  return { ok: p.status === 0, salida: `${p.stdout ?? ""}${p.stderr ?? ""}` };
}

function filasDe(salida) {
  const inicio = salida.indexOf("{");
  const fin = salida.lastIndexOf("}");
  return JSON.parse(salida.slice(inicio, fin + 1)).rows;
}

// ── 1. Lo que se va a tocar ──────────────────────────────────────────────────
const propietarios = Object.entries(reales.propietarios);
const provisionales = propietarios.filter(([, d]) => /\.(test|example|invalid|localhost)$/i.test(d.email)).length;
if (provisionales !== propietarios.length) throw new Error(`Hay ${propietarios.length - provisionales} correos reales en el respaldo: revisar antes de seguir.`);
const perfiles = await todas(`profiles?id=in.(${propietarios.map(([id]) => id).join(",")})&select=id`);
if (perfiles.length !== propietarios.length) throw new Error(`Faltan cuentas: ${perfiles.length} de ${propietarios.length}.`);

const { rows: objetos } = JSON.parse(
  (() => {
    const r = sql(`select bucket_id, name from storage.objects
      where bucket_id in ('payment-receipts', 'maintenance-photos')
        and (name like '${ORG}/%' or name like 'expenses/${ORG}/%' or name like 'incomes/${ORG}/%');`);
    return r.salida.slice(r.salida.indexOf("{"), r.salida.lastIndexOf("}") + 1);
  })(),
);
console.log(`Propietarios a restaurar: ${propietarios.length}. Archivos a borrar: ${objetos.length}.`);

// ── 2. Respaldo del estado actual ────────────────────────────────────────────
if (!ensayo) {
  if (existsSync(destino)) throw new Error(`Ya existe ${destino}: elige otra carpeta para no pisar un respaldo.`);
  mkdirSync(destino, { recursive: true });
  const porOrg = ["organizations?id=eq." + ORG];
  for (const t of ["units", "invoices", "credit_notes", "payment_plans", "unit_credits", "notifications", "packages", "expense_records", "vendors", "maintenance_requests", "org_budgets", "decisions", "access_passes", "announcements", "service_providers", "guard_stations", "concierge_messages", "auth_events", "admin_invitations", "charge_groups", "common_areas", "expense_categories", "exchange_rates", "fee_breakdown", "fee_type_amounts", "other_incomes", "reserve_fund_movements", "cost_centers"]) {
    porOrg.push(`${t}?organization_id=eq.${ORG}`);
  }
  for (const ruta of porOrg) {
    const nombre = ruta.split("?")[0];
    writeFileSync(join(destino, `${nombre}.json`), JSON.stringify(await todas(`${ruta}&select=*`), null, 1));
  }
  const hijos = {
    transactions: "transactions?select=*,invoices!inner(organization_id)&invoices.organization_id=eq." + ORG,
    unit_members: "unit_members?select=*,units!inner(organization_id)&units.organization_id=eq." + ORG,
    unit_invitations: "unit_invitations?select=*,units!inner(organization_id)&units.organization_id=eq." + ORG,
    unit_access_codes: "unit_access_codes?select=*,units!inner(organization_id)&units.organization_id=eq." + ORG,
    reservations: "reservations?select=*,common_areas!inner(organization_id)&common_areas.organization_id=eq." + ORG,
    charge_group_members: "charge_group_members?select=*,charge_groups!inner(organization_id)&charge_groups.organization_id=eq." + ORG,
    decision_questions: "decision_questions?select=*,decisions!inner(organization_id)&decisions.organization_id=eq." + ORG,
    decision_responses: "decision_responses?select=*,decision_questions!inner(decisions!inner(organization_id))&decision_questions.decisions.organization_id=eq." + ORG,
    org_budget_items: "org_budget_items?select=*,org_budgets!inner(organization_id)&org_budgets.organization_id=eq." + ORG,
    maintenance_status_log: "maintenance_status_log?select=*,maintenance_requests!inner(organization_id)&maintenance_requests.organization_id=eq." + ORG,
    access_logs: "access_logs?select=*,access_passes!inner(organization_id)&access_passes.organization_id=eq." + ORG,
  };
  for (const [nombre, ruta] of Object.entries(hijos)) {
    writeFileSync(join(destino, `${nombre}.json`), JSON.stringify(await todas(ruta), null, 1));
  }
  writeFileSync(join(destino, "profiles.json"), JSON.stringify(await todas(`profiles?select=*`), null, 1));
  writeFileSync(join(destino, "storage_objects.json"), JSON.stringify(objetos, null, 1));
  console.log("Respaldo guardado en", destino);
}

// ── 3. La transacción ────────────────────────────────────────────────────────
const lit = (v) => `'${String(v).replace(/'/g, "''")}'`;
const centrosSql = CENTROS.map((n, i) => `(v_org, ${lit(n)}, ${i})`).join(", ");
const resultado = sql(`
DO $$
DECLARE
  v_org uuid := ${lit(ORG)};
  v_cuentas uuid[] := ARRAY(SELECT id FROM profiles WHERE email IN ('rafaelmontilla8@gmail.com', 'iker.ascencion@gmail.com', ${lit(CUENTA_PRUEBA)}));
  v_antes jsonb;
  v_despues jsonb;
BEGIN
  PERFORM set_config('atryum.mantenimiento', 'on', true);

  v_antes := jsonb_build_object(
    'cuotas', (SELECT count(*) FROM invoices WHERE organization_id = v_org),
    'gastos', (SELECT count(*) FROM expense_records WHERE organization_id = v_org),
    'comunicados', (SELECT count(*) FROM announcements WHERE organization_id = v_org),
    'invitaciones_admin', (SELECT count(*) FROM admin_invitations WHERE organization_id = v_org),
    'membresias_del_equipo', (SELECT count(*) FROM unit_members WHERE profile_id = ANY(v_cuentas))
  );

  DELETE FROM payment_plans WHERE organization_id = v_org;
  DELETE FROM credit_notes WHERE organization_id = v_org;
  DELETE FROM unit_credits WHERE organization_id = v_org;
  DELETE FROM invoices WHERE organization_id = v_org;
  DELETE FROM notifications WHERE organization_id = v_org;
  DELETE FROM packages WHERE organization_id = v_org;
  DELETE FROM expense_records WHERE organization_id = v_org;
  DELETE FROM other_incomes WHERE organization_id = v_org;
  DELETE FROM reserve_fund_movements WHERE organization_id = v_org;
  DELETE FROM vendors WHERE organization_id = v_org;
  DELETE FROM maintenance_requests WHERE organization_id = v_org;
  DELETE FROM org_budgets WHERE organization_id = v_org;
  DELETE FROM decisions WHERE organization_id = v_org;
  DELETE FROM access_passes WHERE organization_id = v_org;
  DELETE FROM reservations r USING common_areas a WHERE a.id = r.common_area_id AND a.organization_id = v_org;
  DELETE FROM announcements WHERE organization_id = v_org;
  DELETE FROM service_providers WHERE organization_id = v_org;
  DELETE FROM guard_stations WHERE organization_id = v_org;
  DELETE FROM concierge_messages WHERE organization_id = v_org;
  DELETE FROM auth_events WHERE organization_id = v_org;
  DELETE FROM admin_invitations WHERE organization_id = v_org;
  DELETE FROM unit_invitations i USING units u WHERE u.id = i.unit_id AND u.organization_id = v_org;
  DELETE FROM unit_access_codes c USING units u WHERE u.id = c.unit_id AND u.organization_id = v_org;
  DELETE FROM unit_members m USING units u
   WHERE u.id = m.unit_id AND u.organization_id = v_org AND m.profile_id = ANY(v_cuentas);

  UPDATE organizations
     SET receipt_seq = 0, credit_note_seq = 0, late_fee_pct = NULL, late_fee_acta = NULL,
         fee_base_amount = NULL, reserve_fund_pct = NULL, reserve_fund_acta = NULL,
         contact_phone = NULL, contact_email = NULL, office_hours = NULL, concierge_notes = NULL,
         bank_accounts = '[]'::jsonb
   WHERE id = v_org;

  -- La marina explica el faltante de la hoja de alícuotas. No reparte nada ni da votos.
  UPDATE charge_groups SET aliquot = ${ALICUOTA_MARINA} WHERE organization_id = v_org AND name = 'Marina';

  INSERT INTO cost_centers (organization_id, name, position) VALUES ${centrosSql}
    ON CONFLICT (organization_id, lower(btrim(name))) DO NOTHING;

  -- El equipo vuelve a su estado base: sin condominio y sin «ver como».
  UPDATE profiles SET organization_id = NULL, view_as = NULL
   WHERE email IN ('rafaelmontilla8@gmail.com', 'iker.ascencion@gmail.com');

  v_despues := jsonb_build_object(
    'unidades', (SELECT count(*) FROM units WHERE organization_id = v_org),
    'propietarios', (SELECT count(DISTINCT m.profile_id) FROM unit_members m JOIN units u ON u.id = m.unit_id WHERE u.organization_id = v_org AND m.role = 'owner' AND m.active),
    'unidades_sin_propietario', (SELECT count(*) FROM units u WHERE u.organization_id = v_org AND NOT EXISTS (SELECT 1 FROM unit_members m WHERE m.unit_id = u.id AND m.role = 'owner' AND m.active)),
    'suma_unidades', (SELECT sum(aliquot) FROM units WHERE organization_id = v_org),
    'suma_con_marina', (SELECT sum(aliquot) FROM units WHERE organization_id = v_org) + (SELECT sum(aliquot) FROM charge_groups WHERE organization_id = v_org AND active),
    'puestos_marina', (SELECT count(*) FROM charge_group_members m JOIN charge_groups g ON g.id = m.group_id WHERE g.organization_id = v_org AND g.name = 'Marina'),
    'areas_activas', (SELECT string_agg(name, ', ' ORDER BY name) FROM common_areas WHERE organization_id = v_org AND is_active),
    'centros', (SELECT count(*) FROM cost_centers WHERE organization_id = v_org),
    'categorias', (SELECT count(*) FROM expense_categories WHERE organization_id = v_org),
    'tasas', (SELECT count(*) FROM exchange_rates WHERE organization_id = v_org),
    'cuotas', (SELECT count(*) FROM invoices WHERE organization_id = v_org),
    'libro', (SELECT count(*) FROM libro_diario WHERE organization_id = v_org)
  );

  IF (v_despues->>'unidades')::int <> 103 THEN RAISE EXCEPTION 'Deberían quedar 103 unidades: %', v_despues; END IF;
  IF (v_despues->>'unidades_sin_propietario')::int <> 0 THEN RAISE EXCEPTION 'Quedaron unidades sin propietario: %', v_despues; END IF;
  IF abs((v_despues->>'suma_con_marina')::numeric - 100) > 0.0001 THEN RAISE EXCEPTION 'No suma 100: %', v_despues; END IF;
  IF (v_despues->>'puestos_marina')::int <> 62 THEN RAISE EXCEPTION 'Marina debería tener 62: %', v_despues; END IF;
  IF (v_despues->>'libro')::int <> 0 THEN RAISE EXCEPTION 'El libro debería quedar vacío: %', v_despues; END IF;

  IF ${ensayo ? "true" : "false"} THEN
    RAISE EXCEPTION 'ENSAYO OK (nada se guardó). Antes: %. Después: %', v_antes, v_despues;
  END IF;
  RAISE NOTICE 'ARRANCADO: %', v_despues;
END $$;
`);

if (ensayo) {
  const i = resultado.salida.indexOf("ENSAYO OK");
  if (i < 0) {
    console.error(resultado.salida.slice(-2500));
    process.exit(1);
  }
  console.log(resultado.salida.slice(i, i + 1400).split('\\n')[0]);
  console.log("Ensayo terminado: no se cambió nada.");
  process.exit(0);
}
if (!resultado.ok) {
  console.error(resultado.salida.slice(-2500));
  process.exit(1);
}
console.log("Operación de demostración borrada.");

// ── 4. Archivos de la demostración ───────────────────────────────────────────
const porBalde = new Map();
for (const o of objetos) porBalde.set(o.bucket_id, [...(porBalde.get(o.bucket_id) ?? []), o.name]);
for (const [balde, nombres] of porBalde) {
  for (let i = 0; i < nombres.length; i += 100) {
    await http("DELETE", `/storage/v1/object/${balde}`, { prefixes: nombres.slice(i, i + 100) });
  }
}

// ── 5. Nombres reales ────────────────────────────────────────────────────────
for (const [id, datos] of propietarios) {
  await http("PUT", `/auth/v1/admin/users/${id}`, { email: datos.email, email_confirm: true });
  await http("PATCH", `/rest/v1/profiles?id=eq.${id}`, datos);
}
console.log("Propietarios con su nombre real:", propietarios.length);

// ── 6. La cuenta de pruebas ──────────────────────────────────────────────────
const { users } = await http("GET", "/auth/v1/admin/users?per_page=1000");
for (const u of users) {
  if (u.email === CUENTA_PRUEBA) {
    await http("DELETE", `/auth/v1/admin/users/${u.id}`);
    console.log("Cuenta de pruebas eliminada.");
  }
}

// ── 7. Comprobación final ────────────────────────────────────────────────────
const fin = sql(`select json_build_object(
  'cuotas', (select count(*) from invoices where organization_id = ${lit(ORG)}),
  'gastos', (select count(*) from expense_records where organization_id = ${lit(ORG)}),
  'comunicados', (select count(*) from announcements where organization_id = ${lit(ORG)}),
  'cuenta_prueba', (select count(*) from auth.users where email = ${lit(CUENTA_PRUEBA)}),
  'correos_demo', (select count(*) from profiles where organization_id = ${lit(ORG)} and email like '%@costadeplata.test' and full_name is null),
  'propietarios_que_ya_entraron', (select count(*) from auth.users u join unit_members m on m.profile_id = u.id join units un on un.id = m.unit_id where un.organization_id = ${lit(ORG)} and u.last_sign_in_at is not null)
) r;`);
console.log(JSON.stringify(filasDe(fin.salida)[0].r));
