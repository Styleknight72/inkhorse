# Makes tests/fixtures/dummies-like.pdf:  python3 -I tests/fixtures/make-dummies-like.py tests/fixtures/dummies-like.pdf  (needs reportlab)
# A made-up book laid out the way "For Dummies" PDFs are: bookmarks Title Page / Copyright Page / Table of Contents / Introduction / Part N / Chapter N: ... / Index.
# The "Contents at a Glance" pages sit under the Copyright Page bookmark, with no dot leaders. Our own filler text; no real book's words.
import random, sys
from reportlab.pdfgen import canvas
random.seed(11); out=sys.argv[1]
W,H=7.4*72,9.25*72
WORDS='mesh object scene render camera light vertex edge face modifier material texture node timeline keyframe curve armature bone weight paint sculpt brush viewport shading editor panel menu tool select move rotate scale extrude bevel loop cut join separate origin cursor layer collection outliner property setting value option the a of to and in is that you can with for on it this as your when then each by from'.split()
def sent(n0=8,n1=18): n=random.randint(n0,n1); s=' '.join(random.choice(WORDS) for _ in range(n)); return s[0].upper()+s[1:]+'.'
def para(): return ' '.join(sent() for _ in range(random.randint(3,6)))
parts=['Wrapping Your Brain Around the Program','Creating Detailed Scenes','Get Animated','Sharing Your Work with the World','The Part of Tens']
chs=['Discovering the Program','Understanding the Interface','Getting Your Hands Dirty','Working in Edit Mode','Creating Anything You Can Imagine','Using Curves and Surfaces','Sculpting in Virtual Space','Changing That Boring Gray Look','Giving Models Texture','Lighting and Environment','Animating Objects','Rigging Characters','Animating Object Deformations','Letting the Computer Do the Work','Making 2D Animation','Exporting and Rendering Scenes','Editing Video and Animation','Compositing Images and Video','Mastering the Grease Pencil','Ten Tips for Working More Effectively','Ten Excellent Community Resources']
per=[4,5,5,5,2]
c=canvas.Canvas(out,pagesize=(W,H)); pg=[1]
def newpage(head=None):
    c.showPage(); pg[0]+=1
    if head:
        c.setFont('Helvetica',8)
        if pg[0]%2==0: c.drawString(54,H-40,f'{pg[0]}'); c.drawString(84,H-40,head[0])
        else: c.drawRightString(W-54,H-40,f'{pg[0]}'); c.drawRightString(W-84,H-40,head[1])
def wrap(t,w,font='Times-Roman',sz=10.5):
    out=[];cur=''
    for wd in t.split():
        if c.stringWidth((cur+' '+wd).strip(),font,sz)>w: out.append(cur); cur=wd
        else: cur=(cur+' '+wd).strip()
    if cur: out.append(cur)
    return out
def flow(paras,head,y):
    for p in paras:
        style,txt=p if isinstance(p,tuple) else ('p',p)
        font,sz,lead,x=('Helvetica-Bold',13,22,54) if style=='h' else ('Times-Roman',10.5,14,54)
        for l in wrap(txt,W-108,font,sz):
            if y<60: newpage(head); y=H-80
            c.setFont(font,sz); c.drawString(x,y,l); y-=lead
        y-=8
    return y
bms=[]
def bm(t): key=f'k{pg[0]}'; c.bookmarkPage(key); c.addOutlineEntry(t,key,level=0)
# page 1: cover
c.setFont('Helvetica-Bold',40); c.drawCentredString(W/2,H/2,'Blendworks'); c.setFont('Helvetica',16); c.drawCentredString(W/2,H/2-40,'for Learners')
newpage(); bm('Title Page'); c.setFont('Helvetica-Bold',30); c.drawCentredString(W/2,H-220,'Blendworks'); c.setFont('Helvetica',14); c.drawCentredString(W/2,H-260,'4th Edition'); c.drawCentredString(W/2,H-330,'by Jason Example')
newpage(); bm('Copyright Page'); c.setFont('Times-Bold',10); c.drawString(54,H-80,'Blendworks For Learners®, 4th Edition')
y=flow(['Published by: Example Sons, Inc., 111 River Street, Hoboken, NJ 07030-5774','Copyright © 2020 by Example Sons, Inc., Hoboken, New Jersey','Published simultaneously in Canada','No part of this publication may be reproduced, stored in a retrieval system or transmitted in any form or by any means, electronic, mechanical, photocopying, recording, scanning or otherwise, except as permitted under Sections 107 or 108 of the 1976 United States Copyright Act, without the prior written permission of the Publisher.']+[para() for _ in range(5)]+['Library of Congress Control Number: 2019950000','ISBN 978-1-119-00000-2; ISBN 978-1-119-00000-6 (ePub); ISBN 978-1-119-00000-3 (ePDF)','Manufactured in the United States of America'],None,H-110)
c.setFont('Times-Roman',10.5); c.drawString(54,y-10,'10 9 8 7 6 5 4 3 2 1')
# Contents at a Glance: no leaders, number right after a gap, under the Copyright bookmark
newpage(); c.setFont('Helvetica-Bold',24); c.drawString(54,H-90,'Contents at a Glance'); y=H-140
glance=[('Introduction',1)]; p=7; k=0
for pi,pt in enumerate(parts):
    glance.append((f'Part {pi+1}: {pt}',p)); p+=2
    for j in range(per[pi]): glance.append((f'CHAPTER {k+1}: {chs[k]}',p)); p+=random.randint(20,40); k+=1
