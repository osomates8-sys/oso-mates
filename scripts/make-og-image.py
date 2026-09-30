#!/usr/bin/env python3
"""Recorta una foto a un JPG cuadrado para og:image.
Uso: python3 scripts/make-og-image.py <origen> <destino> <x%> <y%> <lado>  (requiere Pillow)"""
import sys
from PIL import Image

src, dst, x, y, size = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5])
im = Image.open(src).convert('RGB')
w, h = im.size
side = min(w, h)
left = round((w - side) * x / 100)
top = round((h - side) * y / 100)
im.crop((left, top, left + side, top + side)).resize((size, size), Image.LANCZOS).save(dst, 'JPEG', quality=82, optimize=True, progressive=True)
