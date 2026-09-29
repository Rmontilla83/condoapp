"""Devuelve Costa de Plata del modo demo a sus datos REALES.

    python restaurar.py <carpeta-respaldo> --ensayo        prueba el SQL y deshace todo
    python restaurar.py <carpeta-respaldo>                 restaura de verdad
    python restaurar.py <carpeta-respaldo> --quitar-prueba además borra prueba@costadeplata.test

Qué hace:
 1. Borra toda la operación de demo del condominio (cuotas, pagos, saldos,
    notas, convenios, gastos, avisos, reservas, pases, averías, paquetes).
 2. Vuelve a emitir las cuotas REALES de septiembre y de la marina, con la
    numeración desde 1, y carga los saldos a favor reales (A 3-5 y C PB-2).
 3. Devuelve a cada propietario su nombre, correo y teléfono reales.

Antes de correrlo de verdad, conviene respaldar el estado demo con respaldar.py.
"""
import json
import pathlib
import subprocess
import sys
import tempfile
import urllib.request

REPO = pathlib.Path(__file__).resolve().parents[3]
env = {}
for linea in (REPO / ".env.local").read_text(encoding="utf-8").splitlines():
    if "=" in linea and not linea.lstrip().startswith("#"):
        k, v = linea.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}


def http(metodo, ruta, cuerpo=None):
    r = urllib.request.Request(URL + ruta, headers=H, method=metodo,
                               data=json.dumps(cuerpo).encode() if cuerpo is not None else None)
    with urllib.request.urlopen(r, timeout=60) as x:
        b = x.read()
        return json.loads(b) if b else None


def sql_literal(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def main():
    respaldo = pathlib.Path(sys.argv[1])
    ensayo = "--ensayo" in sys.argv
    reales = json.loads((respaldo / "reales.json").read_text(encoding="utf-8"))

    filas = ",\n      ".join(
        f"({sql_literal(c['unit_id'])}::uuid, {c['amount']}, {sql_literal(c['description'])}, {sql_literal(c['due_date'])}::date, "
        f"{sql_literal(c['kind'])}, {c['exchange_rate'] if c['exchange_rate'] is not None else 'NULL'})"
        for c in sorted(reales["cuotas"], key=lambda c: (c["description"], c["unit_id"]))
    )
    saldos = ",\n      ".join(f"({sql_literal(s['torre'])}, {sql_literal(s['unidad'])}, {s['monto']})" for s in reales["saldos_reales"])
    sql = f"""
DO $$
DECLARE v_org uuid := {sql_literal(reales['organization_id'])}; v_actor uuid; v_n jsonb;
BEGIN
  SELECT id INTO v_actor FROM profiles WHERE email = 'rafaelmontilla8@gmail.com';
  PERFORM set_config('atryum.mantenimiento', 'on', true);
  DELETE FROM payment_plans WHERE organization_id = v_org;
  DELETE FROM credit_notes WHERE organization_id = v_org;
  DELETE FROM unit_credits WHERE organization_id = v_org;
  DELETE FROM invoices WHERE organization_id = v_org;
  DELETE FROM notifications WHERE organization_id = v_org;
  DELETE FROM packages WHERE organization_id = v_org;
  DELETE FROM expense_records WHERE organization_id = v_org;
  DELETE FROM vendors WHERE organization_id = v_org;
  DELETE FROM maintenance_requests WHERE organization_id = v_org;
  DELETE FROM access_passes WHERE organization_id = v_org;
  DELETE FROM reservations r USING common_areas a WHERE a.id = r.common_area_id AND a.organization_id = v_org;
  DELETE FROM announcements WHERE organization_id = v_org;
  DELETE FROM service_providers WHERE organization_id = v_org;
  DELETE FROM unit_members um USING units u WHERE u.id = um.unit_id AND u.organization_id = v_org
     AND um.profile_id = v_actor AND um.role = 'tenant';
  UPDATE organizations SET receipt_seq = 0, credit_note_seq = 0, late_fee_pct = NULL, late_fee_acta = NULL,
         contact_phone = NULL, contact_email = NULL, office_hours = NULL, concierge_notes = NULL, bank_accounts = '[]'::jsonb
   WHERE id = v_org;

  INSERT INTO invoices (organization_id, unit_id, amount, description, due_date, status, kind, exchange_rate, amount_bs, created_at)
  SELECT v_org, x.unit_id, x.amount, x.description, x.due_date, 'pending', x.kind, x.tasa,
         CASE WHEN x.tasa IS NOT NULL THEN round(x.amount * x.tasa, 2) END, '2026-09-28 09:00-04'
    FROM (VALUES
      {filas}
    ) AS x(unit_id, amount, description, due_date, kind, tasa);

  INSERT INTO unit_credits (organization_id, unit_id, amount, kind, note, created_by)
  SELECT v_org, u.id, s.monto, 'deposit', 'Saldo a favor al 31/08/2026 (planilla de la junta)', v_actor
    FROM (VALUES {saldos}) AS s(torre, apto, monto)
    JOIN units u ON u.organization_id = v_org AND u.block = s.torre AND u.unit_number = s.apto;
  PERFORM aplicar_saldo_a_favor(u.id, v_actor) FROM units u
   WHERE u.organization_id = v_org AND EXISTS (SELECT 1 FROM unit_credits c WHERE c.unit_id = u.id);

  v_n := jsonb_build_object(
    'cuota_09', (SELECT sum(amount) FROM invoices WHERE organization_id = v_org AND description = 'Cuota 09/2026'),
    'marina_09', (SELECT sum(amount) FROM invoices WHERE organization_id = v_org AND description = 'Marina 09/2026'),
    'recibos', (SELECT count(*) FROM invoices WHERE organization_id = v_org),
    'ultimo_numero', (SELECT receipt_seq FROM organizations WHERE id = v_org),
    'saldo_favor_neto', (SELECT sum(amount) FROM unit_credits WHERE organization_id = v_org));
  IF {'true' if ensayo else 'false'} THEN RAISE EXCEPTION 'ENSAYO OK (nada se guardó): %', v_n; END IF;
  RAISE NOTICE 'RESTAURADO: %', v_n;
END $$;
"""
    tmp = tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8")
    tmp.write(sql)
    tmp.close()
    p = subprocess.run(["npx", "--yes", "supabase@2.118.0", "db", "query", "--linked", "--output-format", "json", "--file", tmp.name],
                       cwd=REPO, capture_output=True, text=True, encoding="utf-8", shell=True)
    salida = (p.stdout + p.stderr)
    if ensayo:
        print(salida[salida.find("ENSAYO"):][:400] if "ENSAYO OK" in salida else salida[-1500:])
        return
    if p.returncode != 0:
        print(salida[-2000:])
        sys.exit(1)
    print("operación restaurada")

    for pid, datos in reales["propietarios"].items():
        http("PUT", f"/auth/v1/admin/users/{pid}", {"email": datos["email"], "email_confirm": True})
        http("PATCH", f"/rest/v1/profiles?id=eq.{pid}", datos)
    print("propietarios restaurados:", len(reales["propietarios"]))

    if "--quitar-prueba" in sys.argv:
        lista = http("GET", "/auth/v1/admin/users?per_page=1000")["users"]
        for u in lista:
            if u["email"] == "prueba@costadeplata.test":
                http("DELETE", f"/auth/v1/admin/users/{u['id']}")
                print("cuenta de prueba eliminada")


if __name__ == "__main__":
    main()
