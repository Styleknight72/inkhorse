# Next session: start here

Written November 4, 2026, at the end of a session. Read CLAUDE.md first; this file says where things stand and what comes next.

## Where things stand

- **Live** (getinkhorse.com/app.html), the **preview** (preview/next.html) and the pinned claude.ai Inkhorse artifact are the **same file: rev 178**, "1.1 candidate" (went live Nov 4 night on Steve's "push it live"). Release 1.1 has not been called yet: Steve has not said a rev is stable.
- `node tests/audit.js app.html` passes **74 of 74**, none skipped (needs `jszip` and `pdfjs-dist@3.11.174` on NODE_PATH, and `PDFJS_DIR` set to its `build` folder, or the import steps skip).
- Revs 160–174 (Nov 1–4) came from Steve testing on his iPhone. See CHANGELOG.md for each one.

## Things learned this week (don't relearn them)

- **The check runner used to pass any step that returned a message.** Since rev 163 a returned string fails unless it starts with `SKIP` or `OK`. New steps must `throw` on failure.
- **Real iPhone behaviour the test browser does not show:** Safari and the Home Screen app keep separate storage; focusing a textarea outside a tap leaves it "focused" with no keyboard; a thumb double-tap lands off center; the page area's `touch-action:none` and pointer capture block scrolling inside anything placed in it.
- **Steve's memoir** ("What If It's Already Here?") is writable in **Safari**; in his Home Screen app it is only an added-to-read copy.
- **Steve's rules:** Inkhorse never goes backwards (make the app live up to its claims, don't shrink the claims); never mislead users; the manual matches the app; history goes only in CHANGELOG.md.

## New in revs 175–178 (live)

- Paper texture on pages (Aa → Paper texture), a real recorded page-turn sound (Aa → Page sound; silent when read-aloud turns the page; CC0 "Turned Page" by DavidGreck, BigSoundBank), full-screen tap messages 4 s longer, a small link that brings back the Safari/Home Screen note after Got it, and drafts numbered "Draft N of M".
- Steve thought "Draft · Nov 3" meant draft number 3. Still unknown: whether his drafts 1 and 2 are in the Home Screen app (separate storage). Ask him what he found.
- Not yet heard on his iPhone: the page sound's loudness on the Home Screen app, and the texture strength in every theme.

## Open question for Steve

Should double-tap also play/pause outside full screen? (Recommended: no. The normal view has a visible ▶, and side taps there stay instant.)

## The plan (agreed with Steve, in this order)

1. **Phone-test rev 174** (PHONE-CHECK.md). When Steve calls it stable it becomes **Release 1.1**: record it in RELEASES.md and freeze a `release-1.1` branch.
2. **Strengthen the checks**, above all saving, backups, export and page turns. Every bug fixed gets its own check.
3. **Split app.html into files** (formatting engine, writing + Hoofprint, reading + page turns, voices, import/export, manual) with a small build step that still produces one app.html, so the website, offline mode and the pinned artifact keep working. No behaviour change; every check must still pass. Preview first.
4. **The big bug check**, when Steve's subscription renews: Opus 5.5 as main checker and fixer, plus Fable 5.1 for an independent second read. Give each checker one part of the app. Try every claim in the manual and on the website.
5. **A "Send a bug report" button** that writes up what happened and opens an email the person sends themselves. No automatic crash reporting: nothing leaves the device unless the person sends it.
