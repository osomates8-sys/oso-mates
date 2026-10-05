"""Genera el archivo de imprenta de la caja Oso Mates (150 x 150 x 200 mm).

Modelo: caja de tapas invertidas (reverse tuck end), una sola pieza de cartulina.

Salidas (en esta misma carpeta):
  caja-oso-mates-15x15x20_IMPRENTA.pdf  -> pág. 1: arte + troquel (tintas planas CutContour / Crease)
                                          pág. 2: solo troquel con cotas
  caja-oso-mates-15x15x20_PREVIEW.pdf   -> arte recortado al troquel (para mirar, no para imprimir)

Uso: python3 generar.py   (requiere reportlab y qrcode)
Todas las medidas están en milímetros.
"""
import json
import math
import os
import random

import qrcode
from reportlab.lib.colors import CMYKColor, CMYKColorSep
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.pdfgen.canvas import FILL_EVEN_ODD
from reportlab.platypus import Paragraph

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- medidas
L = 150.0   # frente / dorso
W = 150.0   # laterales (profundidad)
H = 200.0   # alto
GLUE = 15.0  # solapa de pegado
TUCK = 15.0  # lengüeta de cierre
DUST = 56.0  # alto de las aletas guardapolvo
BLEED = 3.0
MARGIN = 22.0  # margen de hoja para marcas y leyenda

XA, XB, XC, XD, XE = GLUE, GLUE + L, GLUE + L + W, GLUE + 2 * L + W, GLUE + 2 * L + 2 * W
Y_TOP_LID = H + W          # pliegue lengüeta superior
Y_BOT_LID = -W             # pliegue lengüeta inferior
X_MIN, X_MAX = 0.0, XE
Y_MIN, Y_MAX = -(W + TUCK), H + W + TUCK

PAGE_W = (X_MAX - X_MIN) + 2 * MARGIN
PAGE_H = (Y_MAX - Y_MIN) + 2 * MARGIN

# ---------------------------------------------------------------- colores (CMYK)
THEMES = {
    # caja negra: negro enriquecido de fondo, textos calados (blanco = papel) y acento caramelo
    "negra": dict(BG=CMYKColor(0.60, 0.40, 0.40, 1.0), INK=CMYKColor(0, 0, 0, 0),
                  BROWN=CMYKColor(0.15, 0.42, 0.62, 0.04), BROWN_SOFT=CMYKColor(0.55, 0.55, 0.60, 0.70),
                  LOGO=CMYKColor(0, 0, 0, 0)),
    # caja blanca: papel blanco sin fondo, texto negro (solo K) y acento marrón
    "blanca": dict(BG=CMYKColor(0, 0, 0, 0), INK=CMYKColor(0, 0, 0, 0.9),
                   BROWN=CMYKColor(0.20, 0.55, 0.85, 0.30), BROWN_SOFT=CMYKColor(0.04, 0.12, 0.22, 0.02),
                   LOGO=CMYKColor(0, 0, 0, 1)),
    # caja madera: fondo madera clara con veta suave, todos los detalles en negro
    "madera": dict(BG=CMYKColor(0.07, 0.27, 0.48, 0.03), INK=CMYKColor(0, 0, 0, 1),
                   BROWN=CMYKColor(0, 0, 0, 1), BROWN_SOFT=CMYKColor(0.12, 0.38, 0.62, 0.10),
                   LOGO=CMYKColor(0, 0, 0, 1), GRAIN=CMYKColor(0.09, 0.31, 0.53, 0.05),
                   GRAIN_DARK=CMYKColor(0.12, 0.38, 0.62, 0.10), MINIMAL=True),
}
THEME = "negra"
BG = INK = BROWN = BROWN_SOFT = LOGO = GRAIN = GRAIN_DARK = None
MINIMAL = False


def set_theme(name):
    global THEME
    THEME = name
    globals().update({"GRAIN": None, "GRAIN_DARK": None, "MINIMAL": False, **THEMES[name]})


