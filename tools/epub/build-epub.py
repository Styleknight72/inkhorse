# Builds an EPUB 3 from a Markdown document with front matter (title, subtitle, author, edition), set to the Inkhorse Formatting Standard.
# Used for docs/FORMATTING-STANDARD.md and CHANGELOG.md.  Usage: python3 -I tools/epub/build-epub.py doc.md cover.jpg out.epub
import re, sys, zipfile, html, uuid, datetime
src, cover, out = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(src, encoding='utf-8').read()
fm, body = re.match(r'^---\n(.*?)\n---\n(.*)$', text, re.S).groups()
meta = dict(l.split(': ',1) for l in fm.splitlines())
E = lambda s: html.escape(s, quote=False)
def inline(s):
    s = E(s)
    s = re.sub(r'^(F\d+\.\d+)\b', r'<b class="rid">\1</b>', s)          # rule numbers
    s = re.sub(r'“([^”]{1,80})”', r'“\1”', s)
    return s
# split into chapters at "# "
parts = re.split(r'^# (.+)$', body, flags=re.M)[1:]
chapters = [(parts[i].strip(), parts[i+1].strip()) for i in range(0, len(parts), 2)]
def render(title, md, num):
    blocks = re.split(r'\n\s*\n', md)
    out = []; first = True; secs = []
    for b in blocks:
        b = b.strip()
        if not b: continue
        if b.startswith('## '):
            h = b[3:].strip(); sid = f's{len(secs)+1}'; secs.append((sid, h))
            out.append(f'<h2 id="{sid}">{E(h)}</h2>'); first = True; continue
        lines = b.splitlines()
        if all(re.match(r'^(- |\d+\. )', l) for l in lines):
            tag = 'ol' if re.match(r'^\d+\. ', lines[0]) else 'ul'
            out.append(f'<{tag}>' + ''.join(f'<li>{inline(re.sub(r"^(- |\d+\. )","",l))}</li>' for l in lines) + f'</{tag}>'); first = True; continue
        if len(lines) > 1 and all(re.match(r'^(- |\d+\. )', l) for l in lines[1:]):
            out.append(f'<p{" class=\"first\"" if first else ""}>{inline(lines[0])}</p>')
            tag = 'ol' if re.match(r'^\d+\. ', lines[1]) else 'ul'
            out.append(f'<{tag}>' + ''.join(f'<li>{inline(re.sub(r"^(- |\d+\. )","",l))}</li>' for l in lines[1:]) + f'</{tag}>'); first = True; continue
        p = ' '.join(lines)
        if first:  # F2.4/F3.4: no indent after a heading; F2.5: first words in small capitals at a chapter start
            m = re.match(r'^(\S+(?:\s+\S+){0,2})(.*)$', inline(p)) if not out else None
            if m and not out: out.append(f'<p class="first"><span class="sc">{m.group(1)}</span>{m.group(2)}</p>')
            else: out.append(f'<p class="first">{inline(p)}</p>')
            first = False
        else: out.append(f'<p>{inline(p)}</p>')
    label = 'PART ' + title.split('·')[0].replace('Part','').strip() if title.startswith('Part') else ''
    head = title.split('·',1)[1].strip() if '·' in title else title
    # the part label sits inside the heading, so every reader (Inkhorse included) takes the whole line as the chapter title
    h1 = (f'<h1><span class="label">{E(label.title())}</span><span class="sep"> · </span><span class="ht">{E(head)}</span></h1>' if label else f'<h1>{E(head)}</h1>')
    return (f'{label.title()} · {head}' if label else head), secs, f'<section epub:type="chapter" class="chapter">{h1}' + '\n'.join(out) + '</section>'
