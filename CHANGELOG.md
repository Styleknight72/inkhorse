---
title: Inkhorse Release Notes
subtitle: What changed in Inkhorse, and when
author: StyleKnight & Claude
edition: Kept up to date with every revision · started October 28, 2026
---

# How to read these notes

Inkhorse counts its versions two ways. A revision (rev) is every change put on the website; the number goes up by one each time. A release (1.0, 1.1, and so on) is a revision Steve has tested on his iPhone and called stable. Only releases go on the live app.

The newest release is first. Under each release is a short summary of what changed for people using Inkhorse, then the revisions in detail, newest first. A revision marked "preview" was on the preview page for testing and had not yet gone live.

The built-in User manual explains how to use Inkhorse as it is today. These notes are the history.

# Release 1.1 · in progress

## What's new for you

- Book covers all show at one standard 2:3 book shape, whole, on phone, tablet and computer.
- The manual's own cover is a proper 2:3 book cover.
- Every book is set like a published book, whatever file it came from: chapter titles a third of the way down the page, the first line in small capitals, no indent on a chapter's first paragraph, the book's own chapter labels, plain front pages, centered scene breaks, and no stray single lines at the top or bottom of a page (preview).
- Contents pages look the same in every book, one entry per line with a dotted line to the page number; tap to go there (preview).
- PDFs that leave out the spaces between words come in with their spaces (preview).
- Google can find getinkhorse.com: the site lists its pages for search engines.
- The history of changes moved out of the manual into these Release Notes, so the manual is only about how to use Inkhorse (preview).
- Meilin, a natural, human-sounding voice, can read your book aloud. She runs right on your device; the first time, Inkhorse asks before downloading her (about 92 MB, once) (preview).
- Meilin uses two or more of your device's processor cores at once, so she makes her sentences faster and the pauses between them are shorter (preview).
- Meilin saves every sentence she makes, so anything heard before plays again at once, and while Inkhorse is open she works ahead on what comes next, so it plays without pauses. The player shows how much is ready. You can have her pause between paragraphs instead of between sentences (preview).
- Adding a PDF to read asks how it should come in: as a real book (text you can make bigger, change the typeface of, and hear read aloud) or with the exact look kept as pictures of its pages. A PDF's contents page and its first chapter title come in properly (preview).
- On a book kept as page pictures, the Aa panel says so and grays out the settings that can't change a picture (preview).
- A chapter title like “Chapter One: Point of Origin” shows CHAPTER ONE above Point of Origin, like a printed book, and a PDF's title page and Contents are front pages, not chapter 1 (preview).

## Revisions

Rev 113 (October 29, 2026, preview): The page no longer jumps while Meilin reads. Steve's screenshots showed the page count changing (p 1 of 331, p 2 of 338, p 3 of 402) and the page flickering: the player's status line grew as it counted (Getting ready 2 s · 0 s ready …), the player's buttons wrapped onto another row, the player got taller, the book got less room, and Inkhorse re-cut every page. The ready time updating every 2 seconds (rev 109) made it much worse. Now the status line has its own line and never wraps, and Meilin's notes float above the player instead of pushing the book up, so the player stays one height. Tap a note to close it. Tested on the phone-size test browser: before, the player changed between 144, 163 and 238 points tall and the sample book between 4 and 10 pages; now it stays 163 and 4.

Rev 112 (October 29, 2026, preview): Full screen while listening shows only the book. Steve asked that the read-aloud player disappear in Full screen so it's just the page and the voice. The reading carries on and the pages turn by themselves; tapping the middle of the page or the corner button brings the controls and the player back.

Rev 111 (October 29, 2026, preview): Try no longer hides Meilin's speed check behind an error. On Steve's iPhone the sample was made and measured, but playing it was interrupted ("The operation was aborted") and that message replaced the result. Now the speed check stays, Inkhorse tries playing the sample once more, and if it still can't, it says to tap Try to hear her. An error message about making the sample now shows the actual problem rather than an older one.