glance.append(('Index',p))
for t,n in glance:
    if y<70: newpage(); y=H-80
    big=not t.startswith('CHAPTER'); c.setFont('Helvetica-Bold' if big else 'Times-Roman',11 if big else 10.5); x=54 if big else 70
    c.drawString(x,y,t); c.drawString(x+c.stringWidth(t,'Helvetica-Bold' if big else 'Times-Roman',11 if big else 10.5)+4,y,str(n)); y-=(20 if big else 15)
# Table of Contents with leaders, levels, and a section that starts with its chapter's title words
newpage(); bm('Table of Contents'); c.setFont('Helvetica-Bold',22); c.drawString(54,H-90,'Table of Contents'); y=H-130
toc=[(0,'INTRODUCTION',1),(1,'About This Book',1),(1,'Foolish Assumptions',2),(1,'Where to Go from Here',3)]
p=7; k=0
for pi,pt in enumerate(parts):
    toc.append((0,f'PART {pi+1}: {pt.upper()}',p)); p+=2
    for j in range(per[pi]):
        toc.append((0,f'CHAPTER {k+1}: {chs[k]}',p))
        if k==0: toc+= [(1,'Getting to Know the Program',p+1),(2,"Discovering the Program's origins and the strength of its community",p+2),(2,'Making open movies and games',p+3),(1,'Navigating in Three Dimensions',p+5),(2,'Orbiting,panning,andzoomingthe3DViewportwithoutanyspacesatall',p+6)]
        else: toc+= [(1,sent(3,6)[:-1],p+1+i*3) for i in range(3)]
        p+=random.randint(20,40); k+=1
toc.append((0,'INDEX',p))
for lvl,t,n in toc:
    if y<70: newpage(); y=H-80
    x=54+lvl*18; font='Times-Bold' if lvl==0 else 'Times-Roman'; c.setFont(font,10.5 if lvl==0 else 10); c.drawString(x,y,t)
    sx=x+c.stringWidth(t,font,10.5)+6; c.setFont('Times-Roman',10); c.drawString(sx,y,'. '*max(0,int((W-54-30-sx)/5))); c.setFont(font,10.5 if lvl==0 else 10); c.drawRightString(W-54,y,str(n)); y-=15
newpage(); bm('Introduction'); c.setFont('Helvetica-Bold',26); c.drawString(54,H-110,'Introduction')
flow([para() for _ in range(6)]+[('h','About This Book')]+[para() for _ in range(4)],('Blendworks For Learners','Introduction'),H-150)
k=0
for pi,pt in enumerate(parts):
    newpage(); bm(f'Part {pi+1}: {pt}'); c.setFont('Helvetica-Bold',40); c.drawString(54,H-160,str(pi+1)); c.setFont('Helvetica-Bold',24); c.drawString(54,H-200,pt); flow([sent() for _ in range(3)],None,H-260)
    for j in range(per[pi]):
        newpage(); t=chs[k]; bm(f'Chapter {k+1}: {t}'); c.setFont('Helvetica-Bold',14); c.drawString(54,H-150,f'Chapter {k+1}'); c.setFont('Helvetica-Bold',22); c.drawString(54,H-180,t)
        # a drop capital, printed apart from the rest of its word, as many printed books do
        first=para(); cap,rest=first[0],first[1:]; c.setFont('Times-Bold',30); c.drawString(54,H-238,cap)
        lines=wrap(rest,W-108-30); c.setFont('Times-Roman',10.5); c.drawString(84,H-222,lines[0]); c.drawString(84,H-236,lines[1]) if len(lines)>1 else None
        body=[' '.join(lines[2:])] if len(lines)>2 else []
        for s in range(4): body+=[('h',sent()[:40].rstrip('.'))]+[para() for _ in range(6)]
        flow(body,(f'PART {pi+1} {pt}',f'CHAPTER {k+1} {t}'),H-260); k+=1
newpage(); bm('Index'); c.setFont('Helvetica-Bold',26); c.drawString(54,H-110,'Index'); flow([', '.join(f'{random.choice(WORDS)} {random.randint(20,400)}' for _ in range(6)) for _ in range(30)],('Blendworks For Learners','Index'),H-150)
c.save(); print(out,'pages',pg[0])
