# Inkhorse releases

Two numbers. **rev** goes up with every change pushed to this site (`git rev-list --count main`).
**Release** is the last revision Steve tested on his iPhone and called stable. Only releases go on the live app
(app.html). The beta (preview/app.html and the Inkhorse Plus artifact) may run ahead at any rev.

How a revision becomes a release:
1. `node tests/audit.js app.html` passes with 0 FAIL and 0 page errors.
2. The built-in manual matches that revision exactly: every change to the app in that revision has its manual text and pictures updated, the manual's `ver` is bumped, and MANUAL-CHECK.md has been run against it.
3. Steve runs PHONE-CHECK.md on his iPhone.
4. Steve says "that's stable".
Only then does it get a release number. The manual that ships inside a release describes that release and nothing newer. To roll back, check out the release branch (e.g. release-1.0)
and copy its app.html over the live one.

| Release | rev | Date | Marker | Notes |
|---|---|---|---|---|
| 1.0 | 64 | 2026-10-27 | branch release-1.0 | Colors (Light, StyleKnight, Sepia, Sky, own colors), At night, Night warmth, Hoofprint, manual matching the live app, version line added. No voice commands, no Clean up (those are beta only). |