Rev 110 (October 29, 2026, preview): Speed and Meilin's saved sentences work together. Steve's player showed 0 s ready at 0.9×: each speed was a separate recording, so nothing made at 1× could be reused, and slower speech was more for her to make. Now she always makes her voice at normal speed and the device plays it faster or slower, keeping her pitch; one saved sentence fits every speed, and changing Speed takes effect at once without remaking anything. The ready time counts listening time at the chosen speed.

Rev 109 (October 29, 2026, preview): Free ways to listen to Meilin without pauses. Steve's iPhone makes her about 1.9 times slower than she speaks (3.4 seconds of speech in 6.5 seconds), so making each sentence just before reading it always leaves a gap. Now every sentence she makes is saved on the device (oldest removed past about 300 MB), so listening again plays at once and only changed sentences wait. Work ahead: while Inkhorse is open on screen and she isn't busy, she makes what comes next from the reader's page, up to 30 minutes ahead; the player shows how much is ready (for example Reading · 6 min ready). Pauses: Paragraphs makes a whole paragraph before reading it, so she reads each paragraph straight through. Try still makes a fresh sample, so the speed check stays honest. On the test computer: after 2 minutes of working ahead, 44 seconds of speech were ready, play started in 0.2 seconds, and the saved sentences were still there after a reload.

Rev 108 (October 29, 2026, preview): Meilin's report box says how far turning on several processor cores got (helper running or not, page reloaded or not). On Steve's iPhone rev 107 showed she was still using one core, and this line shows why. No other change.

Rev 107 (October 29, 2026, preview): Meilin uses several processor cores at once. Rev 105's second helper needed a second copy of her voice and closed Safari on Steve's iPhone; now one helper shares the work across two cores (four on computers with eight or more), with one copy of her voice. Browsers only allow this on a specially protected page, so the preview has its own small helper (preview/sw.js) that turns it on; the first time it arrives, the page reloads itself once. If she can't start this way on a device, Inkhorse says so and offers Reload now; if the page closes while she's starting, the next open notices. Either way she goes back to one core on that device for good. On the test computer (two cores) she was about a quarter faster: 7.9 seconds of speech took 20 seconds instead of 26. Her report box shows how many cores she uses.

Rev 106 (October 29, 2026, preview): Make her faster is switched off. On Steve's iPhone the faster chip made Meilin quick (3.5 seconds of speech in 2.9 seconds) but she came out as loud, broken static. A phone that was on the faster way goes back to her clear voice by itself, says so once, and the extra 163 MB download is deleted to give the space back. Her report box now shows how many processor cores the device has instead of the faster chip.

Rev 105 (October 29, 2026, preview): Meilin gets ready in the background as soon as Inkhorse opens (when she's the chosen voice and already downloaded), so the first tap on Read aloud starts her; before, tapping while she was still waking up stopped her, and it took several taps. On devices with several processor cores she now uses two helpers, making two sentences at the same time, to shorten the 2 to 4 second pauses Steve heard between sentences. The second helper has the same crash guard as the faster chip. She also works in shorter pieces (long sentences are split at commas), so she starts sooner.

Rev 104 (October 29, 2026, preview): On Steve's iPhone, Make her faster closed the page: the full-size voice (326 MB) needed more memory than Safari allows one page. Now the faster way uses the half-size voice (163 MB). A crash guard leaves a note before setting up the faster chip; if the page closes first, the next open puts Meilin back on the regular way, says what happened, and never tries that again on the device. A phone that had the faster way turned on by rev 103 is put back on the regular way automatically, and the 326 MB file is deleted to give the space back.

Rev 103 (October 29, 2026, preview): Make her faster. On Steve's iPhone Meilin worked but paused 4 to 6 seconds between sentences, because the phone made each sentence slower than she speaks it. When a device has a faster chip (WebGPU) and she can't keep up, Inkhorse offers Make her faster, after a speed check or the first time she falls behind: a bigger version of her voice (about 326 MB, once) that runs on that chip. She must say a real word before Inkhorse switches; if the faster way fails, or isn't ready within 3 minutes, Inkhorse says so and keeps the regular way. The speed check also says whether her voice is saved on the device for next time.

Rev 102 (October 29, 2026, preview): Meilin speaks on iPhone and iPad. Her pronunciation part unpacks its data in a way Safari doesn't support, so on Apple devices she downloaded but never made a sentence (Steve's report box showed the error). Inkhorse now gives Safari the missing piece before she starts. Tested by making the test browser act like Safari: stuck without the fix, speaking with it.

