# Makes tests/fixtures/no-spaces.pdf:  python3 -I tests/fixtures/make-no-spaces.py tests/fixtures/no-spaces.pdf  (needs reportlab)
# A made-up two-page PDF that stores NO space characters: every word is placed on the page by position alone, the way many PDFs are written.
# Rule F10.1: Inkhorse puts a space back wherever the letters have a visible gap. Our own filler words; no real book's text.
import sys
from reportlab.pdfgen import canvas
out=sys.argv[1]; W,H=6*72,9*72
PARAS=['The quick brown fox walked along the harbor wall before the morning boats came in from the bay.',
 'Nobody on the long pier spoke about the weather, because the lights were steady and the water was calm.',
 'A patient writer counts every page, checks every line, and leaves nothing for the reader to trip over.',
 'When the last boat was tied up, the keeper closed the gate and walked home under the yellow lamps.']
c=canvas.Canvas(out,pagesize=(W,H)); font,sz='Times-Roman',11
for pageno in range(2):
    y=H-90; c.setFont('Times-Bold',16)
    if pageno==0:
        x=72
        for wd in 'Harbor Notes'.split(): c.drawString(x,y,wd); x+=c.stringWidth(wd,'Times-Bold',16)+5
        y-=40
    c.setFont(font,sz)
    for p in (PARAS if pageno==0 else PARAS[::-1]):
        x=72+18
        for wd in p.split():
            w=c.stringWidth(wd,font,sz)
            if x+w>W-72: x=72; y-=15
            c.drawString(x,y,wd); x+=w+c.stringWidth(' ',font,sz)
        y-=15
    c.showPage()
c.save()
