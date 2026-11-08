"""Завантажує фото локацій з Wikimedia Commons (версії до 1280 px) у assets/photos/.
Запуск з кореня проєкту:  python tools/fetch_photos.py
Уже завантажені файли пропускаються. Автори й ліцензії — у src/data/photos.json (показуються на сайті).
"""
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "photos"
OUT.mkdir(parents=True, exist_ok=True)
UA = "MadeiraTourSite/1.0 (static travel site build; photos credited to authors)"
photos = json.loads((ROOT / "src" / "data" / "photos.json").read_text(encoding="utf-8"))

total = 0
for key, ph in photos.items():
    dst = OUT / f"{key}.jpg"
    if dst.exists() and dst.stat().st_size > 10_000:
        total += dst.stat().st_size
        continue
    url = ph["url"] if ph["w"] <= 1280 else f'{ph["thumbBase"]}/1280px-{ph["thumbName"]}'
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            data = urllib.request.urlopen(req, timeout=60).read()
            dst.write_bytes(data)
            total += len(data)
            print(f"{key:14} {len(data) // 1024:5} KB")
            break
        except urllib.error.HTTPError as e:
            if e.code != 429:
                print(f"{key}: HTTP {e.code}"); break
            time.sleep(8 * (attempt + 1))
        except Exception as e:  # мережеві збої — повторюємо
            print(f"{key}: {e}"); time.sleep(4)
    time.sleep(1.1)

print(f"OK: {len(list(OUT.glob('*.jpg')))} photos, {total / 1024 / 1024:.1f} MB")
