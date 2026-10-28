# Manual check: does the manual match this revision?

Run before a revision can become a release. The manual is the app's test book: every sentence is a claim to verify.

## A. Automatic (Claude, every revision)
- Every button id, label and setting the manual names exists in app.html with that label.
- Every `@@find` line points at a real section; the Contents page resolves every entry to a page.
- The What's new section's top entry is this revision.
- The manual's `ver` string changed, so phones fetch the new copy, and the cover names this release and rev (tools/bump-version.py does all three).

## B. Pictures (Claude, whenever a screen changes; Steve supplies phone shots for panels)
- Each picture shows the control as it looks in this revision (same label, same position in the row).
- Nothing in a picture that the live app doesn't have (e.g. the Spelling button).

## C. Walk-through (Steve, on the iPhone, once per candidate)
Read the manual in Inkhorse from the Contents onward and do each thing as it's described:
- Writing: top row, page bar, every Write tool, Hoofprint steps 1–4, pictures, headings.
- Your book: chapters, front pages, covers, every export, both backups, restore.
- Reading: page turns, Read tools, Aa (all themes, night, warmth), the player, Jump to, contents taps.
- Library: your books, drafts and Add to book, added books, Recently deleted, the manual itself.
- Compare, Install, Quick fixes.
Anything that doesn't match: screenshot + what you expected. Each fix is a new revision, and B and A run again.

A revision passes when C finds nothing, or everything C found has been fixed and re-checked.
