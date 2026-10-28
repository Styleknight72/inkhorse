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
