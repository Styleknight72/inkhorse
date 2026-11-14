# Independent review: tests/manual-claims (p1–p10, p2b) against the User manual in preview/next.html

Reviewed 2026-11-13. Read-only review; nothing in the repository was changed.

## Summary

- Check ids reviewed: **261** (every id a script prints as OK, FAULT or NOTE; the page-error catch-alls BP-23x, BP-50x, YB-19x, HP-x and "x" are not counted).
- **STRONG: 200**
- **WEAK: 61** (would pass, or can pass, with the feature broken)
- **MISSING: 30** manual sentences/promises with no check here and no audit step that covers them.

Problems with the harness itself (these affect several ids):

1. **NOTE never fails.** The audit step "User manual: every claim it makes holds" counts only FAULT and ERROR lines. BP-18c, BP-39c and all four YB-20 lines print NOTE in every outcome, so they prove nothing. YB-20 is the only check of the chapter-opening styles in print and EPUB.
2. **Page errors are mostly ignored.** `mk()` collects `pg.errs`, but only 6 blocks look at them (p1 BP-23, p2 BP-50, p3, p4 YB-19, p5, p6). No block in p7, p8, p9, p10 or p2b checks them. A JavaScript error thrown by a button handler during those checks is not reported unless a later assertion happens to catch its effects.
3. **The README is out of date.** It says the checks are "a lab, not yet part of tests/audit.js", but audit.js line 2626 now runs them.
4. **Dead code in p2b.** p2b ends with a Read→Write measurement that is printed with console.log and never asserted (BP-57 in p2 covers that claim).
5. **Some numbers are compared with themselves.** Several page-number checks build their expected value from the app's own `countAllNow()`/`bookPageInfo()` or `GMARKS`, which are the same source the counter is drawn from (RB-13a, RB-15b/c/i).

## WEAK

Each item gives the id, why it is weak, and what a stronger check should do.

### p1
- **BP-12c** (dot is gray when saved on this device only). It passes if *any* of three colours is gray, and one of them is the `.status` text colour, which is always `var(--muted)` gray. The dot itself could turn green and the check would still pass. **Stronger:** read only `#status i` background, compare it with `--muted`, and confirm it is not `--ok` or `--accent`.
- **BP-16a** (a front page shows its name). It accepts any non-empty label without "Ch N". **Stronger:** for a `%%front` copyright page, expect the label to equal `chListName(id)`, i.e. "Copyright page".
- **BP-16b** (the panel holds the title, front pages, covers, list, export and backups). It only checks that the elements exist inside `#drawer` in the static HTML, not that they are visible. **Stronger:** check that each part has a non-zero box and is not `display:none` after the drawer opens.
- **BP-18c** (Spelling only inside Claude). Prints NOTE, so it can never fail. BP-60a covers the claim; drop BP-18c or make it FAULT.
- **BP-23b** (type a page number to jump there). The test sets `#pgNum.value=3`, then reads the same input back. If `goWritePage` did nothing, the value can still be 3. `o.idx3` is computed and never asserted. **Stronger:** assert `writePageIndex().i===2`, check the caret sits at the first word of page 3 (`pag(S.cur).pages[2][0]`), and check that the textarea scrolled.
- **BP-27b** (Top on an empty chapter does nothing). The `try/catch` around `.click()` can never catch anything, because errors in a listener go to `window.onerror`, not to the caller. So `emptyTop` is always true. "Nothing happens" is not measured either. **Stronger:** check `pg.errs` is empty, and that `S.cur`, the caret and the scroll position are unchanged.
- **BP-30b** (Undo takes back a dictated run). It only checks that "walked home" is gone, so an Undo that also wiped earlier text would pass. **Stronger:** require `und2` to equal exactly the text from just before dictation.
- **BP-32** (Find: ‹ › step through each match). Only the counter text is checked. **Stronger:** after each ‹/›, assert `ta.selectionStart` equals the k-th index of "cat" and that the selection length is 3. Add "cat" to a second chapter and confirm the count stays 3 ("for this chapter").

