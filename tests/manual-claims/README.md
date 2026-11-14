# User manual claim checks (rev 240, rev 246)

One check for each thing the User manual says Inkhorse does. p1 to p6 (rev 240) cover the first two chapters ("The big picture" and "Your book, covers and chapters"); p7 to p10 (rev 246) cover the rest: p7 and p8 "Reading your book" (turning pages, the Read tools, the page counter, the Book Hub, fixing on the page, full screen, Aa), p9 its listening part (the player, Meilin, Boost, credits), and p10 "Books, drafts and the safety net", "Compare", "Put Inkhorse on your home screen" and "Quick fixes". They run against a local copy of the app:

    python3 -m http.server 8765 --bind 127.0.0.1    # from the repository folder
    NODE_PATH=... PDFJS_DIR=... node tests/manual-claims/p1.js   # p1 … p6

Each line prints OK or FAULT with the claim it checks. A FAULT means fixing the app, never the manual's sentence (unless the check itself is wrong, which must be said in CHANGELOG.md). p2b checks Focus (BP-47b, BP-47c); p2's own two wrong versions were taken out in rev 246. These are a lab, not yet part of `tests/audit.js`; moving them in is open work.

What p7 to p10 do not prove from here, and why: the natural voices playing (a 92 MB download; tests/audit.js has steps that play them), so the numbers the manual gives about Meilin (download size, saved-sentence space, cores, waits) are read from the code; the iPhone's own Add to Home Screen screens; sound on a real phone. Claims in "How Inkhorse sets every book" and "Contents pages in any book" are Formatting Standard rules, proven by the F-named steps in tests/audit.js. The test browser has no sound, so p9 keeps the device voice "talking" (otherwise a chapter would finish at once and the player would close).
