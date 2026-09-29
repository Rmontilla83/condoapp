"""Respaldo de los datos de Costa de Plata antes de convertirlos en demo.

    python respaldar.py <carpeta-destino>

Guarda en JSON (vía la API con service role) todo lo del condominio: unidades,
propietarios con sus nombres/correos/teléfonos REALES, cuotas, pagos, saldos,
notas de crédito, convenios, gastos y demás módulos. Además `reales.json`:
lo mínimo para restaurar (nombres y contactos de cada propietario, y el monto
REAL de septiembre y de la marina por unidad).

Ese respaldo contiene datos personales: queda solo en esta computadora.
"""
import json
import pathlib
import sys
import urllib.parse
import urllib.request

REPO = pathlib.Path(__file__).resolve().parents[3]
env = {}
for linea in (REPO / ".env.local").read_text(encoding="utf-8").splitlines():
    if "=" in linea and not linea.lstrip().startswith("#"):
        k, v = linea.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
ORG_NOMBRE = "Costa de Plata"


def get(ruta: str, params: dict) -> list:
    filas, desde = [], 0
    while True:
        q = urllib.parse.urlencode(params, safe=",().*!")
        req = urllib.request.Request(f"{URL}/rest/v1/{ruta}?{q}", headers={**H, "Range": f"{desde}-{desde + 999}"})
        with urllib.request.urlopen(req, timeout=120) as r:
            lote = json.loads(r.read())
        filas += lote
        if len(lote) < 1000:
            return filas
        desde += 1000


def main():
    destino = pathlib.Path(sys.argv[1])
    destino.mkdir(parents=True, exist_ok=True)
    org = get("organizations", {"select": "*", "name": f"eq.{ORG_NOMBRE}"})[0]
    oid = org["id"]
    datos = {"organization": org}
    datos["units"] = get("units", {"select": "*", "organization_id": f"eq.{oid}"})
    uids = [u["id"] for u in datos["units"]]
    datos["unit_members"] = get("unit_members", {"select": "*", "unit_id": f"in.({','.join(uids)})"})
    pids = sorted({m["profile_id"] for m in datos["unit_members"]})
    datos["profiles"] = get("profiles", {"select": "*", "id": f"in.({','.join(pids)})"})
    for t in ["invoices", "unit_credits", "credit_notes", "payment_plans", "charge_groups", "expense_records",
              "announcements", "access_passes", "maintenance_requests", "service_providers", "notifications",
              "exchange_rates", "common_areas", "guard_stations", "vendors", "expense_categories"]:
        datos[t] = get(t, {"select": "*", "organization_id": f"eq.{oid}"})
    iids = [i["id"] for i in datos["invoices"]]
    datos["transactions"] = []
    for i in range(0, len(iids), 150):
        datos["transactions"] += get("transactions", {"select": "*", "invoice_id": f"in.({','.join(iids[i:i + 150])})"})
    gids = [g["id"] for g in datos["charge_groups"]]
    datos["charge_group_members"] = get("charge_group_members", {"select": "*", "group_id": f"in.({','.join(gids)})"}) if gids else []
    aids = [a["id"] for a in datos["common_areas"]]
    datos["reservations"] = get("reservations", {"select": "*", "common_area_id": f"in.({','.join(aids)})"}) if aids else []
    datos["packages"] = get("packages", {"select": "*", "unit_id": f"in.({','.join(uids)})"})

    for nombre, filas in datos.items():
        (destino / f"{nombre}.json").write_text(json.dumps(filas, ensure_ascii=False, indent=1), encoding="utf-8")

    # ── Lo mínimo para restaurar ──
    perfiles = {p["id"]: p for p in datos["profiles"]}
    duenos = [m for m in datos["unit_members"] if m["role"] == "owner" and m["active"]]
    reales = {"organization_id": oid, "propietarios": {}, "cuotas": {}}
    for m in duenos:
        p = perfiles[m["profile_id"]]
        reales["propietarios"][p["id"]] = {"full_name": p["full_name"], "email": p["email"], "phone": p["phone"]}
    # Monto real por unidad y concepto (la cuota y su hermana «· saldo a favor» suman el cargo original).
    for i in datos["invoices"]:
        if i["status"] == "cancelled":
            continue
        base = i["description"].split(" · ")[0]
        if base not in ("Cuota 09/2026", "Marina 09/2026"):
            continue
        clave = f'{i["unit_id"]}|{base}'
        c = reales["cuotas"].setdefault(clave, {"unit_id": i["unit_id"], "description": base, "due_date": i["due_date"],
                                                "kind": i["kind"], "exchange_rate": i["exchange_rate"], "amount": 0})
        c["amount"] = round(c["amount"] + float(i["amount"]), 2)
    reales["cuotas"] = list(reales["cuotas"].values())
    reales["saldos_reales"] = [{"torre": "Torre A", "unidad": "3-5", "monto": 238.84}, {"torre": "Torre C", "unidad": "PB-2", "monto": 15.49}]
    (destino / "reales.json").write_text(json.dumps(reales, ensure_ascii=False, indent=1), encoding="utf-8")

    tot = {d: round(sum(c["amount"] for c in reales["cuotas"] if c["description"] == d), 2) for d in ("Cuota 09/2026", "Marina 09/2026")}
    print("respaldo en", destino)
    print({k: len(v) for k, v in datos.items() if isinstance(v, list)})
    print("propietarios:", len(reales["propietarios"]), "| cuotas reales:", len(reales["cuotas"]), tot)


if __name__ == "__main__":
    main()
