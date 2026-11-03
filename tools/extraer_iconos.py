"""Recorta cada ícono de los PDFs originales y lo guarda como PNG transparente en img/.
Uso (desde la raíz del repo):  python tools/extraer_iconos.py
"""
import os, sys
import pymupdf

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTES = os.path.join(RAIZ, "fuentes")
SALIDA = os.path.join(RAIZ, "img")
DPI = 300

# Bordes de la grilla en puntos PDF (medidos de las líneas punteadas de cada PDF).
CI_X = [28, 163, 298, 432, 567]          # Check In: 4 columnas
CO_X = [621, 758, 893, 1028, 1163]       # Check Out: 4 columnas
FILAS = [56, 164, 272, 380, 487, 595]    # 5 filas, iguales en Check In y Check Out
OF_X = [96, 230, 365, 499]               # bloque OFRECEMOS: 3 columnas
OF_Y = [603, 711, 819]                   #                   2 filas
PE_X = [691, 826, 960, 1095]             # post entrega (abajo del Check Out): 3 columnas
PE_Y = [635, 746]
AG_X = [35, 290, 551, 806]               # Agendamiento: 3 columnas
AG_Y = [180, 401, 622, 843, 1064]        #               4 filas

def grilla(ids, xs, ys):
    """Asigna ids a celdas de izquierda a derecha y de arriba hacia abajo."""
    celdas, n = {}, 0
    for f in range(len(ys) - 1):
        for c in range(len(xs) - 1):
            if n < len(ids) and ids[n]:
                celdas[ids[n]] = (xs[c], ys[f], xs[c + 1], ys[f + 1])
            n += 1
    return celdas

CHECK_IN = grilla([
    "ci_datos_cliente", "ci_nro_cono", "ci_bocina_luces", "ci_protecciones",
    "ci_chequeo_errores", "ci_combustible_km", "ci_verificacion_ocular", "ci_apertura_capot",
    "ci_aceite_filtro", "ci_manual_garantia", "ci_baul", "ci_rueda_kit",
    "ci_objetos_valor", "ci_trabajos_adicionales", "ci_prueba_manejo", "ci_recall",
    "ci_explicacion_trabajos", "ci_lavado", "ci_consult_bateria", "ci_venta_consultiva",
], CI_X, FILAS)
CHECK_IN.update(grilla([
    "of_valor_servicio", "of_formas_pago", "of_sala_espera",
    "of_hora_checkout", "of_tarjeta_checkin", "of_traslado",
], OF_X, OF_Y))
CHECK_OUT = grilla([
    "co_explicacion_realizados", "co_ticket_bateria", "co_escaneo", "co_asistencia_24x7",
    "co_repuestos_originales", "co_garantia_servicio", "co_manual_sellado", "co_proximo_servicio",
    "co_explicacion_factura", "co_tarjeta_checkout", "co_encuesta_satisfaccion", "co_capot_abierto",
    "co_nivel_aceite", "co_piezas_sustituidas", "co_luces", "co_baul_objetos",
    "co_rueda_kit", "co_retiro_cono",
], CO_X, FILAS)
CHECK_OUT.update(grilla([
    "pe_reconfirmar_datos", "pe_llamado_acompanamiento", "pe_encuesta_nissan",
], PE_X, PE_Y))
AGENDAMIENTO = grilla([
    "ag_datos_cliente", "ag_patente_km", "ag_motivo",
    "ag_recall", "ag_opciones_horarios", "ag_explicacion",
    "ag_lavado", "ag_horario_entrega", "ag_formas_pago",
    "ag_recordar_traer", "ag_objetos_valor", "ag_traslado",
], AG_X, AG_Y)

TAREAS = [  # (archivo PDF, tamaño de letra de las etiquetas, celdas)
    ("check-in-out.pdf", 12.0, {**CHECK_IN, **CHECK_OUT}),
    ("agendamiento.pdf", 18.6, AGENDAMIENTO),
]

def es_casillero(r, celdas):
    """Un casillero es un cuadrado de ~21 pt pegado a la esquina superior derecha de su celda."""
    if not (19 <= r.width <= 24 and 19 <= r.height <= 24):
        return False
    return any(x1 - 16 <= r.x1 <= x1 + 2 and y0 - 4 <= r.y0 <= y0 + 22
               for (x0, y0, x1, y1) in celdas.values())

def limpiar_pagina(page, tam_etiqueta, celdas):
    """Borra las etiquetas de texto y tapa los casilleros, para que quede sólo el dibujo."""
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                if abs(s["size"] - tam_etiqueta) < 0.2 and s["text"].strip():
                    page.add_redact_annot(pymupdf.Rect(s["bbox"]))
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE,
                          graphics=pymupdf.PDF_REDACT_LINE_ART_NONE)
    for d in page.get_drawings():
        r = d["rect"]
        if d.get("color") and es_casillero(r, celdas):
            page.draw_rect(r + (-1.5, -1.5, 1.5, 1.5), color=None, fill=(1, 1, 1))

def a_transparente(pix):
    """Fondo blanco/gris claro -> transparente. Grises neutros pasan a negro con alfa
    (sobre blanco se ven idénticos); los colores (rojo, azul) quedan opacos."""
    w, h, src = pix.width, pix.height, pix.samples
    out = bytearray(w * h * 4)
    x0, y0, x1, y1 = w, h, -1, -1
    for i in range(w * h):
        r, g, b = src[3 * i], src[3 * i + 1], src[3 * i + 2]
        mx, mn = max(r, g, b), min(r, g, b)
        if mx - mn <= 18:
            a = (236 - (r + g + b) // 3) * 255 // 236
            a = 0 if a < 8 else min(a, 255)
            px = (0, 0, 0, a)
        else:
            a = 255
            px = (r, g, b, 255)
        out[4 * i:4 * i + 4] = bytes(px)
        if a:
            x, y = i % w, i // w
            if x < x0: x0 = x
            if x > x1: x1 = x
            if y < y0: y0 = y
            if y > y1: y1 = y
    return out, (x0, y0, x1, y1)

def main():
    os.makedirs(SALIDA, exist_ok=True)
    total = 0
    for archivo, tam, celdas in TAREAS:
        doc = pymupdf.open(os.path.join(FUENTES, archivo))
        page = doc[0]
        limpiar_pagina(page, tam, celdas)
        for ident, (x0, y0, x1, y1) in celdas.items():
            clip = pymupdf.Rect(x0 + 3, y0 + 3, x1 - 3, y1 - 3)
            pix = page.get_pixmap(dpi=DPI, clip=clip, alpha=False)
            datos, (a, b, c, d) = a_transparente(pix)
            if c < 0:
                sys.exit(f"ERROR: la celda {ident} quedó vacía")
            m = 6  # margen en píxeles
            a, b, c, d = max(a - m, 0), max(b - m, 0), min(c + m, pix.width - 1), min(d + m, pix.height - 1)
            filas = []
            for yy in range(b, d + 1):
                base = (yy * pix.width + a) * 4
                filas.append(datos[base: base + (c - a + 1) * 4])
            rec = pymupdf.Pixmap(pymupdf.csRGB, c - a + 1, d - b + 1, b"".join(filas), True)
            rec.save(os.path.join(SALIDA, f"{ident}.png"))
            total += 1
    print(f"OK {total} iconos en {SALIDA}")

if __name__ == "__main__":
    main()