set_theme(THEME)
QR_DARK = CMYKColor(0, 0, 0, 1)
CUT = CMYKColorSep(0, 1, 0, 0, spotName="CutContour")
CREASE = CMYKColorSep(1, 0, 0, 0, spotName="Crease")


def pt(v):
    """Puntos tipográficos -> mm (el canvas trabaja escalado a mm)."""
    return v * 0.352778


# ---------------------------------------------------------------- fuentes
FONTS = {
    "CGL": "CG-Light.ttf", "CGLI": "CG-LightItalic.ttf",
    "CGM": "CG-Medium.ttf", "CGMI": "CG-MediumItalic.ttf",
    "MSL": "MS-Light.ttf", "MSR": "MS-Regular.ttf",
    "MSM": "MS-Medium.ttf", "MSSB": "MS-SemiBold.ttf",
}
for name, f in FONTS.items():
    pdfmetrics.registerFont(TTFont(name, os.path.join(HERE, "fonts", f)))
pdfmetrics.registerFontFamily("MSR", normal="MSR", bold="MSSB", italic="MSR", boldItalic="MSSB")
pdfmetrics.registerFontFamily("MSM", normal="MSM", bold="MSSB", italic="MSM", boldItalic="MSSB")
pdfmetrics.registerFontFamily("CGL", normal="CGL", bold="CGM", italic="CGLI", boldItalic="CGMI")


# ---------------------------------------------------------------- geometría del troquel
def arc_pts(cx, cy, r, a0, a1, n=12):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def tuck_top(x0, x1, y):
    """Lengüeta hacia arriba desde y, con esquinas redondeadas."""
    i, r = 1.5, 9.0
    p = [(x0, y), (x0 + i, y)]
    p += arc_pts(x0 + i + r, y + TUCK - r, r, 180, 90)
    p += arc_pts(x1 - i - r, y + TUCK - r, r, 90, 0)
    p += [(x1 - i, y), (x1, y)]
    return p


def contour():
    """Contorno de corte, en sentido horario empezando abajo a la izquierda de la solapa."""
    p = [(XA, 0), (0, 10), (0, H - 10), (XA, H)]
    # boca del frente con muesca para el pulgar
    p += arc_pts(XA + L / 2, H, 11, 180, 360)
    p += [(XB, H)]
    # guardapolvo lateral B (arriba)
    p += [(XB + 2, H + DUST - 8), (XB + 10, H + DUST), (XC - 20, H + DUST), (XC - 2, H + 18), (XC - 2, H), (XC, H)]
    # tapa superior (en el dorso C) + lengüeta
    p += [(XC, Y_TOP_LID)] + tuck_top(XC, XD, Y_TOP_LID)[1:-1] + [(XD, Y_TOP_LID), (XD, H)]
    # guardapolvo lateral D (arriba)
    p += [(XD + 2, H), (XD + 2, H + 18), (XD + 20, H + DUST), (XE - 10, H + DUST), (XE - 2, H + DUST - 8), (XE, H)]
    p += [(XE, 0)]
    # guardapolvo D (abajo)
    p += [(XE - 2, -DUST + 8), (XE - 10, -DUST), (XD + 20, -DUST), (XD + 2, -18), (XD + 2, 0), (XD, 0)]
    p += [(XC, 0)]
    # guardapolvo B (abajo)
    p += [(XC - 2, 0), (XC - 2, -18), (XC - 20, -DUST), (XB + 10, -DUST), (XB + 2, -DUST + 8), (XB, 0)]
    # tapa inferior (en el frente A) + lengüeta
    tb = [(x, -y) for x, y in tuck_top(XA, XB, -Y_BOT_LID)]  # espejo vertical
    p += [(XB, Y_BOT_LID)] + tb[::-1][1:-1] + [(XA, Y_BOT_LID)]
    return p


CREASES = [
    # verticales entre paneles
    ((XA, 0), (XA, H)), ((XB, 0), (XB, H)), ((XC, 0), (XC, H)), ((XD, 0), (XD, H)),
    # arriba
    ((XB, H), (XC - 2, H)), ((XC, H), (XD, H)), ((XD + 2, H), (XE, H)),
    ((XC + 1.5, Y_TOP_LID), (XD - 1.5, Y_TOP_LID)),
    # abajo
    ((XA, 0), (XB, 0)), ((XB, 0), (XC - 2, 0)), ((XD + 2, 0), (XE, 0)),
    ((XA + 1.5, Y_BOT_LID), (XB - 1.5, Y_BOT_LID)),
]


