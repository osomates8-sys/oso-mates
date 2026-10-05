"""Oso Mates - genera miniaturas livianas (thumbs/<nombre>.webp, 320 px de ancho)
para las fotos chicas: miniaturas de la galería, carrito, buscador y grilla de Instagram.
Uso: python3 scripts/make-thumbs.py   (solo crea las que faltan)
Si una foto no tiene miniatura, la página usa la foto original."""
import os, sys
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'thumbs')
ANCHO = 320
os.makedirs(OUT, exist_ok=True)
hechas = 0
for f in sorted(os.listdir(ROOT)):
    base, ext = os.path.splitext(f)
    if ext.lower() not in ('.webp', '.jpg', '.jpeg', '.png') or f.startswith('og-image'):
        continue
    dest = os.path.join(OUT, base + '.webp')
    if os.path.exists(dest):
        continue
    with Image.open(os.path.join(ROOT, f)) as im:
        im = ImageOps.exif_transpose(im).convert('RGB')
        if im.width > ANCHO:
            im = im.resize((ANCHO, round(im.height * ANCHO / im.width)), Image.LANCZOS)
        im.save(dest, 'WEBP', quality=80, method=6)
    hechas += 1
    print('✓ thumbs/' + base + '.webp')
if not hechas:
    print('Miniaturas al día.', file=sys.stderr)
