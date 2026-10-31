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
- Every book is set like a published book, whatever file it came from: chapter titles a third of the way down the page, the first line in small capitals, no indent on a chapter's first paragraph, the book's own chapter labels, plain front pages, centered scene breaks, and no stray single lines at the top or bottom of a page.
- Contents pages look the same in every book, one entry per line with a dotted line to the page number; tap to go there.
- PDFs that leave out the spaces between words come in with their spaces.
- Google can find getinkhorse.com: the site lists its pages for search engines.
- The history of changes moved out of the manual into these Release Notes, so the manual is only about how to use Inkhorse.
- Meilin, a natural, human-sounding voice, can read your book aloud. She runs right on your device; the first time, Inkhorse asks before downloading her (about 92 MB, once).
- Meilin uses two or more of your device's processor cores at once, so she makes her sentences faster and the pauses between them are shorter.
- Meilin saves every sentence she makes, so anything heard before plays again at once, and while Inkhorse is open she works ahead on what comes next, so it plays without pauses. The player shows how much is ready. You can have her pause between paragraphs instead of between sentences.
- A cleaner read-aloud player: one row of buttons while you listen, and Voice, Speed, Try, Follow words, Smooth listening and pauses in ⚙ Settings, with a card introducing Meilin (美琳, beautiful jade).
- A cleaner Write tab: the writing tools open from one Tools button in a panel over the page, and the page row fits on one line on a phone, so your writing gets more of the screen.
- Calvin and Soren, two male natural voices with American accents, join Meilin, each with his own card in Settings.
- Adding a PDF to read asks how it should come in: as a real book (text you can make bigger, change the typeface of, and hear read aloud) or with the exact look kept as pictures of its pages. A PDF's contents page and its first chapter title come in properly.
- On a book kept as page pictures, the Aa panel says so and grays out the settings that can't change a picture.
- Edit this book: Write always shows the book you're reading; a book you added to read is unlocked with one tap and moves into Your books, highlights included.
- Natural voices never skip words: a recording that stopped early is made again, one sentence at a time.
- Boost: an optional switch in ⚙ Settings that makes the natural voices on a fast server with your own DeepInfra key, so they start right away.
- One way to highlight: the Highlighter at the top. The extra Mark button in the listening player is gone.
- With the Highlighter on, swiping doesn't turn the page, so you can drag right to the edge of a line.
- Highlights are easy to remove: tap one to clear it, or tap Clear page to clear every highlight on the page.
- A chapter title like “Chapter One: Point of Origin” shows CHAPTER ONE above Point of Origin, like a printed book, and a PDF's title page and Contents are front pages, not chapter 1.

## Revisions

Rev 145 (October 30, 2026, preview): Write always shows the book you're reading. Steve found it confusing that his book could be read but not edited, while Write showed a different, empty book. Now, when the book open in Read is one added to read (locked), Write shows that book's name, says it's locked and why, and offers Edit this book; one tap unlocks it by moving it into Your books (chapters, covers, pictures, highlights) and opens it for editing. Edit now moves the book rather than copying it, so there is one book, not two; the locked copy is removed only after the editable one is safely made. Write in … instead goes back to your own book. The manual and page-picture books say they can't be edited. Tested on a phone-size screen, including a reload. Manual updated.

Rev 144 (October 30, 2026, preview): Edit this book. Steve's book “What If It's Already Here?” was only on his shelf as a book added to read, which is read-only, and the book in Write was an empty Untitled book; editing meant finding the original file again, which wasn't on his phone. Now every added book (except page-picture books and the manual) has an Edit button in the Library. One tap makes an editable copy in Your books with every chapter, the title, author, covers, pictures and the highlights made while listening, then opens it in Write, where Next mark visits each highlight. The read-only copy stays as it was. Tested on a phone-size screen: add a book, highlight it, Edit, then reload; the copy, its chapters and its highlight were all there. Manual updated.

Rev 143 (October 30, 2026, preview): Title and copyright pages are front pages in every book (Formatting Standard F1.3 and F7.1). In “What If It's Already Here?” the title page and the copyright page came in as ordinary chapters, so Jump to listed the copyright page as chapter 2, “Untitled chapter”, and Chapter One as number 3. Inkhorse only knew a front page when the importer had marked it. Now, before the first real chapter, a short page with © or the word copyright, one titled with the book's own title, or one named Title page, Copyright or Dedication is treated as a front page: no chapter label, no number in Jump to or the Chapters panel (a dot instead), an untitled one is listed as Copyright page, and the first real chapter is chapter 1. The book's words are not changed. Checked on a phone-size screen with a book laid out like Steve's, and a 200,000-word book turns pages as fast as before. Manual updated.

