"""Puts retaken pictures into the manual inside the app. Use:  python3 -I tools/manual-pics/swap.py <folder with the new pictures> preview/next.html
Each picture in the manual is named by the fingerprint of its own bytes, so a new picture gets a new name: this changes the picture, its name
wherever the manual's text uses it, and its recorded size, all together, and stops if any of the three is not found exactly as expected."""
import sys, re, io, base64, hashlib, os
from PIL import Image
folder, P = sys.argv[1], sys.argv[2]; t = open(P, encoding='utf-8').read()
want = {'write': 'the Write screen', 'read': 'the Read screen', 'compare': 'the Compare screen', 'hlbar': 'the Highlighter'}
# which picture in the manual is which: found by the words around it, not by a name written down here, so this keeps working after the next retake
finders = {'write': r'\[\[image ([a-f0-9]{32}) \| inline \| 34% \| center\]\]\\nWrite: Type, dictate', 'read': r'\[\[image ([a-f0-9]{32}) \| inline \| 34% \| center\]\]\\nRead: See your chapter as real book pages',
           'compare': r'\[\[image ([a-f0-9]{32}) \| inline \| 34% \| center\]\]\\nCompare: How many words', 'hlbar': r'\[\[image ([a-f0-9]{32}) \| inline \| 62% \| center \| The Highlighter on'}   # each picture stands just above the words that describe it
for name, what in want.items():
    f = next(os.path.join(folder, name + e) for e in ('.jpg', '.png') if os.path.exists(os.path.join(folder, name + e)))
    data = open(f, 'rb').read(); im = Image.open(io.BytesIO(data)); w, h = im.size; kind = 'jpeg' if f.endswith('.jpg') else 'png'
    m = re.search(finders[name], t); assert m, 'cannot find ' + what + ' in the manual'; old = m.group(1); new = hashlib.md5(data).hexdigest()
    if new == old: print(what + ': already this picture'); continue
    t, n1 = re.subn('"' + old + r'":"data:image/\w+;base64,[A-Za-z0-9+/=]*"', '"' + new + '":"data:image/' + kind + ';base64,' + base64.b64encode(data).decode() + '"', t); assert n1 == 1, (what, 'picture', n1)
    t, n2 = re.subn('"' + old + r'":\{"w":\d+,"h":\d+\}', '"%s":{"w":%d,"h":%d}' % (new, w, h), t); assert n2 == 1, (what, 'size', n2)
    n3 = t.count('[[image ' + old + ' '); assert n3 >= 1, (what, 'uses', n3); t = t.replace('[[image ' + old + ' ', '[[image ' + new + ' ')
    assert old not in t, (what, 'old name still somewhere'); print(f'{what}: {w}x{h}, used {n3} time(s), {len(data)//1024} KB')
open(P, 'w', encoding='utf-8').write(t)
