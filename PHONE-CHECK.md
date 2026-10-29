# Phone check before calling a revision stable

The automated test (`node tests/audit.js app.html`) covers 28 steps in a phone-size browser.
These are the things only a real phone can prove. About 10 minutes on the iPhone.

1. Open Inkhorse from the Home Screen icon. Tap the save dot: it shows the new rev number.
2. Dictate a paragraph with the keyboard mic, including a family name. Hoofprint offers the right spelling.
3. Read tab: turn pages by swiping and by tapping the edges. The page curl looks right.
4. Read aloud: hear at least a page with your chosen voice. Pause, rewind, skip and Mark all respond.
5. Aa → Colors: switch to StyleKnight and Sky and back. Everything stays readable.
6. Chapters → Save backup file: the file saves to Files. Restore from file opens it and shows the right chapter count (tap Cancel).
7. Chapters → EPUB: the file saves, and opens in Apple Books.
8. Airplane mode on, close and reopen Inkhorse: it still opens, and your writing is there. Airplane mode off.
9. Turn the phone sideways in Read: full screen, nothing cut off.
10. Write a few sentences in your real book for a day or two. Nothing lost, nothing strange.

All 10 fine → tell Claude "rev N is stable", and it becomes the next release in RELEASES.md.

- [ ] **Covers (rev 83–85):** Library → every book cover is the same size and book-shaped (2:3), the whole cover shows (nothing cut off at the top or bottom), and the manual's cover fills its box like the other books.
- [ ] **Contents pages (rev 88):** open the contents page of the manual, an EPUB, a Word book and a text PDF: every one shows one entry per line with a dotted line to a page number; tapping a title opens that page.
- [ ] **Book formatting (formatting engine):** open MANtality, Blender and the manual. Each chapter's title sits about a third down its first page with the first line in small capitals; front pages (title, copyright) have no chapter number; * * * scene breaks are centered; no page starts or ends with one stray line of a paragraph.