Rev 142 (October 30, 2026, preview): Erase is gone from the Highlighter, along with the Highlight button that only switched back from it. Steve noticed Erase and Clear page did nearly the same job and left the call to Claude: tapping a highlight already removes it, and Clear page removes a whole page of them, so Erase only added a way to trim part of a highlight, which is just as easy by tapping it away and dragging again. The bar is now one Clear page button. Manual updated.

Rev 141 (October 30, 2026, preview): Two fixes from Steve's iPhone. (1) Turning on the Highlighter moved him from page 17 to page 19: the new Highlight / Erase / Clear page bar took room above the book, the book got shorter and the pages re-flowed. The bar now floats over the top margin of the page, so the page size and your place never change. (2) Calvin skipped “The family album holds their actual wedding photograph: my mother in a bonnet veil,” every time. Calvin says that piece fine when tested here, so the likely cause is a saved recording of it that had stopped early (after “It is not.”); the player played the short recording and went on to the next piece. Now every natural-voice recording is checked against how long its words should take: one that stopped early is thrown away (also from the saved sentences) and made again one sentence at a time, and a piece that fails to be made is also retried sentence by sentence instead of skipped. Shown in a test on his exact paragraph: the old version skipped exactly those words; the new one reads them. Not yet checked on his iPhone. Manual updated.

Rev 140 (October 30, 2026, live): Boost (online voice) now shows in ⚙ Settings on the live app for everyone, on Steve's say-so. The manual now explains that the DeepInfra key is pasted once and stays saved on the device, but that Safari, the Home Screen icon and an app's built-in browser each keep their own copy, and that the Home Screen icon is the safest place to keep it. The key is never put in Inkhorse's code: the code is public, and anyone could spend the account's credit. Live and preview are the same file again.

Rev 139 (October 30, 2026, live): Revs 129 to 138 went live on getinkhorse.com, on Steve's "Approved". That brings the Highlighter to every book (including books added to read and the manual) with the Highlights list in Jump to, Highlight / Erase / Clear page, a smooth red while erasing, no page turns while highlighting, the Mark button removed from the listening player, a calmer voice Settings panel, and leaving full screen no longer turning the page. The Boost (online voice) switch stays hidden on the live app unless a key was already saved on that device. The pinned Inkhorse app in Claude was updated to the same file.

Rev 138 (October 30, 2026, preview, live in rev 139): While the Highlighter is on, swiping no longer turns the page. Steve found that dragging to highlight or erase near the right edge of his phone grabbed the page and started turning it. Now a drag with the Highlighter on only ever highlights or erases; turn pages with the arrows below the book, or turn the Highlighter off. Dragging past the end of a line, into the margin or off the edge of the screen now reaches the last word on that line instead of stopping short. Tested on a phone-size screen: dragging off the right edge, a page-turn swipe, the arrows, and swiping again with the Highlighter off. Manual updated.

Rev 137 (October 30, 2026, preview, live in rev 139): The red you see while erasing highlights is now one smooth, even color. Before, it was see-through, so it looked darker and streaky where words overlapped. The lime highlight is unchanged. Checked on a phone-size screen in the Light, StyleKnight and Sepia colors.

Rev 136 (October 30, 2026, preview, live in rev 139): The Mark button is gone from the listening player. Steve tried it and it did not work for him, and the Highlighter at the top (with Highlight, Erase and Clear page) does everything he needs, so there is now one way to highlight, not two. The listening player is one button shorter. Manual updated: the Mark entry is removed and the “editing by ear” tip now uses the Highlighter. The manual's picture of the player may still show the old pencil button until the pictures are redrawn.

Rev 135 (October 30, 2026, preview, live in rev 139): You can always remove a highlight. Steve found that Mark in the listening player only ever added highlights: it works on the sentence being read right now, so once the voice moved on there was no way to go back to an older highlight. Turning on the Highlighter (the pencil at the top) now shows a small bar above the page with Highlight, Erase and Clear page. Erase: drag across highlighted words to erase just those words (they glow red while you drag; a highlight erased in the middle becomes two), or tap a highlight to remove all of it. Clear page removes every highlight on the page you are looking at. Tested on a phone-size screen with the manual: highlight, erase part, tap to clear, Clear page, and the bar showing and hiding. Not yet checked on a real iPhone. Manual updated.

Rev 134 (October 30, 2026, preview, live in rev 139): Highlights in every book. Steve writes chapters, then adds them as reading copies to proofread and mark what to add or fix. The highlighter (the pencil in Read) now works in books you've added to read and in the manual, not only in your own books; those highlights are kept beside the book on the device, so the book's text never changes, and they stay after closing Inkhorse. Jump to (tap the page number) now lists all highlights first, with page numbers: tap one to go to it, add a short note, Copy (with the book title and page), Share, or Clear. The Mark button while listening works in reading copies too. Tested on a phone-size screen with the manual: highlight, note, jump and a reload all worked. Manual updated.

