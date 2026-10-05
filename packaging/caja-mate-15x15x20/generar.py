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
}
THEME = "negra"
BG = INK = BROWN = BROWN_SOFT = LOGO = None


def set_theme(name):
    global THEME
    THEME = name
    globals().update(THEMES[name])


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
def tracked(c, text, x, y, font, size, track=0.0, color=None, align="center"):
    color = INK if color is None else color
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
def mate_icon(c, cx, cy, s, lw=0.35, color=None, carved=True):
    """Mate de calabaza con virola y bombilla, en línea. s = escala (1 -> ~92 mm de alto)."""
    color = BROWN if color is None else color
    c.saveState()
    c.translate(cx, cy)
    c.scale(s, s)
    c.setLineJoin(1)
    c.setLineCap(1)
    c.setStrokeColor(color)
    c.setLineWidth(lw / s)

    body = c.beginPath()
    body.moveTo(17, 28)
    body.curveTo(21, 18, 35, 12, 35, -6)
    body.curveTo(35, -26, 25, -38, 12, -40)
    body.lineTo(-12, -40)
    body.curveTo(-25, -38, -35, -26, -35, -6)
    body.curveTo(-35, 12, -21, 18, -17, 28)
    body.close()

    # bombilla (va detrás de la virola)
    c.setLineWidth(1.6 * lw / s)
    c.line(3, 33, 21, 74)
    bp = c.beginPath()
    bp.moveTo(21, 74)
    bp.curveTo(22.5, 77.5, 22, 80, 18.5, 82.5)
    c.drawPath(bp, stroke=1, fill=0)
    c.setLineWidth(lw / s)
    c.circle(15.2, 59.5, 1.6, stroke=1, fill=0)

    c.setFillColor(BG)
    c.drawPath(body, stroke=1, fill=1)

    if carved:  # guarda tallada, recortada a la silueta
        c.saveState()
        c.clipPath(body, stroke=0, fill=0)
        c.setLineWidth(0.8 * lw / s)
        for yy in (6, -8):
            pth = c.beginPath()
            pth.moveTo(-40, yy + 3)
            pth.curveTo(-15, yy - 2, 15, yy - 2, 40, yy + 3)
            c.drawPath(pth, stroke=1, fill=0)
        zig = c.beginPath()
        n = 14
        for i in range(n + 1):
            x = -38 + 76 * i / n
            t = (x / 40.0) ** 2
            ybase = (-8 + 3 * t - 2 * (1 - t)) if i % 2 == 0 else (6 + 3 * t - 2 * (1 - t))
            ybase += 0 if i % 2 == 0 else 0
            (zig.moveTo if i == 0 else zig.lineTo)(x, ybase + (1.2 if i % 2 == 0 else -1.2))
        c.drawPath(zig, stroke=1, fill=0)
        # hojas de yerba talladas
        for sx in (-1, 1):
            leaf = c.beginPath()
            leaf.moveTo(0, -30)
            leaf.curveTo(sx * 6, -26, sx * 14, -22, sx * 18, -14)
            leaf.curveTo(sx * 10, -16, sx * 4, -22, 0, -30)
            c.drawPath(leaf, stroke=1, fill=0)
        c.line(0, -34, 0, -16)
        c.restoreState()

    # virola
    vir = c.beginPath()
    vir.moveTo(-17, 28)
    vir.lineTo(-19, 35)
    vir.lineTo(19, 35)
    vir.lineTo(17, 28)
    vir.close()
    c.drawPath(vir, stroke=1, fill=1)
    c.line(-18, 31.5, 18, 31.5)
    c.ellipse(-19, 32.5, 19, 37.5, stroke=1, fill=1)
    c.setFillColor(BROWN_SOFT)
    c.ellipse(-16, 33.4, 16, 36.6, stroke=0, fill=1)
    # la bombilla asoma por la boca
    c.setLineWidth(1.6 * lw / s)
    c.line(4.2, 35.6, 6.5, 41)
    c.setLineWidth(lw / s)

    # pie
    c.setFillColor(BG)
    pie = c.beginPath()
    pie.moveTo(-12, -40)
    pie.lineTo(-15, -47)
    pie.lineTo(15, -47)
    pie.lineTo(12, -40)
    c.drawPath(pie, stroke=1, fill=1)
    c.restoreState()


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
    c.saveState()
    c.setStrokeColor(BROWN)
    c.setLineWidth(0.35)
    c.rect(x0 + inset, y0 + inset, w - 2 * inset, h - 2 * inset, stroke=1, fill=0)
    c.setLineWidth(0.12)
    c.rect(x0 + inset + 1.2, y0 + inset + 1.2, w - 2 * inset - 2.4, h - 2 * inset - 2.4, stroke=1, fill=0)
    c.restoreState()


def diamond_rule(c, cx, y, half, color=None):
    color = BROWN if color is None else color
    c.saveState()
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(0.18)
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
    frame(c, x0, 0, L, H)
    logo(c, cx, 108, 112)
    tracked(c, "MATES Y BOMBILLAS", cx, 44, "MSM", pt(8.5), track=2.2)
    diamond_rule(c, cx, 33, 18)
    tracked(c, "TALLADO A MANO  ·  MAR DEL PLATA", cx, 22, "MSR", pt(5.8), track=1.1, color=BROWN)


