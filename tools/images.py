"""Готує фото апартаментів для сайту: WebP у кількох ширинах, аватар, OG-картинку та іконки.
Запуск з кореня проєкту:  python tools/images.py
Оригінали лежать у assets/apartments/ (імена = ключі з src/data/copy.mjs).
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "apartments"
OUT = ROOT / "dist" / "img"
APT = OUT / "apt"
APT.mkdir(parents=True, exist_ok=True)

WIDTHS = (480, 960)
manifest = {}
for f in sorted(SRC.glob("*.jpg")):
    im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
    name, (w, h) = f.stem, im.size
    files = {}
    for tw in WIDTHS + (w,):
        if tw > w or str(tw) in files:
            continue
        out = APT / f"{name}-{tw}.webp"
        im.resize((tw, round(h * tw / w)), Image.LANCZOS).save(out, "WEBP", quality=80, method=6)
        files[str(tw)] = f"img/apt/{out.name}"
    files["full"] = files[str(w)]
    manifest[name] = {"w": w, "h": h, "files": files}
    print(f"{name}: {w}x{h} -> {', '.join(k for k in files if k != 'full')}")

(ROOT / "src" / "data" / "apt-images.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")

# Аватар для картки в hero (52px @2x)
pool = Image.open(SRC / "pool.jpg").convert("RGB")
ImageOps.fit(pool, (104, 104), Image.LANCZOS, centering=(0.42, 0.5)).save(OUT / "avatar.webp", "WEBP", quality=82)

# OG-картинка 1200x630
og = ImageOps.fit(pool, (1200, 630), Image.LANCZOS, centering=(0.5, 0.55))
shade = Image.new("L", (1, 630))
for y in range(630):
    shade.putpixel((0, y), int(max(0, (y - 250) / 380) ** 1.3 * 215))
og.paste(Image.new("RGB", og.size, (0, 0, 0)), (0, 0), shade.resize(og.size))
d = ImageDraw.Draw(og)
try:
    serif = ImageFont.truetype("C:/Windows/Fonts/georgia.ttf", 76)
    small = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 26)
except OSError:
    serif = small = ImageFont.load_default()
d.text((64, 470), "Madeira", font=serif, fill=(244, 242, 239))
d.text((64 + d.textlength("Madeira ", font=serif), 470), "Tour", font=serif, fill=(140, 135, 131))
d.text((66, 568), "FUNCHAL  ·  MADEIRA  ·  1–36 GUESTS  ·  POOL  ·  YACHT  ·  GUIDES", font=small, fill=(244, 242, 239))
og.save(OUT / "og.jpg", "JPEG", quality=84, optimize=True, progressive=True)

# Іконки
S = 512
ic = Image.new("RGB", (S, S), (0, 0, 0))
d = ImageDraw.Draw(ic)
c, r = S / 2, S * 0.3
d.ellipse([c - r, c - r, c + r, c + r], outline=(244, 242, 239), width=int(S * 0.04))
d.ellipse([c - r, c - r * 0.37, c + r, c + r * 0.37], outline=(150, 147, 143), width=int(S * 0.025))
d.ellipse([c + r * 0.42 - S * 0.055, c - r * 0.42 - S * 0.055, c + r * 0.42 + S * 0.055, c - r * 0.42 + S * 0.055], fill=(244, 242, 239))
ic.save(OUT / "icon-512.png", optimize=True)
ic.resize((192, 192), Image.LANCZOS).save(OUT / "icon-192.png", optimize=True)
ic.resize((180, 180), Image.LANCZOS).save(OUT / "apple-touch-icon.png", optimize=True)

total = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
print(f"OK: dist/img = {total / 1024:.0f} KB")

# Фото локацій (завантажені tools/fetch_photos.py) -> WebP кількох ширин для глобуса, атласу й перегляду
PSRC = ROOT / "assets" / "photos"
POUT = OUT / "photos"
POUT.mkdir(parents=True, exist_ok=True)
pman, psize = {}, 0
for f in sorted(PSRC.glob("*.jpg")):
    im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
    key, (w, h) = f.stem, im.size
    files = {}
    for tw in (280, 560, 960, 1280):
        tw = min(tw, w)
        if str(tw) in files:
            continue
        out = POUT / f"{key}-{tw}.webp"
        im.resize((tw, round(h * tw / w)), Image.LANCZOS).save(out, "WEBP", quality=78 if tw <= 560 else 80, method=6)
        files[str(tw)] = f"img/photos/{out.name}"
        psize += out.stat().st_size
    pman[key] = {"w": w, "h": h, "files": files}
(ROOT / "src" / "data" / "photo-files.json").write_text(json.dumps(pman, indent=1), encoding="utf-8")
print(f"photos: {len(pman)} -> WebP {psize / 1024 / 1024:.1f} MB total")
