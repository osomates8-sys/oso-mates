"""Mockup 3D de la caja cerrada a partir del PREVIEW.pdf (solo para mostrar)."""
import os, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
import generar as g

HERE = os.path.dirname(os.path.abspath(__file__))
DPI, PAD = 150, 6
k = DPI / 25.4

def crop(src, x0, y0, x1, y1):
    return src.crop((round((x0 - g.X_MIN + PAD) * k), round((g.Y_MAX + PAD - y1) * k),
                     round((x1 - g.X_MIN + PAD) * k), round((g.Y_MAX + PAD - y0) * k)))

def coeffs(dst, src_pts):
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src_pts):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
        B += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()

def paste(canvas, img, quad, shade=1.0):
    w, h = img.size
    img = ImageEnhance.Brightness(img).enhance(shade)
    c = coeffs(quad, [(0, 0), (w, 0), (w, h), (0, h)])
    warped = img.transform(canvas.size, Image.PERSPECTIVE, c, Image.BICUBIC)
    mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(mask).polygon(quad, fill=255)
    canvas.paste(warped, (0, 0), mask)

def render(theme):
    tmp = tempfile.mkdtemp()
    subprocess.run(["pdftoppm", "-r", str(DPI), "-png", "-singlefile",
                    os.path.join(HERE, f"caja-oso-mates-15x15x20_{theme}_PREVIEW.pdf"), os.path.join(tmp, "p")],
                   check=True)
    src = Image.open(os.path.join(tmp, "p.png")).convert("RGB")
    front = crop(src, g.XA, 0, g.XB, g.H)
    side = crop(src, g.XB, 0, g.XC, g.H)
    top = crop(src, g.XC, g.H, g.XD, g.Y_TOP_LID).rotate(180)
    # muesca del pulgar: ahí se ve la lengüeta de la tapa (un poco en sombra)
    lid = ImageEnhance.Brightness(top.crop((5, 5, 15, 15)).resize((1, 1))).enhance(0.8).getpixel((0, 0))
    r = 11 * k
    ImageDraw.Draw(front).ellipse((front.width / 2 - r, -r, front.width / 2 + r, r), fill=lid)
    S = 4.2
    ex, ez, ey = np.array([0.92, 0.26]) * S, np.array([0.62, -0.36]) * S, np.array([0, -1.0]) * S
    O = np.array([260, 1180.0])
    P = lambda x, y, z: tuple(O + x * ex + y * ey + z * ez)
    L, W, H = g.L, g.W, g.H
    out = Image.new("RGB", (1500, 1400), (238, 233, 225))
    sh = Image.new("L", out.size, 0)
    ImageDraw.Draw(sh).polygon([P(-6, 0, -4), P(L + 4, 0, -6), P(L + 30, 0, W + 10), P(10, 0, W + 14)], fill=120)
    out.paste((60, 45, 30), (0, 0), sh.filter(ImageFilter.GaussianBlur(28)))
    paste(out, front, [P(0, H, 0), P(L, H, 0), P(L, 0, 0), P(0, 0, 0)], 1.0)
    paste(out, side, [P(L, H, 0), P(L, H, W), P(L, 0, W), P(L, 0, 0)], 0.86)
    paste(out, top, [P(0, H, W), P(L, H, W), P(L, H, 0), P(0, H, 0)], 1.06)
    out = out.resize((1050, 980), Image.LANCZOS)
    out.save(os.path.join(HERE, f"caja-oso-mates-15x15x20_{theme}_MOCKUP.png"))


for t in ("NEGRA", "BLANCA", "MADERA", "KRAFT"):
    render(t)
print("ok")