CSS = """
@namespace epub "http://www.idpf.org/2007/ops";
body{font-family:Georgia,'Times New Roman',serif;line-height:1.45;margin:0 5%;}
p{margin:0;text-indent:1.3em;text-align:justify;-webkit-hyphens:auto;hyphens:auto;widows:2;orphans:2}
p.first,h1+p,h2+p{text-indent:0}
.sc{font-variant:small-caps;letter-spacing:.04em}
.chapter{page-break-before:always}
h1 .label{display:block;font-size:.5em;letter-spacing:.25em;text-transform:uppercase;color:#7a6a52;margin-bottom:.6em}
h1 .sep{display:none}
h1 .ht{display:block}
h1{text-align:center;font-weight:normal;font-size:1.6em;margin:.4em 0 1.6em;page-break-after:avoid}
.chapter>h1:first-child{margin-top:30%}
h2{font-size:1.1em;font-weight:bold;text-align:left;margin:1.6em 0 .6em;page-break-after:avoid}
ul,ol{margin:.5em 0 .8em 1.4em;padding:0}
li{margin:.2em 0;text-align:left}
b.rid{font-variant-numeric:lining-nums;color:#8b5a2b}
.titlepage{text-align:center;margin-top:30%}
.titlepage .t1{font-size:.9em;letter-spacing:.3em;text-indent:0;text-align:center;color:#8b5a2b}
.titlepage .t2{font-size:2em;text-align:center;margin:.2em 0}
.titlepage .t3{font-style:italic;text-indent:0;text-align:center;margin:.6em 0 2em}
.titlepage .t4{text-indent:0;text-align:center;font-variant:small-caps;letter-spacing:.06em}
.copyright{margin-top:45%;font-size:.8em}
.copyright .cph{font-size:1.2em;text-align:left;margin:0 0 .8em}
.copyright p{text-indent:0;text-align:left;margin:.4em 0}
nav ol{list-style:none;margin:0;padding:0}
nav li{margin:.5em 0}
nav li li{margin:.25em 0 .25em 1.2em;font-size:.92em}
nav a{text-decoration:none;color:inherit}
nav h1{margin-top:15%}
"""
def page(title, body, extra=''):
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en"><head><meta charset="utf-8"/><title>{E(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body{extra}>{body}</body></html>'
bid = 'urn:uuid:' + str(uuid.uuid5(uuid.NAMESPACE_URL, 'getinkhorse.com/' + meta['title']))
z = zipfile.ZipFile(out, 'w')
z.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
z.writestr('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>', compress_type=zipfile.ZIP_DEFLATED)
D = lambda n, s: z.writestr('OEBPS/'+n, s, compress_type=zipfile.ZIP_DEFLATED)
D('style.css', CSS)
z.write(cover, 'OEBPS/cover.jpg', compress_type=zipfile.ZIP_DEFLATED)
D('cover.xhtml', page('Cover', f'<div style="text-align:center"><img src="cover.jpg" alt="{E(meta["title"])}" style="max-width:100%;max-height:100%"/></div>'))
D('title.xhtml', page('Title page', f'<section epub:type="titlepage" class="titlepage"><h1 class="t2">{E(meta["title"])}</h1><p class="t3">{E(meta["subtitle"])}</p><p class="t4">{E(meta["author"])}</p></section>'))
D('copyright.xhtml', page('Copyright', f'<section epub:type="copyright-page" class="copyright"><h1 class="cph">Copyright</h1><p>{E(meta["title"])}</p><p>{E(meta["edition"])}</p><p>© 2026 Steve Claude Patient (StyleKnight). All rights reserved.</p><p>Inkhorse™ and StyleKnight™ are trademarks of Steve Claude Patient.</p><p>getinkhorse.com</p><p>Powered by StyleKnight &amp; Claude</p></section>'))
items, spine, navl = [], [], []
for i, (t, md) in enumerate(chapters, 1):
    head, secs, xhtml = render(t, md, i)
    fn = f'ch{i:02}.xhtml'; D(fn, page(head, xhtml)); items.append(fn); spine.append(fn)
    lab = t.replace('·', '·')
    sub = ''.join(f'<li><a href="{fn}#{sid}">{E(h)}</a></li>' for sid, h in secs if not re.match(r'^F\d+ · ', h) or True)
    navl.append(f'<li><a href="{fn}">{E(lab)}</a>' + (f'<ol>{sub}</ol>' if sub else '') + '</li>')
D('nav.xhtml', page('Contents', f'<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>{"".join(navl)}</ol></nav><nav epub:type="landmarks" hidden=""><ol><li><a epub:type="cover" href="cover.xhtml">Cover</a></li><li><a epub:type="toc" href="nav.xhtml">Contents</a></li><li><a epub:type="bodymatter" href="ch01.xhtml">Start</a></li></ol></nav>'))
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
man = ''.join(f'<item id="i{k}" href="{f}" media-type="application/xhtml+xml"/>' for k, f in enumerate(items))
z.writestr('OEBPS/content.opf', f'''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="en"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">{bid}</dc:identifier><dc:title>{E(meta['title'])}</dc:title><dc:creator>StyleKnight &amp; Claude</dc:creator><dc:language>en</dc:language><dc:publisher>StyleKnight</dc:publisher><dc:rights>© 2026 Steve Claude Patient. All rights reserved.</dc:rights><meta property="dcterms:modified">{now}</meta><meta name="cover" content="cover-image"/></metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/><item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/><item id="coverpage" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="title" href="title.xhtml" media-type="application/xhtml+xml"/><item id="copy" href="copyright.xhtml" media-type="application/xhtml+xml"/>{man}</manifest>
<spine><itemref idref="coverpage" linear="yes"/><itemref idref="title"/><itemref idref="copy"/><itemref idref="nav"/>{''.join(f'<itemref idref="i{k}"/>' for k in range(len(items)))}</spine></package>''', compress_type=zipfile.ZIP_DEFLATED)
z.close(); print('chapters', len(chapters))
