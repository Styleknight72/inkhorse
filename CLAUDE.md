# Inkhorse: read this first

Inkhorse is Steve Claude Patient's (StyleKnight's) free book-writing and reading app, live at https://getinkhorse.com.
Steve is not a coder. He tests on his iPhone 15 Pro Max and decides what goes live. Explain things in plain words.

## What Inkhorse is (agreed with Steve, November 10–11, 2026)
- **A tool people trust, not a toy.** "It's going to help a lot of people." Any book in, a good book out, automatically. The writer makes no formatting decisions, and the end result is a book someone would pay for.
- **The promise.** The three built-in books (User manual, Formatting Standard, Publishing Standard) are "a promise of what Inkhorse does". A new user starts there and must find no surprises: the app never does something the books don't say, and never fails to do what they say. "We don't say that word lightly here." Only what is proven is called part of the promise. Anything unproven is marked "not done" in plain words, never dressed up.
- **Two doors.** Your own book: Inkhorse tidies and formats everything and flags spelling, and the writer decides every change to their words. Someone else's book (added to read): read-only. Inkhorse changes how it is shown, never what it says, not even a typo. Every book has the same skeleton (cover, title page, copyright, contents, chapters each on a new page) and Inkhorse finds it in any file. Nothing goes missing on the way in; when unsure, leave the words alone.
- **Borrow the idea, never the code.** Follow the standards the best follow (Chicago Manual of Style, EPUB 3.3 and EPUBCheck, Amazon KDP). Study the best tools (Vellum: any manuscript in, a good book out) and build Inkhorse's own version. Where a common standard already exists, such as Markdown for marks in plain text, follow it instead of inventing one.
- **Truth first.** This way of working rests on the pillars of Steve's SK-67 Legacy Protocol: Love, Truth, Honesty, Clarity, Purpose, Memory, Responsibility, Faith. Mistakes, Steve's and the AI's, are said out loud, fixed and recorded in the Release Notes, never hidden.

## How we work
- **Stabilize before adding.** Nothing gets built that the standards don't already require, and nothing new starts while something existing is unproven. Target: ready by January 11, 2027 (plan in `NEXT-SESSION.md`). If the date and the standard ever collide, ask Steve; never lower the standard quietly.
- **Formatting holds** while reading and writing, days later, after an update, and at every text size. An update that moves where a reader's pages break is said to Steve plainly before it goes live.
- **The writer's words are never lost:** not on closing, not in two tabs, not on delete (Undo and a backup first), not when the device is full (say "NOT saved").
- **No hooks.** Don't end messages pushing the next thing to build or nudging Steve to stay. Say what's done, what isn't, and what's true. He will see the project through.

## The rules that never bend
1. **Formatting is the product.** Every book must meet `docs/FORMATTING-STANDARD.md` (rules F1–F10, "Vellum quality"). Any change that touches how books look names the rules it affects, and must not break any of them.
2. **The rules live in the code.** The formatting engine is the block marked "Inkhorse formatting engine" in `app.html` (CSS) plus `tokenize`, `render`, `paginate` (F3.7) and the importers (`epubToBook`, PDF). Don't move formatting decisions anywhere else.
3. **Every rule has a test.** A rule goes into a standard only with its passing test in the same change, and a failed test means fixing the app, never softening the rule. `node tests/audit.js <file>` must pass with 0 FAIL, 0 SKIP and 0 page errors before anything is pushed. It needs `jszip`, `pdfjs-dist@3.11.174` and `jspdf@2.5.1` on `NODE_PATH`, `PDFJS_DIR` set to pdfjs-dist's build folder, and `EPUBCHECK_JAR` set to EPUBCheck 5.1.0's jar (needs java); without them steps SKIP, and a SKIP is not a pass. New rule → new test step named with its F- or P-number. The step "The scorecard is honest" fails if a rule of the Formatting Standard is missing from its scorecard or listed as proven with no test naming it (the Publishing Standard's scorecard has no such check yet). The "Layout lock" step fails if a change moves a page break; re-record it (`LOCK_UPDATE=1`) only when a change is meant to move pages, and say so to Steve and in `CHANGELOG.md`. Also run the big-book speed step; a slow change does not ship.
4. **Preview first.** New work goes to `preview/next.html`. `app.html` (the live app) only changes after Steve says "approved" or "stable" about a preview. When the live app changes, also republish the claude.ai Inkhorse artifact (https://claude.ai/artifact/PPYFZbufW3KTZEfsUM4Zng) with the same file so both match.
5. **The manual matches the app.** Every visible change updates the built-in manual (the MANUAL book inside the html) in the same change. The manual explains how to use Inkhorse as it is now; it never carries history or "what's new" entries.
6. **History goes in the Release Notes.** Every revision gets a plain-words line in `CHANGELOG.md` (newest first, under its release; mark "preview" if it isn't live yet), and the e-book is rebuilt: `python3 -I tools/epub/build-epub.py CHANGELOG.md docs/release-notes-cover.jpg "docs/Inkhorse Release Notes.epub"`.
7. **Version numbers.** rev = the next number after the last rev in `CHANGELOG.md` (this copy of the repo is shallow, so `git rev-list --count HEAD` does not give it). Bump with `python3 tools/bump-version.py "<release>" <rev> <date> [preview/next.html]` (also repaints the manual cover; the 4th argument targets the preview, default app.html). A release (1.0, 1.1…) is only given when Steve says a rev is stable after `PHONE-CHECK.md`; record it in `RELEASES.md` and freeze a `release-X.Y` branch.
8. **Be honest.** Say what was tested, what wasn't, and how sure you are. Never claim a fix works on his iPhone without his screenshot.

## Search engines
- `index.html` carries the `google-site-verification` meta tag that keeps getinkhorse.com verified in Steve's Google Search Console (verified Nov 7, 2026). Never remove or change it.

## Where things are
- `NEXT-SESSION.md` where the last session stopped and the agreed plan: read it right after this file
- `app.html` live app · `preview/next.html` next version under test · `preview/app.html` Inkhorse Plus beta (set aside)
- `docs/FORMATTING-STANDARD.md` the standard; `docs/Inkhorse Formatting Standard.epub` built from it by `tools/epub/build-epub.py` (every e-book must pass EPUBCheck). It also ships inside the app as a built-in book: after changing it, rebuild the e-book and run `node tools/embed-standard.js preview/next.html`, and keep its Part 11 scorecard true
- `docs/PUBLISHING-STANDARD.md` The Inkhorse Publishing Standard (rules P1–P9, what "ready to publish" means); its e-book and built-in copy are made the same way as the Formatting Standard's. Its Part 10 store facts carry a "checked on" date: re-check them against the stores' own pages before changing that date. Keep its Part 11 scorecard true
- `CHANGELOG.md` the Release Notes (history of every rev and release); `docs/Inkhorse Release Notes.epub` built from it
- `tools/epub/doc-cover.html` + `render-cover.js` draw 2:3 covers for these e-books
- `tests/audit.js` automatic checks · `PHONE-CHECK.md` Steve's iPhone checklist · `RELEASES.md` stable releases
- `brand/` Steve's original StyleKnight logo files and the full-size sign (see `brand/README.md`); keep them, never overwrite