def contour_path(c):
    pts = contour()
    path = c.beginPath()
    path.moveTo(*pts[0])
    for q in pts[1:]:
        path.lineTo(*q)
    path.close()
    return path


# ---------------------------------------------------------------- helpers de texto
def legible(font, size_mm):
    """Texto chico: mínimo 7 pt y un peso más, para que se lea bien impreso."""
    return {"MSL": "MSR", "MSR": "MSM"}.get(font, font), max(size_mm, pt(7))


def tracked(c, text, x, y, font, size, track=0.0, color=None, align="center"):
    color = INK if color is None else color
    font, size = legible(font, size)
    w = pdfmetrics.stringWidth(text, font, size) + track * (len(text) - 1)
    if align == "center":
        x -= w / 2
    elif align == "right":
        x -= w
    t = c.beginText(x, y)
    t.setFont(font, size)
    t.setCharSpace(track)
    t.setFillColor(color)
    t.textOut(text)
    t.setCharSpace(0)
    c.drawText(t)
    return w


def para(c, html, x, y_top, width, font="MSR", size=7, leading=None, color=None, align=TA_LEFT):
    color = INK if color is None else color
    font, size_mm = legible(font, pt(size))
    size = max(size, size_mm / pt(1))
    st = ParagraphStyle("p", fontName=font, fontSize=pt(size), leading=pt(leading or size * 1.45),
                        textColor=color, alignment=align, bulletFontName=font)
    p = Paragraph(html, st)
    _, h = p.wrapOn(c, width, 500)
    p.drawOn(c, x, y_top - h)
    return h


