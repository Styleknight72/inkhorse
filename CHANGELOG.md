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
- Bella, a natural, human-sounding voice, can read your book aloud. She runs right on your device; the first time, Inkhorse asks before downloading her (about 92 MB, once) (preview).
- Adding a PDF to read asks how it should come in: as a real book (text you can make bigger, change the typeface of, and hear read aloud) or with the exact look kept as pictures of its pages. A PDF's contents page and its first chapter title come in properly (preview).
- On a book kept as page pictures, the Aa panel says so and grays out the settings that can't change a picture (preview).

## Revisions

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