def panel_cure(c):
    x0, cx = XB, XB + W / 2
    frame(c, x0, 0, W, H)
    tracked(c, "CURADO  ·  ANTES DEL PRIMER USO", cx, 178, "MSM", pt(6), track=1.3, color=BROWN)
    tracked(c, "Cómo curar", cx, 165, "CGLI", pt(24), track=0.3, color=INK)
    tracked(c, "tu mate", cx, 156, "CGLI", pt(24), track=0.3, color=INK)
    diamond_rule(c, cx, 149, 14)
    steps = [
        ("Llenalo con yerba", "hasta el borde y agregá agua caliente, sin hervir, hasta cubrirla."),
        ("Dejalo reposar 24 horas.", "Si baja el nivel del agua, completalo."),
        ("Vacialo y raspá suavemente", "el interior con una cuchara, solo lo que sale fácil."),
        ("Enjuagalo con agua", "(sin detergente) y repetí durante 2 o 3 días."),
        ("Dejalo secar", "en un lugar ventilado, sin tapar, antes de estrenarlo."),
    ]
    y = 142
    for i, (b, rest) in enumerate(steps, 1):
        tracked(c, f"{i:02d}", x0 + 16, y - pt(7.2), "CGM", pt(13), color=BROWN, align="left")
        h = para(c, f"<b>{b}</b> {rest}", x0 + 27, y, W - 27 - 16, size=6.8, leading=9.6)
        y -= max(h, 9) + 3.6
    y -= 2
    c.saveState()
    c.setFillColor(BROWN_SOFT)
    c.roundRect(x0 + 15, y - 22, W - 30, 22, 2, stroke=0, fill=1)
    c.restoreState()
    tracked(c, "¿ES DE ALGARROBO?", cx, y - 7, "MSSB", pt(6), track=1.2, color=BROWN)
    para(c, "Untalo con manteca o aceite y dejalo reposar 8 horas antes de empezar. "
            "En la madera no hace falta raspar.", x0 + 20, y - 10, W - 40, size=6.4, leading=9,
         align=TA_CENTER)
    tracked(c, "Guía completa en osomates.com/guias", cx, 18.5, "MSR", pt(5.6), track=0.4, color=INK)


def panel_back(c):
    x0, cx = XC, XC + L / 2
    frame(c, x0, 0, L, H)
    logo(c, cx, 166, 22, parts=("oso",))
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
    c.setFillColor(CMYKColor(0, 0, 0, 0))
    c.rect(qx - 2, qy - 2, qs + 4, qs + 4, stroke=0, fill=1)
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


def panel_care(c):
    x0, cx = XD, XD + W / 2
    frame(c, x0, 0, W, H)
    tracked(c, "PARA QUE TE DURE TODA LA VIDA", cx, 178, "MSM", pt(6), track=1.3, color=BROWN)
    tracked(c, "Cuidados", cx, 162, "CGLI", pt(24), track=0.3, color=INK)
    diamond_rule(c, cx, 154, 14)
    tracked(c, "DESPUÉS DE CADA USO", x0 + 16, 145, "MSSB", pt(6), track=1.1, color=BROWN, align="left")
    y = 140
    for b, rest in [("Sacá toda la yerba", "apenas terminás."),
                    ("Enjuagalo con agua,", "sin detergente."),
                    ("Dejalo secar al aire", "en un lugar ventilado, sin taparlo."),
                    ("Usalo seguido:", "es el mejor mantenimiento.")]:
        c.setFillColor(BROWN)
        c.circle(x0 + 17.2, y - 2.2, 0.75, stroke=0, fill=1)
        h = para(c, f"<b>{b}</b> {rest}", x0 + 21, y, W - 21 - 16, size=6.8, leading=9.6)
        y -= h + 2.6
    y -= 4
    tracked(c, "NUNCA", x0 + 16, y, "MSSB", pt(6), track=1.1, color=BROWN, align="left")
    y -= 5
    for b in ["Detergente ni lavandina.", "Agua hirviendo: puede rajarlo.", "Lavavajillas ni microondas.",
              "Secarlo al sol fuerte o junto a la estufa.", "Dejarlo en remojo por horas."]:
        c.saveState()
        c.setStrokeColor(BROWN)
        c.setLineWidth(0.3)
        c.line(x0 + 16.4, y - 3.0, x0 + 18.0, y - 1.4)
        c.line(x0 + 16.4, y - 1.4, x0 + 18.0, y - 3.0)
        c.restoreState()
        h = para(c, b, x0 + 21, y, W - 21 - 16, size=6.8, leading=9.6)
        y -= h + 1.4
    mate_icon(c, cx, 52, 0.34, lw=0.3, carved=False)
    tracked(c, "¿Dudas? Escribinos por Instagram @oso_mates", cx, 18.5, "MSR", pt(5.6), track=0.3, color=INK)


def lid_top(c):
    """Tapa superior (cuelga del dorso). Rotada 180° para leerse de frente con la caja cerrada."""
    cx, cy = XC + L / 2, H + W / 2
    c.saveState()
    c.translate(cx, cy)
    c.rotate(180)
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


def artwork(c):
    c.saveState()
    c.setFillColor(BG)
    # fondo con 3 mm de sangrado; la solapa de pegado queda sin tinta para que pegue bien
    c.rect(XA - BLEED, Y_MIN - BLEED, (X_MAX - XA) + 2 * BLEED, (Y_MAX - Y_MIN) + 2 * BLEED, stroke=0, fill=1)
    c.restoreState()
    panel_front(c)
    panel_cure(c)
    panel_back(c)
    panel_care(c)
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
    for x, y, t in [(XA + L / 2, H / 2, "FRENTE"), (XB + W / 2, H / 2, "LATERAL · CURADO"),
                    (XC + L / 2, H / 2, "DORSO"), (XD + W / 2, H / 2, "LATERAL · CUIDADOS"),
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