def circle_text(c, text, cx, cy, r, font, size, track=None, start_deg=90, color=None):
    """Texto alrededor de un círculo, sentido horario, con la base hacia el centro.
    Sin track, reparte el texto en la vuelta completa."""
    color = INK if color is None else color
    if track is None:
        track = (2 * math.pi * r - sum(pdfmetrics.stringWidth(ch, font, size) for ch in text)) / len(text)
    total = sum(pdfmetrics.stringWidth(ch, font, size) + track for ch in text) - track
    ang = start_deg + math.degrees(total / 2 / r)
    for ch in text:
        cw = pdfmetrics.stringWidth(ch, font, size)
        a = ang - math.degrees(cw / 2 / r)
        c.saveState()
        c.translate(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
        c.rotate(a - 90)
        c.setFillColor(color)
        c.setFont(font, size)
        c.drawCentredString(0, 0, ch)
        c.restoreState()
        ang -= math.degrees((cw + track) / r)


# ---------------------------------------------------------------- ilustraciones
LOGO_DATA = json.load(open(os.path.join(HERE, "logo_paths.json")))


def _logo_part(cv):
    x0, y0, x1, y1 = cv["bbox"]
    if x1 - x0 > 700:
        return None  # borde de la imagen
    if y0 >= 600:
        return "tagline"
    if y0 >= 230:
        return "oso"
    return "arco"


def logo(c, cx, cy, height, parts=("arco", "oso"), color=None):
    """Logo vectorizado (logo-original.png -> potrace), centrado en (cx, cy) con alto dado en mm."""
    color = LOGO if color is None else color
    curves = [cv for cv in LOGO_DATA["curves"] if _logo_part(cv) in parts]
    x0 = min(cv["bbox"][0] for cv in curves)
    y0 = min(cv["bbox"][1] for cv in curves)
    x1 = max(cv["bbox"][2] for cv in curves)
    y1 = max(cv["bbox"][3] for cv in curves)
    k = height / (y1 - y0)
    tx = lambda x: cx + (x - (x0 + x1) / 2) * k
    ty = lambda y: cy - (y - (y0 + y1) / 2) * k
    p = c.beginPath()
    for cv in curves:
        p.moveTo(tx(cv["start"][0]), ty(cv["start"][1]))
        for sg in cv["segs"]:
            if sg[0] == "L":
                p.lineTo(tx(sg[1]), ty(sg[2]))
                p.lineTo(tx(sg[3]), ty(sg[4]))
            else:
                p.curveTo(tx(sg[1]), ty(sg[2]), tx(sg[3]), ty(sg[4]), tx(sg[5]), ty(sg[6]))
        p.close()
    c.saveState()
    c.setFillColor(color)
    c.drawPath(p, stroke=0, fill=1, fillMode=FILL_EVEN_ODD)
    c.restoreState()
    return (x1 - x0) * k


def frame(c, x0, y0, w, h, inset=7.0):
    if MINIMAL:
        return
    c.saveState()
    c.setStrokeColor(BROWN)
    c.setLineWidth(0.35)
    c.rect(x0 + inset, y0 + inset, w - 2 * inset, h - 2 * inset, stroke=1, fill=0)
    c.setLineWidth(0.25)
    c.rect(x0 + inset + 1.2, y0 + inset + 1.2, w - 2 * inset - 2.4, h - 2 * inset - 2.4, stroke=1, fill=0)
    c.restoreState()


def diamond_rule(c, cx, y, half, color=None):
    color = BROWN if color is None else color
    if MINIMAL:
        c.saveState()
        c.setStrokeColor(color)
        c.setLineWidth(0.3)
        c.line(cx - 6, y, cx + 6, y)
        c.restoreState()
        return
    c.saveState()
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(0.28)
    c.line(cx - half, y, cx - 2.2, y)
    c.line(cx + 2.2, y, cx + half, y)
    d = c.beginPath()
    d.moveTo(cx, y + 1.1)
    d.lineTo(cx + 1.1, y)
    d.lineTo(cx, y - 1.1)
    d.lineTo(cx - 1.1, y)
    d.close()
    c.drawPath(d, stroke=0, fill=1)
    c.restoreState()


# ---------------------------------------------------------------- paneles
def panel_front(c):
    x0, cx = XA, XA + L / 2
    if MINIMAL:
        logo(c, cx, 122, 36, parts=("oso",))
        tracked(c, "OSO MATES", cx, 84, "MSM", pt(24), track=3.6)
        diamond_rule(c, cx, 76, 0)
        tracked(c, "MATES Y BOMBILLAS", cx, 67, "MSR", pt(7), track=2.2)
        tracked(c, "MAR DEL PLATA", cx, 18, "MSR", pt(6.5), track=2.2)
        return
    frame(c, x0, 0, L, H)
    logo(c, cx, 108, 112)
    tracked(c, "MATES Y BOMBILLAS", cx, 44, "MSM", pt(8.5), track=2.2)
    diamond_rule(c, cx, 33, 18)
    tracked(c, "TALLADO A MANO  ·  MAR DEL PLATA", cx, 22, "MSR", pt(5.8), track=1.1, color=BROWN)


def panel_curado(c, x0, material, steps, note_title, note):
    """Lateral con el curado paso a paso de un tipo de mate."""
    cx = x0 + W / 2
    frame(c, x0, 0, W, H)
    tracked(c, "CURADO  ·  ANTES DEL PRIMER USO", cx, 178, "MSM", pt(6), track=1.3, color=BROWN)
    tracked(c, "Cómo curar tu mate", cx, 165, "CGLI", pt(24), track=0.3)
    tracked(c, f"de {material}", cx, 156, "CGLI", pt(24), track=0.3)
    diamond_rule(c, cx, 149, 14)
    y = 142
    for i, (bold, rest) in enumerate(steps, 1):
        tracked(c, f"{i:02d}", x0 + 16, y - pt(8.4), "CGM", pt(15), color=BROWN, align="left")
        h = para(c, f"<b>{bold}</b> {rest}", x0 + 28, y, W - 28 - 16, size=8, leading=11.2)
        y -= max(h, 5) + 5
    y -= 2
    c.saveState()
    c.setStrokeColor(BROWN)
    c.setLineWidth(0.3)
    if not MINIMAL:
        c.roundRect(x0 + 15, y - 25, W - 30, 25, 2, stroke=1, fill=0)
    c.restoreState()
    tracked(c, note_title, cx, y - 7, "MSSB", pt(6.5), track=1.2, color=BROWN)
    para(c, note, x0 + 20, y - 10.5, W - 40, size=7.5, leading=10.4, align=TA_CENTER)
    tracked(c, "Guía completa en osomates.com/guias", cx, 18.5, "MSR", pt(5.6), track=0.4)


def panel_cure(c):
    panel_curado(c, XB, "calabaza", [
        ("Llenalo con yerba", "hasta el borde y agregá agua caliente, sin hervir, hasta cubrirla."),
        ("Dejalo reposar 24 horas.", "Si baja el nivel del agua, completalo."),
        ("Vacialo y raspá suavemente", "el interior con una cuchara, solo lo que sale fácil."),
        ("Enjuagalo con agua", "(sin detergente) y repetí durante 2 o 3 días."),
        ("Dejalo secar", "en un lugar ventilado, sin tapar, antes de estrenarlo."),
    ], "OJO CON EL AGUA", "Usala caliente, nunca hirviendo: entre 70 y 80 °C. "
                         "El agua hirviendo puede rajar la calabaza.")


def panel_cure_algarrobo(c):
    panel_curado(c, XD, "algarrobo", [
        ("Untalo con manteca o aceite", "por dentro y dejalo reposar 8 horas."),
        ("Llenalo con yerba húmeda", "y agregá agua caliente hasta el borde."),
        ("Dejalo reposar 24 horas", "y completá con agua si baja el nivel."),
        ("Vacialo y enjuagalo", "solo con agua. En la madera no hace falta raspar."),
        ("Repetí el proceso", "1 o 2 veces más."),
        ("Dejalo secar al aire", "en un lugar ventilado, lejos del sol y del calor."),
    ], "ES NORMAL", "Que largue un poco de color oscuro las primeras veces: son los taninos "
                   "naturales de la madera. Con el uso desaparece.")


def panel_back(c):
    x0, cx = XC, XC + L / 2
    frame(c, x0, 0, L, H)
    logo(c, cx, 168, 16 if MINIMAL else 22, parts=("oso",))
    tracked(c, "Cada mate es único", cx, 143, "CGLI", pt(22), track=0.3, color=INK)
    diamond_rule(c, cx, 136, 16)
    para(c, "Cada mate de <b>Oso Mates</b> se hace y se talla a mano, uno por uno, en Mar del Plata. "
            "Por eso no hay dos iguales: las vetas, el color y las pequeñas marcas del tallado "
            "son parte de su historia.",
         x0 + 20, 129, L - 40, size=7, leading=10.6, align=TA_CENTER)

    # QR a la web
    qs = 27.0
    qx, qy = cx - qs / 2, 50
    c.saveState()
    c.setFillColor(CMYKColor(0, 0, 0, 0) if GRAIN is None else BG)
    c.rect(qx - 2, qy - 2, qs + 4, qs + 4, stroke=0, fill=1)  # en madera tapa la veta detrás del QR
    c.restoreState()
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
    qr.add_data("https://osomates.com")
    m = qr.get_matrix()
    cell = qs / len(m)
    c.saveState()
    c.setFillColor(QR_DARK)
    for r, row in enumerate(m):
        for k, on in enumerate(row):
            if on:
                c.rect(qx + k * cell, qy + qs - (r + 1) * cell, cell + 0.01, cell + 0.01, stroke=0, fill=1)
    c.restoreState()
    tracked(c, "CONOCÉ LA COLECCIÓN", cx, qy + qs + 6, "MSM", pt(5.8), track=1.4, color=BROWN)
    tracked(c, "osomates.com", cx, 39, "CGM", pt(15), track=0.4, color=INK)
    tracked(c, "@oso_mates", cx, 32, "MSR", pt(6.5), track=0.8, color=BROWN)
    tracked(c, "HECHO A MANO EN ARGENTINA", cx, 18.5, "MSR", pt(5.6), track=1.1, color=INK)


def lid_top(c):
    """Tapa superior (cuelga del dorso). Rotada 180° para leerse de frente con la caja cerrada."""
    cx, cy = XC + L / 2, H + W / 2
    c.saveState()
    c.translate(cx, cy)
    c.rotate(180)
    if MINIMAL:
        logo(c, 0, 28, 24, parts=("oso",))
        tracked(c, "Llegó lo más esperado", 0, -2, "CGLI", pt(24), track=0.3)
        diamond_rule(c, 0, -12, 0)
        tracked(c, "OSO MATES", 0, -22, "MSM", pt(8), track=2.8)
        c.restoreState()
        return
    logo(c, 0, 30, 46, parts=("oso",))
    tracked(c, "Llegó lo", 0, -8, "CGLI", pt(34), track=0.3)
    tracked(c, "más esperado", 0, -21, "CGLI", pt(34), track=0.3)
    diamond_rule(c, 0, -31, 20)
    tracked(c, "OSO MATES", 0, -41, "MSM", pt(7), track=2.4, color=BROWN)
    c.restoreState()


def lid_bottom(c):
    """Tapa inferior (cuelga del frente). Se lee inclinando la caja hacia atrás."""
    cx, cy = XA + L / 2, -W / 2
    diamond_rule(c, cx, cy + 26, 22)
    tracked(c, "PRODUCTO ARTESANAL", cx, cy + 15, "MSM", pt(6), track=1.6, color=BROWN)
    para(c, "Cada pieza es única: las variaciones de color, veta y tallado son propias del trabajo a mano.",
         XA + 30, cy + 9, L - 60, size=6.5, leading=9.4, align=TA_CENTER)
    tracked(c, "osomates.com  ·  Mar del Plata, Argentina", cx, cy - 18, "MSR", pt(5.6), track=0.5, color=INK)
    diamond_rule(c, cx, cy - 26, 22)


def wood_grain(c, x0, y0, x1, y1):
    """Veta de madera vectorial, sutil (mismo tono un poco más oscuro). Semilla fija: siempre igual."""
    rnd = random.Random(7)
    c.saveState()
    clip = c.beginPath()
    clip.rect(x0, y0, x1 - x0, y1 - y0)
    c.clipPath(clip, stroke=0, fill=0)
    c.setLineCap(1)
    # ondulación compartida por toda la tabla: las vetas vecinas se mueven juntas
    waves = [(rnd.uniform(2, 6), rnd.uniform(0.0015, 0.004), rnd.uniform(0, 6.3)) for _ in range(3)]
    shared = lambda y, x: sum(a * math.sin(f * 6.283 * y + p + x * 0.01) for a, f, p in waves)
    x = x0 - 8
    while x < x1 + 8:
        local = (rnd.uniform(0.2, 1.0), rnd.uniform(0.01, 0.03), rnd.uniform(0, 6.3))
        dark = rnd.random() < 0.15
        c.setStrokeColor(GRAIN_DARK if dark else GRAIN)
        c.setLineWidth(rnd.uniform(0.25, 0.5) if dark else rnd.uniform(0.06, 0.2))
        p = c.beginPath()
        y = y0 - 5
        f = lambda yy: x + shared(yy, x) + local[0] * math.sin(local[1] * 6.283 * yy + local[2])
        p.moveTo(f(y), y)
        while y < y1 + 5:
            y += 3
            p.lineTo(f(y), y)
        c.drawPath(p, stroke=1, fill=0)
        x += rnd.choice([0.5, 0.7, 0.9, 1.2, 1.6, 2.4, 3.5])
    c.restoreState()


def artwork(c):
    c.saveState()
    c.setFillColor(BG)
    # fondo con 3 mm de sangrado; la solapa de pegado queda sin tinta para que pegue bien
    c.rect(XA - BLEED, Y_MIN - BLEED, (X_MAX - XA) + 2 * BLEED, (Y_MAX - Y_MIN) + 2 * BLEED, stroke=0, fill=1)
    c.restoreState()
    if GRAIN is not None:
        wood_grain(c, XA - BLEED, Y_MIN - BLEED, X_MAX + BLEED, Y_MAX + BLEED)
    panel_front(c)
    panel_cure(c)
    panel_back(c)
    panel_cure_algarrobo(c)
    lid_top(c)
    lid_bottom(c)


# ---------------------------------------------------------------- troquel
def dieline(c, overprint=True):
    c.saveState()
    if overprint:
        c.setStrokeOverprint(1)
        c.setOverprintMask(1)
    c.setLineWidth(0.25)
    c.setStrokeColor(CUT)
    c.drawPath(contour_path(c), stroke=1, fill=0)
    c.setStrokeColor(CREASE)
    c.setDash(3, 1.5)
    for a, b in CREASES:
        c.line(*a, *b)
    c.restoreState()


def crop_marks(c):
    c.saveState()
    c.setLineWidth(0.1)
    c.setStrokeColor(CMYKColor(1, 1, 1, 1))  # registro
    x0, x1 = XA - BLEED, X_MAX + BLEED
    y0, y1 = Y_MIN - BLEED, Y_MAX + BLEED
    for x, y, dx, dy in [(x0, y0, -1, -1), (x1, y0, 1, -1), (x0, y1, -1, 1), (x1, y1, 1, 1)]:
        c.line(x + dx * 2, y, x + dx * 10, y)
        c.line(x, y + dy * 2, x, y + dy * 10)
    c.restoreState()


def legend(c, title):
    c.saveState()
    c.setFillColor(CMYKColor(0, 0, 0, 1))
    c.setFont("MSR", pt(7))
    c.drawString(X_MIN, Y_MAX + 10, title)
    c.setFont("MSR", pt(6))
    c.drawString(X_MIN, Y_MAX + 6,
                 "Caja Oso Mates · interior 150 × 150 × 200 mm · tapas invertidas · "
                 "Desplegado 615 × 530 mm · Sangrado 3 mm · CMYK · Escala 1:1")
    c.setFillColor(CUT)
    c.rect(X_MAX - 120, Y_MAX + 9.2, 6, 1.4, stroke=0, fill=1)
    c.setFillColor(CREASE)
    c.rect(X_MAX - 60, Y_MAX + 9.2, 6, 1.4, stroke=0, fill=1)
    c.setFillColor(CMYKColor(0, 0, 0, 1))
    c.drawString(X_MAX - 112, Y_MAX + 9.2, "Corte (tinta plana CutContour)")
    c.drawString(X_MAX - 52, Y_MAX + 9.2, "Hendido (tinta plana Crease)")
    c.restoreState()


def dim(c, a, b, off, label, horizontal=True):
    c.saveState()
    c.setStrokeColor(CMYKColor(0, 0, 0, 0.7))
    c.setFillColor(CMYKColor(0, 0, 0, 0.9))
    c.setLineWidth(0.12)
    c.setFont("MSR", pt(6.5))
    if horizontal:
        y = off
        c.line(a, y, b, y)
        for x in (a, b):
            c.line(x, y - 1.5, x, y + 1.5)
        c.drawCentredString((a + b) / 2, y + 1.2, label)
    else:
        x = off
        c.line(x, a, x, b)
        for y in (a, b):
            c.line(x - 1.5, y, x + 1.5, y)
        c.saveState()
        c.translate(x - 1.2, (a + b) / 2)
        c.rotate(90)
        c.drawCentredString(0, 0, label)
        c.restoreState()
    c.restoreState()


def panel_labels(c):
    c.saveState()
    c.setFillColor(CMYKColor(0, 0, 0, 0.55))
    c.setFont("MSM", pt(9))
    for x, y, t in [(XA + L / 2, H / 2, "FRENTE"), (XB + W / 2, H / 2, "LATERAL · CURADO CALABAZA"),
                    (XC + L / 2, H / 2, "DORSO"), (XD + W / 2, H / 2, "LATERAL · CURADO ALGARROBO"),
                    (XC + L / 2, H + W / 2, "TAPA SUPERIOR"), (XA + L / 2, -W / 2, "TAPA INFERIOR"),
                    (GLUE / 2, H / 2 + 30, "")]:
        c.drawCentredString(x, y, t)
    c.saveState()
    c.translate(GLUE / 2 + 1, H / 2)
    c.rotate(90)
    c.setFont("MSM", pt(6))
    c.drawCentredString(0, 0, "SOLAPA DE PEGADO · SIN TINTA")
    c.restoreState()
    c.setFont("MSR", pt(6))
    for x in (XB + W / 2, XD + W / 2):
        c.drawCentredString(x, H + 25, "guardapolvo")
        c.drawCentredString(x, -28, "guardapolvo")
    c.restoreState()


# ---------------------------------------------------------------- salida
def new_page(c):
    c.translate(MARGIN * mm, MARGIN * mm)
    c.translate(-X_MIN * mm, -Y_MIN * mm)
    c.scale(mm, mm)


def build_print(path):
    c = canvas.Canvas(path, pagesize=(PAGE_W * mm, PAGE_H * mm), initialFontName="MSR")
    c.setTitle("Caja Oso Mates 150x150x200 - archivo de imprenta")
    c.setAuthor("Oso Mates")
    # pág. 1: arte + troquel
    c.saveState()
    new_page(c)
    artwork(c)
    dieline(c)
    crop_marks(c)
    legend(c, "PÁG. 1 — ARTE + TROQUEL")
    c.restoreState()
    c.showPage()
    # pág. 2: troquel con cotas
    c.saveState()
    new_page(c)
    dieline(c, overprint=False)
    panel_labels(c)
    legend(c, "PÁG. 2 — TROQUEL CON COTAS (no imprimir, referencia)")
    yb = Y_MIN - 8
    dim(c, X_MIN, X_MAX, yb, "615 mm")
    for a, b, t in [(0, XA, "15"), (XA, XB, "150"), (XB, XC, "150"), (XC, XD, "150"), (XD, XE, "150")]:
        dim(c, a, b, Y_MIN - 3, t)
    dim(c, Y_MIN, Y_MAX, X_MAX + 14, "530 mm", horizontal=False)
    for a, b, t in [(Y_MIN, Y_BOT_LID, "15"), (Y_BOT_LID, 0, "150"), (0, H, "200"),
                    (H, Y_TOP_LID, "150"), (Y_TOP_LID, Y_MAX, "15")]:
        dim(c, a, b, X_MAX + 7, t, horizontal=False)
    dim(c, H, H + DUST, XB - 4, "56", horizontal=False)
    c.restoreState()
    c.showPage()
    c.save()


def build_preview(path):
    pad = 6
    w, h = (X_MAX - X_MIN) + 2 * pad, (Y_MAX - Y_MIN) + 2 * pad
    c = canvas.Canvas(path, pagesize=(w * mm, h * mm), initialFontName="MSR")
    c.setFillColor(CMYKColor(0, 0, 0, 0))
    c.rect(0, 0, w * mm, h * mm, stroke=0, fill=1)
    c.translate((pad - X_MIN) * mm, (pad - Y_MIN) * mm)
    c.scale(mm, mm)
    c.saveState()
    c.clipPath(contour_path(c), stroke=0, fill=0)
    artwork(c)
    c.restoreState()
    c.saveState()
    c.setLineWidth(0.25)
    c.setStrokeColor(CMYKColor(0, 0, 0, 0.45))
    c.drawPath(contour_path(c), stroke=1, fill=0)
    c.setStrokeColor(CMYKColor(0, 0, 0, 0.25))
    c.setDash(3, 1.5)
    for a, b in CREASES:
        c.line(*a, *b)
    c.restoreState()
    c.showPage()
    c.save()


if __name__ == "__main__":
    for theme in THEMES:
        set_theme(theme)
        build_print(os.path.join(HERE, f"caja-oso-mates-15x15x20_{theme.upper()}_IMPRENTA.pdf"))
        build_preview(os.path.join(HERE, f"caja-oso-mates-15x15x20_{theme.upper()}_PREVIEW.pdf"))
    print("ok")