### p2
- **BP-39b** ("they land where the cursor is"). The cursor is always at the end of the text, so plain appending would pass. BP-41c and HP-92 do the same. **Stronger:** put the caret mid-paragraph, dictate, and assert the words are inserted at that offset with the text after it intact.
- **BP-39c** (live words box). NOTE only, so it can never fail. The audit step "Dictate: the live words sit at the bottom of the writing area" covers the claim; this id adds nothing.
- **BP-43a** (Word count shows *or hides*). The off state is made by setting `S.showWC=false` directly; only turning it on goes through the button. **Stronger:** tap `#wcBtn` twice and assert the count shows, then hides, from user taps alone.
- **BP-73** (the six placements). "Top of page" is accepted if the image is above the text on whatever page it is found on, but "starts a new page" is not checked. "Full bleed" checks left and right edges only. **Stronger:** for `top`, assert the picture's page index is greater than the page of the paragraph before it, and that that page ends with that paragraph. For `bleed`, also check top and bottom are at 0.

### p2b
- **BP-47b** (word count appears at the top *when you pause*). `during` (the HUD while typing) is measured but never asserted. A HUD that shows all the time would pass. **Stronger:** require `during.show===false` and `r.show===true`, and check the text equals the chapter's word count.

### p3
- **HP-85** (your words are used in every book on this device). It reads back `S.hp.words`, the list the test itself filled through the panel, and never checks that the *other book* uses the word. **Stronger:** in the second book, assert `hpVocab()` contains "Rimmon Club", and dictate "rim and club"/"rimmon club" so the word is offered.
- **HP-88a** (add a fix yourself: It hears / You mean / Add). It only checks the fix is listed, not that it works. **Stronger:** after adding "rim and club → Rimmon Club", dictate "rim and club" and assert it becomes "Rimmon Club".

### p4
- **YB-02** (All books opens the Library). The OK condition is `tab==='read' && drawer hidden`. The `lib` flag is computed and never used, and it falls back to a loose `/Library/` text search. **Stronger:** assert `!document.querySelector('#library').hidden` and that the shelf shows.
- **YB-20** (Classic / Ornament / Big number / Drop cap, the same in Read, print PDF and EPUB, gold diamond in print). All four lines are NOTE, so they cannot fail. The audit step F2.3 covers the screen only. **Stronger:** for each style, assert the Read face (`.ck`/`.bn`/flourish/`::first-letter` float), the EPUB chapter class/markup, and the PDF (label text, big number of 24pt or more, a gold fill and a diamond path for Ornament, the two rules and a drop cap two lines tall for Drop cap) all agree.
- **YB-23b** (subtitle is a line *under* the title). `A||B`: the second alternative passes whenever the subtitle appears anywhere on page 1, including above the title. **Stronger:** compare PDF y-positions so the subtitle sits below the title, and check the order in EPUB `title.xhtml`.
- **YB-29c** (a cover of another shape shows whole with a blur; every small cover is 2:3). Blur and `contain` are asserted, but the measured `ratio` is only printed. **Stronger:** assert ratio ≈ 0.667 for the Chapters-panel thumb and the Book Hub cover tiles (audit F1.2 covers Library tiles only).
- **YB-36** (Print size offers four sizes). `…==='6×9in|5.5×8.5in|5×8in|8.5×11in' || sizes.length===4`, so any four options pass. **Stronger:** drop the `||` and require the exact list. Audit F9.1 proves the output sizes.
- **YB-38** (Word manuscript in standard submission format). Each fact is a substring found *anywhere* in styles.xml or document.xml: `w:sz w:val="24"`, `w:line="480"`, `pageBreakBefore`, `Times New Roman`, and a "N words" regex that body text could match. None of it is rendered. CLAUDE.md says a check of file instructions is not enough. **Stronger:** check the *Normal* style's rFonts/sz/spacing and the *Heading1* style's pageBreakBefore by style id, and the sectPr margins. Then convert with `soffice --headless --convert-to pdf` and check from the pages that every chapter starts on a new page, page 1 has no header, later pages show "Tester / THE HARBOR BOOK / n", and the text is 12-point TNR double-spaced (line pitch ≈ 24pt).
- **YB-49b** (Cancel leaves things as they are). The file being restored is the same book that is open, so a restore would change nothing and the check would still pass. It only checks `#fbkGo` disappeared. **Stronger:** save the file, then change the book (title + a chapter), load the file, tap Cancel, and assert the changes are still there and no daily backup was added.
- **YB-50c** (reminder once a day when you open it, once the book has writing). It calls `fbkNudge()` directly twice. The real path (load, `setTimeout(fbkNudge,6000)`) is skipped, and the "has writing" condition is not tested. **Stronger:** set an 8-day-old `fileBk`, reload, wait more than 6 s, and expect the toast. Reload again the same day and expect no toast. With an empty book, expect no toast.
- **YB-51** (daily backups keep the last 14). It writes 20 entries straight into IndexedDB and calls `bkPrune()`. That proves the pruning function, not that "the first time you open Inkhorse each day it saves a copy" (see MISSING 12). **Stronger:** with a backup index dated yesterday, reload and assert a new `daily` entry for today exists. Reload again and assert no second one.

