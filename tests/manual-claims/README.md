# User manual claim checks (rev 240)

One check for each thing the User manual's first two chapters ("The big picture" and "Your book, covers and chapters") say Inkhorse does. They run against a local copy of the app:

    python3 -m http.server 8765 --bind 127.0.0.1    # from the repository folder
    NODE_PATH=... PDFJS_DIR=... node tests/manual-claims/p1.js   # p1 … p6

Each line prints OK or FAULT with the claim it checks. A FAULT means fixing the app, never the manual's sentence (unless the check itself is wrong, which must be said in CHANGELOG.md). p2b re-checks Focus (BP-47b, BP-47c) the right way; p2's two lines for those are known wrong checks. These are a lab, not yet part of `tests/audit.js`; moving them in is open work.
