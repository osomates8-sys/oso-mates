"""Vectoriza logo-original.png (potrace) -> logo_paths.json con curvas Bézier agrupadas."""
import json, os
import numpy as np, potrace
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SC = 4
im = Image.open(os.path.join(HERE, "logo-original.png")).convert("L")
im = im.resize((im.width * SC, im.height * SC), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.5))
bmp = potrace.Bitmap(np.array(im) < 128)
plist = bmp.trace(turdsize=60, alphamax=1.0, opticurve=True, opttolerance=0.3)

curves = []
for cv in plist:
    segs = []
    for s in cv.segments:
        if s.is_corner:
            segs.append(["L", s.c.x / SC, s.c.y / SC, s.end_point.x / SC, s.end_point.y / SC])
        else:
            segs.append(["C", s.c1.x / SC, s.c1.y / SC, s.c2.x / SC, s.c2.y / SC,
                         s.end_point.x / SC, s.end_point.y / SC])
    xs = [v for s in segs for v in s[1::2]]
    ys = [v for s in segs for v in s[2::2]]
    curves.append({"start": [cv.start_point.x / SC, cv.start_point.y / SC], "segs": segs,
                   "bbox": [min(xs), min(ys), max(xs), max(ys)]})
json.dump({"size": [750, 749], "curves": curves}, open(os.path.join(HERE, "logo_paths.json"), "w"))
print(len(curves))
