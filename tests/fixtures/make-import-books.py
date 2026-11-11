# Makes the made-up books that are sent through every door of Inkhorse:  python3 -I tests/fixtures/make-import-books.py tests/fixtures/import  (needs python-docx and Pillow). Our own filler words; no real book.
import sys, os, zipfile, random, io
out=sys.argv[1]; random.seed(7)
W='the harbor lights were steady that evening and nobody on the long pier spoke about the weather or the boats while a patient keeper counted every remarkable lantern along the extraordinarily quiet waterfront'.split()
def para(k,n=None):
    n=n or 50+(k%5)*14
    s=' '.join(W[(i*7+k*3)%len(W)] for i in range(n)); return s[0].upper()+s[1:]+'.'
CH=['The Copper Kettle','A Long Way Round','What the Tide Left']
SENT=['The copper kettle sang on the stove while Marta counted the tide tables.','Nobody had told the ferryman that the bridge was already open.','By morning the tide had left nothing but a single green bottle on the sand.']
RAW=['She said, "It\'s time."  Then she laughed.','He waited -- too long, perhaps -- and the boat left.','Well... nobody answered.','The years 1980-1981 were the hard ones.']
def body(c):
    L=[SENT[c]]+[para(c*13+k) for k in range(3)]+[RAW[0],para(c*13+3),RAW[1],RAW[2],RAW[3]]+[para(c*13+4+k) for k in range(6)]
    return L
# 1. text file with "# " chapter lines, blank lines between paragraphs, a scene break, a section heading
t=[]
for c,name in enumerate(CH):
    t+=['# '+name,'']
    b=body(c)
    for i,l in enumerate(b):
        t+=[l,'']
        if i==5: t+=['* * *','']
t='\n'.join(t)
open(os.path.join(out,'hash-chapters.txt'),'w').write('Harbor Stories\n\n'+t)
# 2. text file with "Chapter 1" lines and no # at all, Windows line ends, tabs for indents
t=[]
for c,name in enumerate(CH):
    t+=['Chapter %d'%(c+1),name,'']
    for l in body(c): t+=['\t'+l]
    t+=['','']
open(os.path.join(out,'plain-chapters.txt'),'w',newline='').write('\r\n'.join(t))
# 3. Word file: Title, Heading 1 chapters, Heading 2 section, italics, a list, a quote, empty paragraphs, tab indents, a page break
import docx
from docx.enum.text import WD_BREAK
d=docx.Document(); d.add_paragraph('Harbor Stories',style='Title'); d.add_paragraph('Ada Tester',style='Subtitle')
for c,name in enumerate(CH):
    d.add_heading(name,level=1)
    b=body(c)
    for i,l in enumerate(b):
        p=d.add_paragraph(); p.add_run('\t'+l)
        if i==2:
            q=d.add_paragraph(); q.add_run('She read '); r=q.add_run('The Long Voyage Home'); r.italic=True; q.add_run(' twice that winter.')
            d.add_paragraph('')
        if i==4: d.add_heading('A Smaller Heading',level=2)
        if i==6:
            for it in ['bread and salt','lamp oil','two coils of rope']: d.add_paragraph(it,style='List Bullet')
            d.add_paragraph('Keep the lamp trimmed and the door unlatched.',style='Intense Quote')
    d.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
d.save(os.path.join(out,'word-book.docx'))
# 4. an EPUB built the way other publishers build them
X=lambda t,b,cls='':'<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en"><head><title>%s</title><link rel="stylesheet" href="../css/s.css" type="text/css"/></head><body class="%s">%s</body></html>'%(t,cls,b)
from PIL import Image
def png(w,h,col):
    im=Image.new('RGB',(w,h),col); b=io.BytesIO(); im.save(b,'PNG'); return b.getvalue()