Rev 133 (October 30, 2026, preview, live in rev 139): Two fixes from Steve's screenshots. (1) Boost's saved key ended in "html": a web link had been pasted into the key box instead of the key, so DeepInfra turned it down. Save now refuses a web link and says to copy the key itself. (2) Messages about Calvin and Soren said "she" ("slower than she speaks"); messages and pop-ups now say he, him and his for the male voices, and she and her for Meilin.

Rev 132 (October 30, 2026, preview, live in rev 139): Clearer Boost key trouble. In Safari on Steve's iPhone, Boost said it couldn't sign in with the key, while the same key worked in the Claude app's browser. The note now says which problem it is (key not recognized, payment or limit, or refused), shows the last four characters of the saved key so it can be compared, and says how to fix it. Saving a key now removes spaces and line breaks that can come along when copying from Notes, and a key that passes Test key switches Boost straight back on.

Rev 131 (October 30, 2026, preview, live in rev 139): Full screen: Steve found that tapping to leave full screen while listening sometimes turned the page instead. The exit button in the corner sits over the page's right edge, where a tap turns forward, and at 32 pixels it was easy to just miss. It is now 44 pixels (Apple's minimum touch size), drawn above the page's 3D layer, and any tap within about a finger's width of it leaves full screen instead of turning the page; the stray tap that follows is ignored so it can't land on a button below. Tested on a phone-size screen: a near miss now leaves full screen on the same page.

Rev 130 (October 30, 2026, preview, live in rev 139): A calmer Settings panel with Boost on. Steve found the voice Settings busy. The Boost box now sits right under the voice's card, and while Boost is on the head-start settings (the What to expect note, Smooth listening and If a pause is needed) step aside, since the server doesn't need them; they return when Boost is off. Once a key is saved, the key box folds into one Key saved button showing the last four characters; tapping it opens Change, Test key and Forget key. If the server refuses the key, the note now says so in plain words (no server code). The manual's Boost paragraph says the same.

Rev 129 (October 30, 2026, preview, live in rev 139): Boost (online), for testing. With Boost on and a DeepInfra key saved on the device, Meilin, Calvin and Soren are made on DeepInfra's servers (the same Kokoro voices) instead of on the device: no download, no head start. The key is kept only in that browser, never in Inkhorse's code. Boost asks for several sentences at once, so a slow moment on the server doesn't reach the listener; everything made online is saved and replays instantly, even offline; if the server can't be reached, the sentence is made on the device instead. Settings has the switch, a key box, Test key and Forget key; it shows only on the preview (or on a device that already has a key). Tested with Steve's key: a fresh device with no voice download read Meilin from the server; six sentences at once came back in under 2 seconds, though DeepInfra was slower (5 to 30 seconds per sentence) for a while that evening.

Rev 128 (October 30, 2026, live): Credit for the natural voices. Meilin, Calvin and Soren are built on Kokoro, an open-source voice model by hexgrad, run by kokoro-js; both are Apache 2.0, which allows renaming and commercial use with credit. The credit is now on the copyright page (with a link to the license), in the LICENSE file, on the About page under Natural voices, and in the manual's Meilin section. The names and introductions are Inkhorse's; the voice technology is Kokoro's.

Rev 127 (October 30, 2026, live): In the player's Settings, a short What to expect note sits under the voice card whenever a natural voice is chosen: made on the device, free and private; on most phones about a minute of head start for each minute without pauses, built while Inkhorse is open; replays instant; the device's own voices start right away. The manual's Settings picture shows it.

Rev 126 (October 30, 2026, live): Honest about the natural voices, so nobody is misled. The landing page names all three voices and explains, in plain words, that they're made on the device and need a short head start (about a minute for each minute of pause-free listening) on most phones. The About page no longer lists natural voices as coming soon; it describes them, with the same honest note. The speed check after Try no longer just says "there will be pauses"; it says how the head start covers it. The manual's speed-check line matches.

Rev 125 (October 30, 2026, live): Calvin, Soren and everything since rev 119 went live on getinkhorse.com, on Steve's "Approved". Also fixed: the Aa panel and the voice Settings panel could be open at the same time, stacked on top of each other; opening one now closes the other.

