# Makes tests/fixtures/no-spaces.pdf:  python3 -I tests/fixtures/make-no-spaces.py tests/fixtures/no-spaces.pdf  (needs reportlab)
# A made-up two-page PDF that stores NO space characters: every word is placed on the page by position alone, the way many PDFs are written.
# Rule F10.1: Inkhorse puts a space back wherever the letters have a visible gap. Each paragraph is several printed lines (F10.2), and one word
# is split by a line-end hyphen (F10.4). Our own filler words; no real book's text.
import sys
from reportlab.pdfgen import canvas
out=sys.argv[1]; W,H=6*72,9*72
PARAS=['The quick brown fox walked along the harbor wall before the morning boats came in from the bay.',
 'Nobody on the long pier spoke about the weather, because the lights were steady and the water was calm.',
 'A patient writer counts every page, checks every line, and leaves nothing for the reader to trip over.',
 'When the last boat was tied up, the keeper closed the gate and walked home under the yellow lamps.',
 'The lighthouse keeper remem-|bered every storm that had ever crossed the bay in winter.']
# page 2 has its own sentences, so a test can tell whether the words of page 1 really came in (until rev 236 page 1 of every PDF was dropped)
PARAS2=['On the second page the ferry was late and the market had already closed for the day.',
 'The harbor master wrote the tide down in a green book that nobody else was allowed to read.']
c=canvas.Canvas(out,pagesize=(W,H)); font,sz='Times-Roman',11
for pageno in range(2):
    y=H-90; c.setFont('Times-Bold',16)
    if pageno==0:
        x=72
        for wd in 'Harbor Notes'.split(): c.drawString(x,y,wd); x+=c.stringWidth(wd,'Times-Bold',16)+5
        y-=40
    c.setFont(font,sz)
    for p in (PARAS if pageno==0 else PARAS2):
        x=72+18
        for wd in p.split():
            # "remem-|bered": the printed line ends after "remem-" (a hyphen that only splits the word at the line end, rule F10.4)
            parts=wd.split('|')
            for k,part in enumerate(parts):
                w=c.stringWidth(part,font,sz)
                if x+w>W-72 or k>0: x=72; y-=15
                c.drawString(x,y,part); x+=w+c.stringWidth(' ',font,sz)
        y-=15
    c.showPage()
c.save()