z=zipfile.ZipFile(os.path.join(out,'foreign.epub'),'w')
z.writestr('mimetype','application/epub+zip',compress_type=zipfile.ZIP_STORED)
z.writestr('META-INF/container.xml','<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
z.writestr('OPS/css/s.css','p{margin:0 0 1em 0;text-indent:0}h2{font-size:2em}.c{text-align:center}')
z.writestr('OPS/img/cover.png',png(800,1200,(40,70,110))); z.writestr('OPS/img/map.png',png(600,400,(150,120,60)))
items=[('cover','text/cover.xhtml'),('title','text/title.xhtml'),('copy','text/copyright.xhtml'),('toc','text/toc.xhtml')]
z.writestr('OPS/text/cover.xhtml',X('Cover','<div class="c"><img src="../img/cover.png" alt="Cover"/></div>'))
z.writestr('OPS/text/title.xhtml',X('Harbor Stories','<h1 class="c">Harbor Stories</h1><p class="c">A Collection</p><p class="c">Ada Tester</p>'))
z.writestr('OPS/text/copyright.xhtml',X('Copyright','<p>Copyright © 2024 Ada Tester</p><p>All rights reserved. No part of this book may be reproduced.</p><p>ISBN 978-0-00-000000-0</p><p>First edition</p>'))
toc='<nav epub:type="toc" id="toc"><h2>Table of Contents</h2><ol>'
for c,name in enumerate(CH):
    f='text/ch%02d.xhtml'%(c+1); items.append(('ch%d'%(c+1),f))
    b=body(c); h='<div class="chapter"><p class="c">CHAPTER %s</p><h2>%s</h2>'%(['ONE','TWO','THREE'][c],name)
    for i,l in enumerate(b):
        l=l.replace('&','&amp;')
        h+='<p>&#160;&#160;&#160;&#160;%s</p>'%l
        if i==2: h+='<p>She read <em>The Long Voyage Home</em> twice that winter, and <b>never</b> lent it out.<a epub:type="noteref" href="#n%d">1</a></p>'%c
        if i==4: h+='<h3 id="s%d">A Smaller Heading</h3>'%c
        if i==5: h+='<hr/>'
        if i==6: h+='<ul><li>bread and salt</li><li>lamp oil</li><li>two coils of rope</li></ul><blockquote><p>Keep the lamp trimmed and the door unlatched.</p></blockquote><p>The gulls came in low,<br/>the nets came in full,<br/>and the lamp stayed lit.</p>'
        if i==8: h+='<figure><img src="../img/map.png" alt="A map of the harbor"/><figcaption>The harbor, drawn from memory</figcaption></figure>'
    h+='<aside epub:type="footnote" id="n%d"><p>1. A made-up title.</p></aside></div>'%c
    z.writestr('OPS/'+f,X(name,h))
    toc+='<li><a href="ch%02d.xhtml">%s</a><ol><li><a href="ch%02d.xhtml#s%d">A Smaller Heading</a></li></ol></li>'%(c+1,name,c+1,c)
toc+='</ol></nav>'
z.writestr('OPS/text/toc.xhtml',X('Table of Contents',toc))
man=''.join('<item id="%s" href="%s" media-type="application/xhtml+xml"%s/>'%(i,f,' properties="nav"' if i=='toc' else '') for i,f in items)
man+='<item id="css" href="css/s.css" media-type="text/css"/><item id="cov" href="img/cover.png" media-type="image/png" properties="cover-image"/><item id="map" href="img/map.png" media-type="image/png"/>'
z.writestr('OPS/package.opf','<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">urn:uuid:11111111-2222-4333-8444-555555555555</dc:identifier><dc:title>Harbor Stories</dc:title><dc:creator>Ada Tester</dc:creator><dc:language>en</dc:language><meta property="dcterms:modified">2024-01-01T00:00:00Z</meta></metadata><manifest>%s</manifest><spine>%s</spine></package>'%(man,''.join('<itemref idref="%s"/>'%i for i,_ in items)))
z.close()
import json; json.dump({'chapters':CH,'sent':SENT},open(os.path.join(out,'expect.json'),'w'))
print(sorted(os.listdir(out)))