Rev 124 (October 29, 2026, preview): The several-cores speed-up no longer switches itself off by mistake. On Steve's iPhone it said "switched off on this device" and Calvin ran on one core: the crash guard took a single closed page as a crash, but iOS closes pages that are put away while the voice is starting (for example, switching apps to send a screenshot). Now it takes two in a row, and a sentence made on several cores clears the count. Phones that rev 107 to 123 switched off after one closed page get the speed-up back once. Also, the voice's status box says "is still making the next sentence" instead of "her", since Calvin and Soren use it too. Tested on the test computer: one closed page keeps the cores, two switch them off, and a phone switched off before gets them back.

Rev 123 (October 29, 2026, preview): Meilin's card now says "one of the voices of Inkhorse", like Calvin's and Soren's, since she's no longer the only one. The manual's Settings picture shows the new wording.

Rev 122 (October 29, 2026, preview): The manual's pictures match the new voices and player. New pictures: the whole Settings panel with Meilin chosen, Calvin's card, Soren's card, the Smooth listening button and the pause choice; the Voice picture now shows Meilin instead of the old Default voice list. Checked page by page on a phone-size screen.

Rev 121 (October 29, 2026, preview): Calvin and Soren, two male natural voices, join Meilin. Steve named Male voice 1 (Kokoro's American "Michael") Calvin and Male voice 2 (Kokoro's American "Fenrir") Soren. In Settings, each has his own card in Steve's words. The Smooth listening note now names whichever natural voice is chosen, and the pause choice reads "If a pause is needed" instead of "If she needs a moment".

Rev 120 (October 29, 2026, preview): Two male natural voices to try, under Meilin in the Voice list: Male voice 1 (Kokoro's American "Michael") and Male voice 2 (Kokoro's American "Fenrir"). They use the same download as Meilin, so each adds almost nothing. Steve listens to both and gives the one he keeps his own name; the other goes. Meilin's card shows only when she's the voice.

Rev 119 (October 29, 2026, live): Pictures set beside text line up with their own text. Steve's screenshot of the manual's player page showed the small button pictures drifting: a picture sat next to the wrong line and the text broke oddly around it. Now each side picture, and the text that goes with it, starts below the picture before it, in the app, in every book with side pictures, and in EPUB exports. The manual's Settings line got its own picture of the Settings button.

Rev 118 (October 29, 2026, live): The landing page shows the app as it is now. Steve saw that its Write and Read pictures showed the old layout. New pictures show the Write tab with the Tools button and the Read tab with Meilin reading and the new player. "Hear it" now mentions Meilin, and natural voices are no longer listed as coming soon (writing cleanup still is). Also fixed: on phones narrower than Steve's, the Write tab's page row cut off the word count; it's tighter there now, so everything fits on one line.

Rev 117 (October 29, 2026, live): Everything on the preview went live on getinkhorse.com, on Steve's say-so ("Push the app to live status"): the formatting engine, contents pages, PDF choices, Meilin with saved sentences, Smooth listening and several cores, the cleaner player and Write tab, and the rest of revs 92 to 116. The live site's offline helper now also turns on several processor cores for the app page, as the preview's did. Books and settings are kept in the same place on the device as before, so nothing anyone wrote moves or changes. Not yet a release: Steve runs the phone check and calls it stable first.

Rev 116 (October 29, 2026, preview): One settings icon everywhere. Steve liked the gear on the player's Settings button; the Write tab's Tools button now uses the same gear (the device's own ⚙ symbol, which an iPhone draws as a silver gear) instead of a line drawing. The manual's pictures of the top row and the Tools button are updated.

Rev 115 (October 29, 2026, preview): A cleaner Write tab, like the player's Settings. Steve wanted the Write screen condensed and found the arrow buttons unclear. The tools-hiding arrow is now a Tools button; it opens Dictate, Hoofprint, Word count, Focus, Picture, Import, Paste, Copy and Top of chapter in a panel floating over the page, which closes when a tool is used or with Done (Word count leaves it open). The chapter title always shows. Top moved from the page row into Tools, so on a phone the page row (pages, Resume, Undo, Redo, Find, word count) fits on one line. The manual's pictures of the top row, the Tools button, the page row and Top are new, with a picture of the Tools panel.

Rev 114 (October 29, 2026, preview): A cleaner player. Steve found the player crowded. It now shows only the row of listening buttons and the status line; Voice, Speed, Try, Follow words and, for Meilin, Smooth listening (the new name for Work ahead) and where she pauses are in ⚙ Settings, which floats over the page so the page doesn't move. The minutes ready show in Settings rather than in the status line. With Meilin chosen, Settings shows her card, in Steve's words: 美琳, Měilín, 美 (Měi) = beautiful, 琳 (Lín) = fine jade, American accent, and her introduction. The book gets more room on screen. The manual's picture of the player and its text are updated.

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
