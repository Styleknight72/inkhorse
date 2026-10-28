#!/usr/bin/env python3
"""Bump Inkhorse's version in one go: app.html's INK_VERSION, the manual's ver string, and the manual's cover.
Usage:  python3 tools/bump-version.py "1.1 candidate" 75 2026-10-27
The cover is repainted from tools/manual-cover-base.png with the tagline and the release line, so the cover always names the revision it ships with."""
import sys, re, io, base64, hashlib, datetime
from PIL import Image, ImageDraw, ImageFont
release, rev, date = sys.argv[1], int(sys.argv[2]), sys.argv[3]
month = datetime.date.fromisoformat(date).strftime('%B %Y').upper()
P = 'app.html'; t = open(P, encoding='utf-8').read()
# 1. version constant
t, n = re.subn(r'window\.INK_VERSION=\{release:"[^"]*",rev:\d+,date:"[^"]*"\}', f'window.INK_VERSION={{release:"{release}",rev:{rev},date:"{date}"}}', t); assert n == 1
# 2. manual ver (phones refetch the manual when it changes)
t, n = re.subn(r'(const MANUAL=\{"id":"manual","ver":")[^"]*"', rf'\g<1>{date}-rev{rev}"', t); assert n == 1
# 3. cover
im = Image.open('tools/manual-cover-base.png').convert('RGB'); w, h = im.size; d = ImageDraw.Draw(im)
paper = im.getpixel((int(w*0.15), int(h*0.45))); gold = (176,133,45); grey = (120,120,120)
def band(y0, y1): d.rectangle((int(w*0.10), int(h*y0), int(w*0.90), int(h*y1)), fill=paper)
band(0.312, 0.340); band(0.588, 0.612)
def spaced(txt, size, color, cy, gap):
    f = ImageFont.truetype('/usr/share/fonts/truetype/google-fonts/Lora-Variable.ttf', size)
    try: f.set_variation_by_name('Medium')
    except Exception: pass
    widths = [d.textlength(ch, font=f) for ch in txt]; x = (w - (sum(widths) + gap*(len(txt)-1))) / 2
    for ch, cw in zip(txt, widths): d.text((x, cy), ch, font=f, fill=color, anchor='lm'); x += cw + gap
spaced('SAY · HEAR · FIX · PUBLISH', 34, gold, int(h*0.326), 10)
spaced(f'RELEASE {release.upper()} · REV {rev} · {month}', 26, grey, int(h*0.600), 5)
b = io.BytesIO(); im.save(b, 'JPEG', quality=86); data = b.getvalue()
new_id = hashlib.md5(data).hexdigest(); data_url = 'data:image/jpeg;base64,' + base64.b64encode(data).decode()
old_id = re.search(r'const MANUAL=\{[^\n]*?"coverFront":"([a-f0-9]+)"', t).group(1)
t, n = re.subn(r'"' + old_id + r'":"data:image/\w+;base64,[A-Za-z0-9+/=]*"', '"' + new_id + '":"' + data_url + '"', t); assert n == 1, 'cover data'
t = t.replace('"coverFront":"' + old_id + '"', '"coverFront":"' + new_id + '"')
t, n = re.subn(r'"' + old_id + r'":\{"w":\d+,"h":\d+\}', f'"{new_id}":{{"w":{w},"h":{h}}}', t); assert n == 1, 'cover size'
open(P, 'w', encoding='utf-8').write(t)
print(f'Inkhorse {release} · rev {rev} · {date}; manual cover {new_id}')
