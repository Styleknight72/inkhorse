"""Puts the StyleKnight horse into every picture that carries it. Rev 260 (Nov 16, 2026): Steve's new chrome horse.
Use (from the repo root):  python3 -I tools/brand/apply-horse.py brand/horse-chrome-2026-11-16.png [preview/next.html]
The originals in brand/ are never overwritten: the new signs are written beside them as sign-day-chrome.png / sign-night-chrome.png.
The new horse is fitted whole inside the exact space the old horse had, centred, so nothing around it moves.
After this: node tools/back-covers.js <html>, python3 tools/bump-version.py ... (repaints the manual cover), rebuild the e-books, node tools/embed-standard.js <html>."""
import sys, io, re, base64, glob
from PIL import Image, ImageChops
SRC = sys.argv[1]; HTML = sys.argv[2] if len(sys.argv) > 2 else None
new = Image.open(SRC).convert('RGBA'); new = new.crop(new.getbbox())

def fit(box_w, box_h):
    s = min(box_w / new.width, box_h / new.height); w, h = max(1, round(new.width * s)), max(1, round(new.height * s))
    return new.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')     # premultiplied, so the edge keeps no dark fringe

def paste(im, box):
    l, t, r, b = box; h = fit(r - l, b - t); im.alpha_composite(h, (l + (r - l - h.width) // 2, t + (b - t - h.height) // 2))

def first_cluster(mask, gap):
    """bbox of the leftmost group of marked columns: the horse stands left of the lettering, with a clear gap between"""
    bb = mask.getbbox(); cols = [mask.crop((x, 0, x + 1, mask.height)).getbbox() is not None for x in range(mask.width)]
    x0 = bb[0]; x1 = x0; run = 0
    for x in range(x0, mask.width):
        if cols[x]: x1 = x; run = 0
        else:
            run += 1
            if run >= gap: break
    return mask.crop((x0, 0, x1 + 1, mask.height)).getbbox(), x0, x1 + 1

def swap_transparent(path, out=None, lockup=False):
    im = Image.open(path).convert('RGBA'); a = im.getchannel('A').point(lambda v: 255 if v > 8 else 0)
    if lockup: bb, x0, x1 = first_cluster(a, max(12, im.width // 60)); box = (x0, bb[1], x1, bb[3])
    else: box = a.getbbox()
    l, t, r, b = box; im.paste((0, 0, 0, 0), (max(0, l - 3), max(0, t - 3), min(im.width, r + 3), min(im.height, b + 3))); paste(im, box); im.save(out or path); return box

def swap_opaque(path, lockup=False, quality=None, thr=14):
    im = Image.open(path).convert('RGB'); W, H = im.size
    edge = im.crop((2, 0, 3, H)).resize((W, H))                         # each row's own background colour, taken at the left edge
    diff = ImageChops.difference(im, edge).convert('L').point(lambda v: 255 if v > thr else 0)
    if lockup: bb, x0, x1 = first_cluster(diff, max(10, W // 70)); box = (x0, bb[1], x1, bb[3])
    else: box = diff.getbbox()
    l, t, r, b = box; pad = max(3, W // 200); er = (max(0, l - pad), max(0, t - pad), min(W, r + pad), min(H, b + pad))
    src_x = er[0] - 2 if er[0] >= 4 else er[2] + 2                        # background beside the horse, row by row (covers have a border, so not the page edge)
    strip = im.crop((src_x, er[1], src_x + 1, er[3])).resize((er[2] - er[0], er[3] - er[1])); im.paste(strip, er[:2])
    o = im.convert('RGBA'); paste(o, box); o = o.convert('RGB')
    o.save(path, quality=quality) if quality else o.save(path); return box

done = []
for f in ['horse.png', 'icons/splash-horse.png']: done.append((f, swap_transparent(f)))
done.append(('brand/sign-day-chrome.png', swap_transparent('brand/sign-day.png', 'brand/sign-day-chrome.png', lockup=True)))
done.append(('brand/sign-night-chrome.png', swap_transparent('brand/sign-night.png', 'brand/sign-night-chrome.png', lockup=True)))
for f in ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'] + sorted(glob.glob('icons/launch-*.png')): done.append((f, swap_opaque(f)))
done.append(('tools/manual-lockup.png', swap_opaque('tools/manual-lockup.png', lockup=True)))

def swap_sign_block(path, band=None, quality=None, thr=20):
    """Pictures where the whole sign (horse and lettering) sits among other words: find the sign as the tallest block of rows, and lay the new sign over it."""
    full = Image.open(path).convert('RGB'); W0, H0 = full.size; band = band or (0, 0, W0, H0); im = full.crop(band); W, H = im.size
    edge = im.crop((2, 0, 3, H)).resize((W, H)); diff = ImageChops.difference(im, edge).convert('L').point(lambda v: 255 if v > thr else 0)
    rows = [diff.crop((0, y, W, y + 1)).getbbox() is not None for y in range(H)]; blocks = []; y = 0
    while y < H:
        if rows[y]:
            y0 = y
            while y < H and (rows[y] or any(rows[y:y + 6])): y += 1
            blocks.append((y0, y))
        else: y += 1
    y0, y1 = max(blocks, key=lambda q: q[1] - q[0]); bb = diff.crop((0, y0, W, y1)).getbbox(); box = (bb[0], y0 + bb[1], bb[2], y0 + bb[3])
    sign = Image.open('brand/sign-day-chrome.png').convert('RGBA'); sign = sign.crop(sign.getbbox())
    pad = max(3, W // 300); er = (max(0, box[0] - pad), max(0, box[1] - pad), min(W, box[2] + pad), min(H, box[3] + pad))
    strip = im.crop((er[0] - 2 if er[0] >= 4 else er[2] + 2, er[1], (er[0] - 2 if er[0] >= 4 else er[2] + 2) + 1, er[3])).resize((er[2] - er[0], er[3] - er[1])); im.paste(strip, er[:2])
    s = min((box[2] - box[0]) / sign.width, (box[3] - box[1]) / sign.height); sg = sign.convert('RGBa').resize((round(sign.width * s), round(sign.height * s)), Image.LANCZOS).convert('RGBA')
    o = im.convert('RGBA'); o.alpha_composite(sg, (box[0] + (box[2] - box[0] - sg.width) // 2, box[1] + (box[3] - box[1] - sg.height) // 2)); full.paste(o.convert('RGB'), band[:2])
    full.save(path, quality=quality) if quality else full.save(path); return (band[0] + box[0], band[1] + box[1], band[0] + box[2], band[1] + box[3])

done.append(('card.png', swap_sign_block('card.png')))
for f in ['docs/formatting-standard-cover.jpg', 'docs/publishing-standard-cover.jpg', 'docs/release-notes-cover.jpg']:
    W, H = Image.open(f).size; done.append((f, swap_sign_block(f, band=(int(W * .12), int(H * .68), int(W * .88), int(H * .93)), quality=92)))   # the cream panel's lower part only: the title above is never touched
for f, b in done: print(f'{f:44s} horse space {b[2]-b[0]}x{b[3]-b[1]} at {b[0]},{b[1]}')

if HTML:
    t = open(HTML, encoding='utf-8').read()
    def b64(im, fmt='PNG'):
        o = io.BytesIO(); im.save(o, fmt, optimize=True); return base64.b64encode(o.getvalue()).decode()
    def put(pattern, data, what):
        global t
        t, n = re.subn(pattern, lambda m: m.group(1) + data + m.group(2), t); assert n == 1, (what, n); print('in the app:', what)
    sz = lambda cls: Image.open(io.BytesIO(base64.b64decode(re.search(r'<img class="lockup ' + cls + r'" src="data:image/png;base64,([A-Za-z0-9+/=]+)"', t).group(1)))).size
    put(r'(<img class="lockup lk-light" src="data:image/png;base64,)[A-Za-z0-9+/=]+(")', b64(Image.open('brand/sign-day-chrome.png').convert('RGBA').convert('RGBa').resize(sz('lk-light'), Image.LANCZOS).convert('RGBA')), 'header sign, light')
    put(r'(<img class="lockup lk-dark" src="data:image/png;base64,)[A-Za-z0-9+/=]+(")', b64(Image.open('brand/sign-night-chrome.png').convert('RGBA').convert('RGBa').resize(sz('lk-dark'), Image.LANCZOS).convert('RGBA')), 'header sign, dark')
    put(r'(<link rel="apple-touch-icon" href="data:image/png;base64,)[A-Za-z0-9+/=]+(")', base64.b64encode(open('icons/apple-touch-icon.png', 'rb').read()).decode(), 'home-screen icon')
    put(r'("manual-lockup":"data:image/png;base64,)[A-Za-z0-9+/=]+(")', base64.b64encode(open('tools/manual-lockup.png', 'rb').read()).decode(), 'the sign on the manual\'s first page')
    open(HTML, 'w', encoding='utf-8').write(t)