### p6
- **BP-60e** ("leaves names, slang, grammar and style alone"). It only checks the prompt sent to Claude contains "names of people", which is a constant string, not behaviour. The stand-in even returns a name ("Ellery"), which is dropped only because it is not in the text. Say so in the message, or add a case where the stand-in returns a capitalised word that *is* in the text, and decide and test what Inkhorse does with it.

### p7
- **RB-02b** (a cover is the same size as a page). `#stage .page,#stage .face,#stage` takes the *first* `.face`, which may be a `.gone` face, and all faces are built from the same `d.w/d.h`. **Stronger:** use `.face:not(.gone)` on both sides.
- **RB-02c** (the whole cover is shown, nothing cut off). It takes the first `#stage img`, which may be the background fill, and tests containment in `#stage`, which is bigger than the face. **Stronger:** take the foreground cover image and require it inside the visible face's rect. Also check the edge-colour fill (MISSING 14).
- **RB-07a / RB-07b** (Auto / One page / Two-page spread). They read the internal variable `two`, not what is drawn. **Stronger:** count `#spread .face:not(.gone)` with a non-zero box.
- **RB-13a** (one page number counted from the start of the book). The expected value is `countAllNow().off[id]+2`. `countAllNow()` returns `bookPageInfo()`, the same source `#pgCur` is drawn from (next.html 2051/2076), so the app is compared with itself. **Stronger:** expected = `nPages(BOOK.order[0]) + 2` (plus one if a front cover counts), worked out by the test.
- **RB-13e** (third line: pages left and words on this page). Regex format only, with `||/^Last page of chapter/`, which would accept "Last page" on page 2 of 8. **Stronger:** assert pages-left equals `nPages(id)-2` and the word count equals the words on the visible face.
- **RB-13f** (two thin lines fill as you read). It only checks both widths end in "%". **Stronger:** read the widths at two positions, assert both grow, and that they equal the chapter and book fractions.
- **RB-15b / RB-15c** (highlights listed with page numbers; tap one to go straight to it). The page numbers are compared with `GMARKS[k].page`, the app's own computation, and the jump is compared with the same value. **Stronger:** after tapping, assert the visible face contains the highlighted span (`mark`/`.hl` with the highlighted words).
- **RB-15i** (the chapter list shows the pages each chapter runs). The expected ranges come from `countAllNow().off`, which is self-referential. **Stronger:** work the ranges out from `nPages` of each chapter in order.
- **RB-15l** (slider shows book page + chapter; on a cover, pages and words of the whole book). It uses loose regexes (`/\d/`, `/pages/`, `/words/`). **Stronger:** assert the shown page equals the slider position's page number, and that the cover line's totals equal the counter's "of N" and the whole-book word count.

