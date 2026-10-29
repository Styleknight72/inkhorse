# Inkhorse: read this first

Inkhorse is Steve Claude Patient's (StyleKnight's) free book-writing and reading app, live at https://getinkhorse.com.
Steve is not a coder. He tests on his iPhone 15 Pro Max and decides what goes live. Explain things in plain words.

## The rules that never bend
1. **Formatting is the product.** Every book must meet `docs/FORMATTING-STANDARD.md` (rules F1–F10, "Vellum quality"). Any change that touches how books look names the rules it affects, and must not break any of them.
2. **The rules live in the code.** The formatting engine is the block marked "Inkhorse formatting engine" in `app.html` (CSS) plus `tokenize`, `render`, `paginate` (F3.7) and the importers (`epubToBook`, PDF). Don't move formatting decisions anywhere else.
3. **Every rule has a test.** `node tests/audit.js <file>` must pass with 0 FAIL and 0 page errors before anything is pushed. New rule → new test step named with its F-number. Also run the big-book speed step; a slow change does not ship.
4. **Preview first.** New work goes to `preview/next.html`. `app.html` (the live app) only changes after Steve says "approved" or "stable" about a preview. When the live app changes, also republish the claude.ai Inkhorse artifact (https://claude.ai/artifact/PPYFZbufW3KTZEfsUM4Zng) with the same file so both match.
5. **The manual matches the app.** Every visible change updates the built-in manual (the MANUAL book inside the html) in the same change. The manual explains how to use Inkhorse as it is now; it never carries history or "what's new" entries.
6. **History goes in the Release Notes.** Every revision gets a plain-words line in `CHANGELOG.md` (newest first, under its release; mark "preview" if it isn't live yet), and the e-book is rebuilt: `python3 -I tools/epub/build-epub.py CHANGELOG.md docs/release-notes-cover.jpg "docs/Inkhorse Release Notes.epub"`.
7. **Version numbers.** rev = number of commits (`git rev-list --count HEAD`). Bump with `python3 tools/bump-version.py "<release>" <rev> <date>` (also repaints the manual cover). A release (1.0, 1.1…) is only given when Steve says a rev is stable after `PHONE-CHECK.md`; record it in `RELEASES.md` and freeze a `release-X.Y` branch.
8. **Be honest.** Say what was tested, what wasn't, and how sure you are. Never claim a fix works on his iPhone without his screenshot.

## Where things are
- `app.html` live app · `preview/next.html` next version under test · `preview/app.html` Inkhorse Plus beta (set aside)
- `docs/FORMATTING-STANDARD.md` the standard; `docs/Inkhorse Formatting Standard.epub` built from it by `tools/epub/build-epub.py` (every e-book must pass EPUBCheck)
- `CHANGELOG.md` the Release Notes (history of every rev and release); `docs/Inkhorse Release Notes.epub` built from it
- `tools/epub/doc-cover.html` + `render-cover.js` draw 2:3 covers for these e-books
- `tests/audit.js` automatic checks · `PHONE-CHECK.md` Steve's iPhone checklist · `RELEASES.md` stable releases
