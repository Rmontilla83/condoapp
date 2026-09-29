"""Convierte a los propietarios de Costa de Plata en personajes ficticios.

    python anonimizar.py <carpeta-respaldo>

- Nombre, correo (@costadeplata.test, no recibe nada) y teléfono (0414-555-xxxx,
  numeración ficticia) nuevos para cada propietario, en perfiles y en Auth.
- Crea el super admin de pruebas prueba@costadeplata.test (solo entra con clave:
  el código por correo no le llega a nadie).
- Guarda en la carpeta del respaldo `ficticios.json` (id → nombre ficticio).

Los reales quedan en reales.json del respaldo; restaurar.py los devuelve.
"""
import hashlib
import json
import pathlib
import sys
import unicodedata
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

NOMBRES = ["Andrea", "Luis", "Mariana", "Carlos", "Valentina", "José", "Gabriela", "Daniel", "Sofía", "Miguel",
           "Camila", "Rafael", "Isabel", "Alejandro", "Lucía", "Fernando", "Paola", "Ricardo", "Elena", "Jorge",
           "Verónica", "Héctor", "Natalia", "Oscar", "Carolina", "Manuel", "Adriana", "Pedro", "Daniela", "Arturo",
           "Mónica", "Gustavo", "Beatriz", "Eduardo", "Patricia", "Andrés", "Rosa", "Víctor", "Laura", "Samuel"]
APELLIDOS = ["Marcano", "Rivas", "Salazar", "Figueroa", "Guevara", "Bermúdez", "Ocando", "Lugo", "Castillo", "Aponte",
             "Villalba", "Moreno", "Carrasquel", "Blanco", "Urdaneta", "Quintero", "Palacios", "Mendoza", "Ferrer", "Colina",
             "Rondón", "Bello", "Ledezma", "Acosta", "Silva", "Marín", "Hurtado", "Montiel", "Zambrano", "Parra",
             "Cedeño", "Brito", "Chacón", "Escalona", "Farías", "Graterol", "Linares", "Naranjo", "Sifontes", "Tovar"]


def http(metodo, ruta, cuerpo=None):
    r = urllib.request.Request(URL + ruta, headers=H, method=metodo,
                               data=json.dumps(cuerpo).encode() if cuerpo is not None else None)
    with urllib.request.urlopen(r, timeout=60) as x:
        b = x.read()
        return json.loads(b) if b else None


def slug(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return "".join(c if c.isalnum() else "." for c in s).strip(".")


def main():
    respaldo = pathlib.Path(sys.argv[1])
    reales = json.loads((respaldo / "reales.json").read_text(encoding="utf-8"))
    ids = sorted(reales["propietarios"])  # orden estable
    usados = {slug(p["full_name"] or "") for p in reales["propietarios"].values()}

    asignados, ficticios = set(), {}
    for pid in ids:
        h = int(hashlib.sha256(pid.encode()).hexdigest(), 16)
        i = 0
        while True:
            n = NOMBRES[(h + i) % len(NOMBRES)]
            a = APELLIDOS[(h // 7 + i * 13) % len(APELLIDOS)]
            nombre = f"{n} {a}"
            if nombre not in asignados and slug(nombre) not in usados:
                break
            i += 1
        asignados.add(nombre)
        correo = f"{slug(n)}.{slug(a)}@costadeplata.test"
        telefono = f"+58414555{(h % 9000) + 1000}"
        ficticios[pid] = {"full_name": nombre, "email": correo, "phone": telefono}

    for pid, f in ficticios.items():
        http("PUT", f"/auth/v1/admin/users/{pid}", {"email": f["email"], "email_confirm": True})
        http("PATCH", f"/rest/v1/profiles?id=eq.{pid}", f)
    (respaldo / "ficticios.json").write_text(json.dumps(ficticios, ensure_ascii=False, indent=1), encoding="utf-8")
    print("propietarios renombrados:", len(ficticios))

    # ── Super admin de pruebas ──
    correo, clave = "prueba@costadeplata.test", "prueba123456"
    try:
        u = http("POST", "/auth/v1/admin/users", {"email": correo, "password": clave, "email_confirm": True})
        uid = u["id"]
    except urllib.error.HTTPError as e:  # ya existía: se le reponen clave y rol
        if e.code not in (400, 409, 422):
            raise
        lista = http("GET", "/auth/v1/admin/users?per_page=1000")["users"]
        uid = next(x["id"] for x in lista if x["email"] == correo)
        http("PUT", f"/auth/v1/admin/users/{uid}", {"password": clave, "email_confirm": True})
    http("PATCH", f"/rest/v1/profiles?id=eq.{uid}",
         {"role": "super_admin", "full_name": "Junta · cuenta de prueba", "organization_id": None, "view_as": None})
    print("super admin de pruebas:", correo, uid)


if __name__ == "__main__":
    main()
