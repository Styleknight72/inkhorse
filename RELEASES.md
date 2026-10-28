# Inkhorse releases

Two numbers. **rev** goes up with every change pushed to this site (`git rev-list --count main`).
**Release** is the last revision Steve tested on his iPhone and called stable. Only releases go on the live app
(app.html). The beta (preview/app.html and the Inkhorse Plus artifact) may run ahead at any rev.

Rule: a new release number is set only when Steve says "that's stable". To roll back, check out the release branch (e.g. release-1.0)
and copy its app.html over the live one.

| Release | rev | Date | Marker | Notes |
|---|---|---|---|---|
| 1.0 | 64 | 2026-10-27 | branch release-1.0 | Colors (Light, StyleKnight, Sepia, Sky, own colors), At night, Night warmth, Hoofprint, manual matching the live app, version line added. No voice commands, no Clean up (those are beta only). |