Rev 101 (October 29, 2026, preview): The natural voice is now called Meilin, Steve's name for her. It's the same voice (Kokoro's American female voice, first shown as Bella), so a phone that already downloaded her keeps her and nothing downloads again.

Rev 100 (October 29, 2026, preview): A chapter title written as “Chapter One: Point of Origin” (with a colon or a dash) is set like a printed book: CHAPTER ONE as the small label, Point of Origin as the title, instead of Inkhorse adding its own “CHAPTER 2”. When a PDF is made into a real book, the pages before the first chapter (title page, Contents) are front pages and are not counted as a chapter. Bella's player line now counts the seconds steadily instead of flickering between two messages. If a sentence takes more than 30 seconds, or something goes wrong, a box shows what Bella is doing (download, sentences made, whether her helper is answering, whether the device has WebGPU, any error) with Keep waiting or Use my device's voice. Made after Bella stayed silent on Steve's iPhone and his PDF showed CHAPTER 2 above Chapter One.

Rev 99 (October 29, 2026, preview): Tapping a menu in the player (like Voice) no longer zooms the whole page in on iPhone; pinch to zoom still works. Bella reports what she's doing: the player counts the seconds while she prepares a sentence; after 45 seconds Inkhorse says she may be too slow on this device and offers Keep waiting or Use my device's voice, with any error message. Try, with Bella chosen, is now a speed check: it shows how many seconds of speech she made and how long that took. Made after Bella downloaded on Steve's iPhone but stayed on Getting ready.

Rev 98 (October 29, 2026, preview): Adding a PDF to read now asks: Make it a real book (text you can make bigger, change the typeface of, and hear read aloud) or Keep the exact look (pictures of its pages, as before). Cancel adds nothing. Before, every PDF of up to 300 pages came in as pictures with no choice, so Size, Typeface and Read aloud did nothing on it. On a book kept as pictures, the Aa panel now says so and grays out Size, Spacing, Typeface, Justify and New page for each section. Also fixed when a PDF comes in as text: a contents page with three entries is set one entry per line, and a chapter title at the top of the page after the contents (like Chapter One) no longer gets stuck onto the contents. The User manual explains the PDF choice and the Aa note.

Rev 97 (October 29, 2026, preview): Bella, the first natural voice, in Read aloud. She is Kokoro, an open-source voice that runs on the device itself, so the book never leaves it. She sits at the top of the Voice list under Natural voices. The first time she is picked, Inkhorse asks before downloading her (about 92 MB, once) and shows a progress bar; after that she is saved on the device. While she reads one sentence she prepares the next ones; the player says Getting ready if she needs a moment. Pause, Rewind, Again, Skip ahead, Speed, Try and Follow words work with her. If she can't load, Inkhorse says so and uses the device's own voice. The User manual has a new section, Bella, the natural voice.

Rev 96 (October 28, 2026, preview): The "What's new in this edition" chapter left the User manual; the history now lives in these Release Notes, kept in the Inkhorse code folder as CHANGELOG.md.

Rev 95 (October 28, 2026, preview): The Inkhorse formatting engine. Every book is now set like a published book, whatever file it came from: chapter titles a third of the way down the page with the first line in small capitals, no indent on a chapter's first paragraph, the book's own chapter labels, plain front pages with no chapter numbers, centered scene breaks, and no stray single lines at the top or bottom of a page. E-books with a label above a chapter title (like PART 1) keep their titles, and the "Import check" pop-up is gone. Every rule has its own automatic test, named by its number in the Inkhorse Formatting Standard.

Rev 94 (October 28, 2026): The Inkhorse Formatting Standard, first edition, saved in the code folder as a document and an e-book. No change to the app.

Rev 93 (October 28, 2026, preview): The contents-page style is back, and fixed. Every book's contents page reads the same way, and big books open as fast as before. In Rev 88 and 89 a big book could take minutes to open and froze the app; Inkhorse now looks up contents page numbers only when a page is shown, and a speed test checks big books before any change goes live.

Rev 92 (October 28, 2026): Google's ownership tag added to the home page, for Google Search Console. No change to the app.

Rev 91 (October 28, 2026): Nothing in the app changed. The website now gives Google a list of its pages, so people can find Inkhorse by searching for it.

Rev 90 (October 28, 2026): The contents-page style from Rev 88 and 89 was taken out because it made big books freeze while opening. Inkhorse went back to Rev 87's code.

Rev 89 (October 28, 2026): Fixed Rev 88 so Inkhorse opens on older phone and tablet browsers too.

Rev 88 (October 28, 2026): Contents pages looked the same in every book. Taken out again in Rev 90 because big books froze; fixed and brought back in Rev 93.

Rev 87 (October 28, 2026): Nothing you can see changed. Inkhorse's automatic test now checks that every cover stays the same 2:3 size with the whole picture showing.

Rev 85 (October 28, 2026): The manual's own cover is now the standard 2:3 book shape, like a printed paperback, so it fills its spot in the Library the same way your other books do.

Rev 84 (October 28, 2026): Fixed the small cover pictures from Rev 83, which could grow taller than their box and get cut off at the bottom.

Rev 83 (October 28, 2026): Every small cover picture is one standard size and shape, a 2:3 book, on phone, tablet and computer: in the Library, in Jump to, and in Book settings. A cover of another shape still shows whole, with a soft blur of its own colors around it.

Rev 82 (October 28, 2026): The small cover pictures in the Library and in Jump to show the whole cover.

Rev 81 (October 28, 2026): Pictures are laid out consistently throughout the manual.

Rev 80 (October 28, 2026): The picture beside Page number shows the real page counter, and the Previous and Next pictures are smaller.

Rev 79 (October 28, 2026): The whole manual was proofread against the app.

Revs 73 to 78 (October 27, 2026): Until a release is tested and called stable, Inkhorse calls itself "1.1 candidate." The manual's cover names its release and revision, and is drawn so its border is even on every screen.

Rev 72 (October 27, 2026): Every page says which chapter it belongs to. A chapter's first page has "Chapter 5" above the title; the pages after it carry "5 · Title."

Rev 67 (October 27, 2026): One page number, not two. The number printed on each page, the big number under the book and the Contents all count from the start of the book. Jump to has a Go to page box.

# Release 1.0 · rev 64 · October 27, 2026

## What's new for you

- Version line: Inkhorse shows its version at the bottom of the Chapters panel and when you tap the save dot. The manual was fixed to match the app exactly.
- Your own web address: Inkhorse runs at getinkhorse.com and keeps your book in your browser instead of a Claude account.
- Colors: Light, StyleKnight (the signature dark theme), Sepia, Sky, and your own page and text colors, under Aa.
- At night: a second theme on a schedule, 8:00 PM to 7:00 AM unless you change it, and Night warmth for a warmer screen with less blue light.
- Hoofprint: Inkhorse learns your names, places and brands, offers a fix when dictation mishears them, and remembers every fix you make.
- Covers: the front cover sits on its own like a closed book, turns like a page, and is always shown whole.
- Book-shaped pages on phones, tablets and computers, instead of stretched ones.
- Sections flow down the same page, like a printed memoir, with a check box to give each section its own page.
- Curly quotes when you read and export. What you typed is not changed.
- Contents with page numbers in the manual.
- Print PDF: the cover is left out of the print file and the type is built into the file, as printers ask.
- Imports: PDF paragraphs come in whole, and a contents page that arrives as one long block is put one entry per line.

# How these notes are kept

Every revision gets a line here, in plain words, the same day it is made. When Steve calls a revision stable, its release gets its "What's new for you" summary and the date. The User manual never carries this history; it only explains how to use Inkhorse as it is now.

The master copy is CHANGELOG.md in the Inkhorse code folder. The e-book, Inkhorse Release Notes, is built from it.

Powered by StyleKnight & Claude.