### p8
- **RB-20d** (while fixing, taps around the page don't turn it). It sends synthetic pointer events to `#stage` with no control case, so a synthetic tap that never turns the page would pass. **Stronger:** use the same CDP touch tap used in RB-20a at the right edge: first with the fix box closed (it must turn), then open (it must not).
- **RB-20e** (your fix is saved as you type). It reads the in-memory `CH` text. **Stronger:** type in `#fixText`, reload *without* tapping Done, and assert the chapter text contains the fix.
- **RB-22** (the voice pauses while you fix). The test sets `TTS.on=true; TTS.playing=true` itself instead of starting real playback, and passes on `paused>0 || playing===false`. **Stronger:** start reading with Play (stub `speechSynthesis` so it keeps "speaking"), press and hold a word with CDP touch, and assert `TTS.playing===false` and the status line says Paused.
- **RB-23a** (Full screen hides the controls). It asserts only the `immersive` class and the corner button. The list of visible controls (`tabs`) is computed and never asserted. **Stronger:** require nav tabs, the Read toolbar and the bar under the book to be invisible.

### p9
- **RB-43** (Follow words: on, the words light up; off, no highlight). It checks only the button label toggling. **Stronger:** while reading, assert a highlighted current-word element exists on the face with On and none with Off.
- **RB-44** (earbuds once/twice/three times; lock screen). It regex-searches the source for `set('play'…)` etc. **Stronger:** in an init script, capture `navigator.mediaSession.setActionHandler` callbacks. Invoke `nexttrack` and assert the sentence index +1, `previoustrack` −1, `pause`/`play` toggle `TTS.playing`, and check `metadata.title` names the chapter.
- **RB-46** (the headphones button closes the player). `off.bar` is computed and never asserted. **Stronger:** also require `#ttsBar` hidden.
- **RB-58a–f** (92 MB, 300 MB cap, ~3 MB/min, up to four cores, 30-second box, 30 minutes ahead). These are code-constant regexes. The file header says so, but they are not proof of behaviour. Two are worse than constant checks:
  - RB-58b also requires a *comment* string.
  - RB-58c passes on the bare word `sampling_rate`, while its message claims "24,000 a second ≈ 2.9 MB a minute". The number 24000 does not appear anywhere in next.html.

  **Stronger:** for RB-58b/c, feed `kokBank` fake WAV clips, measure stored bytes per second of audio, push past 300 MB, and assert the oldest are evicted. For RB-58e, stub the worker so a sentence takes more than 30 s (fake clock) and assert the box with Keep waiting and Use my device's voice. For RB-58d, stub `crossOriginIsolated`/`hardwareConcurrency` and assert `kokCores()` returns 4/2/1.
- **RB-60** ("only the words of a contents entry open its page"). It tests the *manual text* for the absence of two old phrasings, not the app, and any other wrong wording passes. The app behaviour is covered by audit step F6.6; reword the check's claim or remove it.

### p10
- **BD-09** (… and Back goes one question back). It only checks that the word "Back" is on screen. **Stronger:** tap Back on question 2 and assert question 1 ("Which book?") shows again.
- **BD-10c** (the book opens at that spot). It asserts only that `SLOT` is the home book; `anchor` and `tab` are captured and ignored. **Stronger:** assert the current chapter is "First Light" and the caret/anchor is at the inserted paragraph (line 1).
- **BD-27b** (Delete forever erases the book *and its backups*). It counts `localStorage` keys with the slot id, but backups live in IndexedDB (`idb.set(bkP()+key…)`). **Stronger:** list IndexedDB keys with that slot's backup prefix and picture keys before and after, and require none left.
- **CP-01a** (words per page for each device, at your current type settings, drawn to the same scale). It only checks the device names and the word "words". **Stronger:** read a number per row, assert Phone < Large phone < Tablet, change Aa size and assert the numbers change, and check the drawn page boxes are in proportion to the device sizes.
- **CP-01b** (whole-book page estimate on phone, tablet, 6×9). It checks only `/Whole book/` and `/pages/`. **Stronger:** assert three numeric page counts with phone > tablet, roughly equal to the sum of `nPages` at that device.
- **HS-01a / HS-01b** (installs like an app, horse icon, no browser bars). These are static checks of manifest and `app.html`. Note they read the *live* app.html, not the preview under test, so a preview that dropped the meta tags would pass. The `/horse|icon/` test on the icon list matches any icon. **Stronger:** read the tags from the page under test (MURL) and check the manifest icon file is the horse image (hash or path).
- **HS-01c** (horse and motto for about four seconds). It is a constant regex (`HOLD=4000`). Audit step "Opening screen" covers showing/skipping, but not the duration or "when you come back to it". **Stronger:** emulate standalone display mode, load, assert the splash is visible at 3.5 s and gone by about 4.5 s, then fire `visibilitychange` to hidden and back and assert it shows again.
- **HS-13** (opens with no signal). It only checks that sw.js mentions app.html, `caches` and `fetch`. **Stronger:** load with the service worker, wait for it to activate, `context.setOffline(true)`, reload, and assert the app renders and the book opens.
- **HS-16** (asks your phone to keep its saved data). It searches the HTML for `navigator.storage.persist`, but that string also appears in `kokSaved()` (the voice cache), so deleting the start-up call (next.html line 6110) would still pass. **Stronger:** stub `navigator.storage.persist` in an init script and assert it is called during load with no voice chosen.
- **QF-03** (Tools at the top right of Write). Only the horizontal position is asserted; `top` is computed and ignored. **Stronger:** also assert it is in the top row (top within the first ~80 px of `#write`).

Not a manual claim: **BD-10d** checks that a draft disappears from Drafts once added to a book. The manual does not say this. Either add the sentence to the manual or take the check out, so the checks stay a test of what the manual promises.

## MISSING

These are checkable promises with no check in p1–p10 and no audit step found for them (audit.js was searched for the key words in each case).

1. **Welcome:** "You can see both [release and revision] at the bottom of the Chapters panel, or by tapping the save dot." BP-12d checks only the first words of the dot's message. The audit step "version line is present" checks `INK_VERSION` exists, not where it is shown.
2. **Welcome:** "the release and revision [printed on the manual's cover] match the app it came with." Nothing compares the cover with `INK_VERSION`.
3. **The Write tools, computer tip:** Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+F, Enter / Shift+Enter in Find, Page Up / Page Down, Esc closing Find, the Book Hub, the Library and the Chapters panel and leaving Focus, and F11 hiding Inkhorse's controls. Audit step "Computer keys" covers only F, Esc for Aa and full screen, Home/End, and keys while typing; Space is covered.
4. **Dictate:** "they land where the cursor is" (cursor mid-text); "stops when you tap Dictate again" (every test calls `micStop()`); spoken "new line", "question mark", "exclamation point" (only "period", "comma" and "new paragraph" are tested).
5. **Find:** "Opens a search box for this chapter." Nothing confirms other chapters are left out of the count.
6. **Spelling:** "or just the words you selected" and "Fix all".
7. **Chapter list Delete:** "tap it twice to be sure" and "an Undo button for ten seconds". The audit step uses `dropChapter()` directly, so the button and the 10-second window are never exercised.
8. **Chapter opening:** "the same in Read, the print PDF and the EPUB … (in the print PDF the flourish is a small gold diamond) … Drop cap: the title between two thin lines, first letter two lines tall." This covers print and EPUB for all four styles; YB-20 is NOTE-only.
9. **Covers:** "Every small cover picture in Inkhorse (Library, Book Hub, Book settings) is the same 2:3 size." Only the Library is asserted (audit F1.2).
10. **Restore from file:** "Your current book is saved as a daily backup first." The audit P9.1 restore runs on a fresh phone with no book to save.
11. **Last backup file:** the reminder comes "once your book has some writing in it … when you open it". No empty-book case and no real-open case (see YB-50c).
12. **Daily backups:** "The first time you open Inkhorse each day, it saves a copy of the whole book."
13. **Save backup file:** "Older backups ending in .json restore the same way."
14. **Turning pages:** "if its shape differs from the page, the space … is filled by continuing the colors along the picture's own edges." Only "whole, not cut off" is checked.
15. **Highlighter:** "Works in every book, including books you've added to read and this manual. In books you've added to read, highlights are kept beside the book on this device, so the book's own text never changes."
16. **Fix it right on the page:** "Pictures … on the page stay as they are." RB-21a covers headings and scene breaks only.
17. **New page for each section:** "Exported books always let sections carry on." Nothing exports with the box checked.
18. **Colors:** "Match my device follows your phone's or computer's own light or dark setting." Not tested with `prefers-color-scheme` emulation.
19. **W, H, Margin:** "Set width, height and margins in pixels (96 = 1 inch)." RB-06c only checks the boxes appear, not that the page takes those sizes.
20. **Again (↺):** "Play the sentence you just heard one more time." Nothing checks the sentence index stays the same and the sentence plays again (the audit covers only the natural-voice remake).
21. **Speed / Try:** Speed changing the reading rate, and Try playing a sample. Only the option list is checked.
22. **Meilin, runtime:** remembered as your voice after download; got ready on open; page reloads once to use cores; "Reload now" and falling back to one core; page closed twice while starting; "Getting ready" counting seconds; notes above the player that close on tap. Only constants are read (RB-58).
23. **Smooth listening:** "Settings shows how much is ready, for example Ready ahead now: 6 min."
24. **Boost:** "If the server can't be reached, Inkhorse quietly makes the sentence on your device"; "Test key (plays a short hello and shows how fast it was)"; sentences made online are saved and replay offline.
25. **Add a book (PDF):** "a PDF longer than 300 pages always comes in as text."
26. **Add a book:** "Kindle and Apple Books purchases are copy-protected and can't be opened." Nothing checks that an EPUB with `META-INF/encryption.xml` is refused with a message.
27. **Drafts:** "Back goes one question back." It is never tapped.
28. **No signal / Old version:** "After that it opens and works with no signal … When you're back online it picks up the newest version on its own"; "Inkhorse checks for the newest copy every time it opens." There is no offline or update test (HS-13 is source-grep only).
29. **Hoofprint:** "Words found in your book come with the book wherever it goes." Nothing checks a backup file or export carries them.
30. **Book Hub:** "Go to page: type a page number and tap Go (or Return)." Only Return is tested (RB-15h, audit "Jump to: typing a page number goes there"); the Go button is never tapped.

Covered by audit and therefore not listed as missing: italics, lists and quotations (F4.6, F5.5); curly quotes and dashes (F4.x); Justify (F3.5, F3.10); page sound, paper texture, Show tips, Page turn; Next mark wrap and title marks; Clear all; full-screen taps, notes and double-tap; the iPad Safari bars; fixing with the phone keyboard and with a computer click; two tabs; storage full; Save to Files share sheet; drafts numbering and drafts file; Library delete of an added book; print PDF layout (F7, F9); EPUB (F8, EPUBCheck); importers (F10, "comes in whole by both doors"); contents pages (F6); front pages (F1); counting pages (F7.4, F7.5).

## STRONG ids

BP-00c, BP-01a, BP-01b, BP-02, BP-04a, BP-04b, BP-04c, BP-12a, BP-12b, BP-12d, BP-18a, BP-18b, BP-18d, BP-18e, BP-23a, BP-23c, BP-25, BP-27a, BP-54a, BP-54b, BP-30a, BP-35a, BP-35b, BP-35c, BP-35d, BP-35e, BP-39a, BP-41a, BP-41b, BP-41c, BP-43b, BP-45a, BP-45b, BP-47a, BP-47c, BP-72, BP-74, BP-50a, BP-75, BP-52, BP-56, BP-57, BP-62, BP-64, BP-11b, BP-12t, BP-94a, BP-94b, BP-94c, BP-60a, BP-60b, BP-60c, BP-60d, HP-80a, HP-80b, HP-82a, HP-82b, HP-82c, HP-82d, HP-83a, HP-83b, HP-83c, HP-83d, HP-83e, HP-83f, HP-84a, HP-84b, HP-88b, HP-90, HP-91, HP-92, YB-04, YB-07a, YB-07b, YB-07c, YB-15, YB-19, YB-22, YB-23a, YB-23c, YB-23d, YB-25a, YB-25b, YB-26a, YB-26b, YB-26c, YB-26d, YB-26e, YB-26f, YB-26g, YB-29a, YB-29b, YB-29d, YB-29e, YB-34, YB-38b, YB-38c, YB-38d, YB-40, YB-42, YB-49a, YB-50a, YB-50b, RB-01a, RB-01b, RB-12, RB-02a, RB-05, RB-06a, RB-06b, RB-06c, RB-08, RB-09, RB-10a, RB-10b, RB-11, RB-13b, RB-13c, RB-13d, RB-13g, RB-13h, RB-13i, RB-13j, RB-15a, RB-15d, RB-15e, RB-15f, RB-15g, RB-15h, RB-15j, RB-15k, RB-20a, RB-20b, RB-20c, RB-20f, RB-20g, RB-20h, RB-21a, RB-21b, RB-21c, RB-23b, RB-23c, RB-30a, RB-30b, RB-30c, RB-30d, RB-31a, RB-31b, RB-32a, RB-32b, RB-32c, RB-32d, RB-32e, RB-32f, RB-40a, RB-40b, RB-40c, RB-40d, RB-41a, RB-41b, RB-42, RB-45, RB-50a, RB-50b, RB-50c, RB-51a, RB-51b, RB-52a, RB-52b, RB-52c, RB-55a, RB-55b, RB-55c, RB-55d, RB-55e, RB-55f, RB-57, RB-25, BD-01, BD-01b, BD-02, BD-03a, BD-03b, BD-03c, BD-06, BD-07a, BD-07b, BD-07c, BD-08, BD-10a, BD-10b, BD-10d, BD-13a, BD-13b, BD-27a, CP-01c, CP-01d, QF-01, QF-04, QF-06

These are strong but set state directly for a step the user would do: BP-35b and HP-82c (marks or words added by calling functions); YB-07c (`dropChapter()` instead of the Delete button); YB-50b (sets an old backup date, which is reasonable for a one-week rule); RB-51a and RB-55c (set `S.ttsVoice` instead of using the select). They prove the behaviour they claim, but not the user's own path to it.
