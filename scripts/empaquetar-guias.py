"""Genera `public/guias/*.html` a partir de `docs/guia-*.html`.

    python scripts/empaquetar-guias.py

Hay dos versiones de cada guía a propósito:

  docs/guia-*.html      El cuerpo pelado. Es lo que se publica como artifact:
                        la plataforma le pone su propio <!doctype> y <head>.
  public/guias/*.html   La página completa que se sirve desde atryum.net. Suma
                        esqueleto, viewport, canonical y Open Graph, porque el
                        link se le manda a la junta de un condominio y la
                        tarjeta de vista previa es lo primero que ven.

Se edita SIEMPRE `docs/` y se vuelve a correr esto. Editar `public/guias/` a
mano hace que las dos versiones se separen sin que nadie se entere.
"""

import pathlib
import re

GUIAS = [
    (
        "guia-propietario.html",
        "propietario.html",
        "Guía del Propietario · Atryum",
        "Cuánto debes, cómo lo pagas y en qué se está gastando la plata del edificio. "
        "El manual de Atryum para el propietario de apartamento.",
    ),
    (
        "guia-administracion.html",
        "administracion.html",
        "Guía de la Administración · Atryum",
        "Cobrar lo que corresponde, poder demostrar en qué se gastó y que las decisiones queden "
        "por escrito. El manual de Atryum para la junta de condominio.",
    ),
]

BASE = "https://atryum.net"


def envolver(cuerpo: str, titulo: str, descripcion: str, url: str) -> str:
    # El <title> y el <link> de fuentes ya vienen dentro del cuerpo; se extraen
    # para que no queden sueltos dentro del <body>.
    cuerpo = re.sub(r"<title>.*?</title>\s*", "", cuerpo, count=1, flags=re.S)
    enlaces = re.findall(r'<link rel="[^"]*"[^>]*>', cuerpo)
    for e in enlaces:
        cuerpo = cuerpo.replace(e + "\n", "", 1)
        cuerpo = cuerpo.replace(e, "", 1)

    estilo = re.search(r"<style>.*?</style>", cuerpo, re.S)
    css = estilo.group(0) if estilo else ""
    if estilo:
        cuerpo = cuerpo.replace(css, "", 1)

    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo}</title>
<meta name="description" content="{descripcion}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{BASE}{url}">
<link rel="icon" href="/icon-192.png">

<meta property="og:type" content="article">
<meta property="og:site_name" content="Atryum">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="{titulo}">
<meta property="og:description" content="{descripcion}">
<meta property="og:url" content="{BASE}{url}">
<meta property="og:image" content="{BASE}/brand/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{titulo}">
<meta name="twitter:description" content="{descripcion}">
<meta name="twitter:image" content="{BASE}/brand/og-image.png">

{chr(10).join(enlaces)}
{css}
</head>
<body>
{cuerpo.strip()}
</body>
</html>
"""


for origen, destino, titulo, desc in GUIAS:
    cuerpo = pathlib.Path("docs") / origen
    salida = pathlib.Path("public/guias") / destino
    html = envolver(
        cuerpo.read_text(encoding="utf-8"),
        titulo,
        desc,
        f"/guias/{destino.replace('.html', '')}",
    )
    salida.write_text(html, encoding="utf-8")
    print(f"{salida}  {len(html)//1024} KB")
    # Comprobaciones mínimas de que el empaquetado no rompió nada.
    assert html.count("<style>") == 1, f"{destino}: se perdió el CSS"
    assert "fonts.googleapis.com" in html, f"{destino}: se perdió el link de fuentes"
    assert html.count("<figure class=\"cap\">") >= 8, f"{destino}: faltan capturas"
    assert "<body>" in html and "</body>" in html
print("empaquetado OK")
