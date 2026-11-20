---
title: The Making of Inkhorse
subtitle: Piloted to Existence
author: Steve Claude Patient
edition: First draft · November 20, 2026
italics: yes
---

# A Note Before We Begin

This book tells how Inkhorse was made: a free book-writing and reading app, built in five and a half weeks by a man who does not write code.

Everything in it can be checked. The dates come from the app's Release Notes, from the saved history of its code, and from the conversations where it was built. Where a number is measured, I say so. Where it is an estimate, I say that too. The mistakes are here, because they are part of the record, and because a book that hides its mistakes is not worth trusting.

My words are mine. Where I quote myself, those are the words I said at the time.

# Chapter One: Point of Origin

I was born in Manchester, New Hampshire, in 1972. I graduated from Manchester High School West in 1991. As far as I know, that diploma is the highest education anyone on my father's side of the family had.

School was not easy for me. I struggled with spelling and grammar, and I still do. I get shy about writing. But that doesn't mean I'm stupid. What I have always been good at is finding the gaps, and working out how to build a bridge from point A to point B.

Around 1995 I knew I wanted in on technology. A few years later I went back to school for it: an eighteen-month course at Florida Career Institute in Lakeland, Florida, called Computer Technician and Network Engineering. I built a Pentium III computer there, and I graduated in 2001. I believed then that one day this technology would help people.

I became a network engineer. I never became a coder, and that was a choice. I hate typing. The idea of sitting glued to a screen, hunting for one bad character that stops a whole program from working, has never appealed to me. I always felt there had to be an easier way.

Twenty-five years later, there was. I call it piloting.

# Chapter Two: A Chat Becomes an App

In October 2026 I was writing a memoir. Its title is *What If It's Already Here?*, and its first chapter is called "Point of Origin." I was writing it on my phone, an iPhone 15 Pro Max, mostly by talking to it, and I needed somewhere to put the pages.

So I asked Claude, Anthropic's AI, to build me one. The first version lived inside a Claude chat, and it was called Page Proof. By October 12, 2026, I was already asking for upgrades: when I switched from reading to writing, the cursor should land on the paragraph I had been reading; I wanted a quiet mode for writing with nothing else on the screen; and I wanted the whole book backed up every day, with one tap to put it back.

I loved the way the pages curled when they turned. I tested everything on my phone and sent screenshots of anything that looked wrong. I saved every file Claude sent me and loaded it back into the app, so that no detail was lost.

Page Proof grew quickly. On October 16 it got a Drafts shelf, for loose pages I could have read aloud, fix, and then add to a chapter. On October 17 it got a user manual, "what every button does, with pictures," which came already on the shelf. The manual would turn out to matter more than I knew.

Somewhere in those weeks Page Proof got its real name: Inkhorse.

# Chapter Three: A Name, an Address, a Release

On October 23 I wanted the total page count of my book on the screen, like "page 312 of 840," so I would always know how big the book was. That same day something else bothered me more. When I shared a link to the app, the preview showed Claude's logo and Claude's address, not mine.

So I moved it. I made a public home for the code on GitHub, under my own account, and uploaded the app myself, from my iPhone. That was the first saved change in the code's history: October 23, 2026. From then on, every change has a date and a time.

On October 24 I bought my own address. Inkhorse.com was taken. I chose getinkhorse.com, because "it's in the name," for a dollar the first year. That night Inkhorse got a landing page, and a tip jar on Ko-fi with a button that says "Feed the Horse." The app itself would be free.

On October 25 I named the way Inkhorse learns a writer's own words, so that "Style night" becomes StyleKnight: Hoofprint.

On October 26 I said what Inkhorse had to be: "not a toy." A serious tool, free, that runs in the web browser of any phone, tablet or computer.

On October 27, Inkhorse reached Release 1.0. It was revision 64, the sixty-fourth version of the app. It had colors (Light, StyleKnight, Sepia, Sky, and your own), a night mode with warmer light, Hoofprint, and a manual that matched the app.

That same day I learned something about myself as a builder. Claude and I had spent two days on voice commands and a voice-controlled Fix. Then I found that my iPhone's own keyboard dictation worked better than what we had built. I didn't want to reinvent the wheel. We set the beta aside and went back to making the free app work.

I also asked for something every serious piece of software has: a number for every change. A "rev" for every revision, and a release number only when I had used it on my phone and called it stable. That rule still holds.

# Chapter Four: The Voices

I edit by ear. I would rather hear my words read back to me than read them myself, like a tape deck: rewind, push play.

On October 29 I heard Kokoro, an open-source voice, and it was better than anything a web page could give me. We built it into Inkhorse, and I named the voice Meilin, meaning "beautiful jade." The next day two male voices joined her, and I named them too: Calvin and Soren.

A voice that runs on the phone itself is slow at first. On my iPhone, Meilin paused between sentences. Over a few revisions she learned to work ahead, and on October 29 I wrote down the result: "no more pauses."

On October 30 I almost made a claim I couldn't keep. I wanted to say the voices were "better than the voice that came with your phone." But the iPhone's best voices are very good; web pages just can't use them. So the line became "Better than the voices your browser gives you." Never mislead the people who use Inkhorse. That became a standing rule.

# Chapter Five: The Pilot

People ask how a man who doesn't code builds an app. Here is how.

I decide what Inkhorse is, what it is for, and what "right" looks like. The AI writes the code, tests it, and tells me what it found. New work goes to a preview copy first, never straight to the live app. I try it on my iPhone. When it holds up, I say a word ("Approved," "Push it," "Make it so"), and only then does it go live.

I am the pilot in the loop. You can quote me on that. AI was never meant to be without a human. The AI does not decide what Inkhorse promises; I do. And I hold it to that promise.

The work is not easy for either of us. I find faults on my phone and send screenshots. The AI finds faults with tests and has to tell me plainly, including when the fault is its own. I don't read every word it shows me, and I don't have time to do every check. So the checking is the AI's job, and it has to be honest about what it checked and what it couldn't.

I have written with AI in three ways: writing with Claude in a chat and pasting it in, staying inside Inkhorse with its tools, and plain old-school typing. Inkhorse was built the first way. It was talked into existence.

# Chapter Six: The Promise

On October 28 I said the thing that changed the direction of the whole project: "If we can't get our books professionally formatted for reading or writing, we don't have an app."

So Inkhorse got a standard: The Inkhorse Formatting Standard, built on the rules that real publishing follows, including the Chicago Manual of Style, the EPUB rules for e-books, and Amazon's rules for print. The standard had to live in the code, not in an AI's memory.

On November 7, after using it on my phone, I called revision 192 stable: "I wanna call stable. I like it the best so far." It became Release 1.1.

On November 10 I said, "From here on out, I don't want any more formatting issues. That's why we have a formatting standard." The honest answer was that a standard only protects what it has a test for. We counted. Of the 71 rules in the Formatting Standard, 45 were proven by a test. So I set the rule that still governs Inkhorse: a rule should not be written unless there is concrete evidence the app does it.

That week Inkhorse got a third built-in book, The Inkhorse Publishing Standard, about what "ready to publish" means. The three books that come with the app (the User manual, the Formatting Standard and the Publishing Standard) are a promise of what Inkhorse does. We don't say that word lightly here. A new user starts there and must find no surprises.

On November 11 I set a deadline: Inkhorse ready by January 11, 2027.

On November 12 I asked, "How do we know the checks are all correct?" A separate reviewer, one that had not seen the work, read every test against the rule it claimed to prove. It found twelve that were weaker than they said. Each was made stronger, and each was proven to catch a fault by running it against a copy of the app that had been broken on purpose. A later review found more weak checks and promises with no check at all. By November 19 every one of them was done.

On November 14 the checks started running in Safari's engine too, the one inside my iPhone, because a check that only runs in Chrome is not enough. On November 19 the app passed all 185 of its checks in both.

# Chapter Seven: Mistakes, Said Out Loud

Inkhorse rests on eight pillars of my own: Love, Truth, Honesty, Clarity, Purpose, Memory, Responsibility and Faith. Truth means the mistakes go in the record. These are some of them.

The first page-turn sound was made from noise, and it hissed. It was replaced with a real recording of a page turning.

Saving a backup on my iPhone and tapping it in the Files app froze the screen on "Loading…" until I restarted the phone. Backups now save as a kind of file the iPhone doesn't try to open.

Reading a 600-page book, I said: "I'd be on page 6, and the next thing you know, I'm in chapter 12." The page numbers were guesses that kept changing. Now they hold still.

Google's AI search told people to "exercise caution" with getinkhorse.com because it couldn't find the site. We made the site plain and findable, and I verified it with Google myself.

On November 11, three faults in the Word export reached my phone that the AI could have caught by looking at the pages first. Since then, the AI turns every export into real pages and looks at them before I ever see them.

On November 13, testing on my iPhone, I found the fault that two days of formatting work had missed: the spaces between words changed from line to line.

On November 19, stronger checks found three more. Italic words could run past the margin in Safari. The Compare tab measured the tablet and paperback pages wrong. And Spelling could offer to "fix" people's names. All three were fixed the same day.

And the AI's own small one: it called the horse on the new opening screen gold. It is chrome, and has been since November 16.

None of these are hidden. Every one is in the Release Notes, with its date.

# Chapter Eight: What Inkhorse Is Made Of

I said Inkhorse is not a toy. Here is what that means, measured on November 19, 2026, at revision 269.

All of Inkhorse is one file, about 5.4 megabytes. It runs in the web browser of any phone, tablet or computer, and once it is on a device it works without a signal. About 4.6 megabytes of that file are pictures and sound built right into it: the covers, the 102 pictures in the User manual, the sound of a page turning. The rest is the app itself.

The code. Laid out the standard way programmers lay it out, Inkhorse is about 18,600 lines of JavaScript, the language that makes it work, and about 3,800 lines of style, which decide how everything looks. That is more than 22,000 lines in all, made of about 1,700 small working parts called functions. I typed none of them.

The checks. There is more code checking Inkhorse than there is Inkhorse: about 26,000 lines of tests. The main check has 185 steps, and every one must pass twice, once in Chrome's engine and once in Safari's, before anything goes live. On top of that, about 380 separate checks each prove one sentence in the User manual, so the manual can never promise something the app doesn't do.

The books inside it. Three books come with the app. The User manual has ten chapters, about 13,000 words and 102 pictures. The Formatting Standard has 71 numbered rules in about 5,700 words. The Publishing Standard has 45 numbered rules in about 2,800 words. A rule goes into a standard only with a test that proves it.

What it does. Inkhorse brings in books from e-books, PDFs, Word files, plain text and Markdown, and finds the same skeleton in all of them: cover, title page, copyright, contents and chapters. It sends books out as e-books that pass EPUBCheck, the publishing industry's own checker, as print-ready PDFs, and as Word files. It reads aloud in three natural voices, Meilin, Calvin and Soren, made on the device itself after a one-time download of about 92 megabytes, so your book never leaves it. It learns your names with Hoofprint, takes dictation, highlights, and lets you fix a word right on the page.

The whole project. 401 files, about 46 megabytes, every change saved with its date: 346 of them.

# Chapter Nine: What It Cost

These are the numbers, as of November 19, 2026.

From the records: about five and a half weeks, from October 12 to November 19. Work saved on 28 different days since October 23. 346 saved changes to the code. 269 revisions. About 140 hours of building, measured from the gaps between saves since October 23. Thirty of those saves happened between midnight and five in the morning, and the busiest hour of all was eleven at night.

Estimated: between 180 and 250 hours in all, counting the first eleven days before the code had its own home, the testing on my phone, and the time spent thinking. About 50 to 60 conversations with the AI, many of them running for days.

The money: about $248, by my count.

For comparison, hiring a freelance developer usually runs from $50 to $150 an hour. Two hundred hours of that would have cost somewhere from $10,000 to $30,000, for the code alone. But the honest total is not $248. It is $248 plus five weeks of full-time work, many of them late at night. The hours were mine.

# Chapter Ten: What It's For

I believe reading and writing are still essential. Education comes from knowledge, and knowledge comes from records, which we call books.

Inkhorse is for people who struggle with writing and still have a book in them. People like me. Your own book comes in, and Inkhorse tidies it and formats it so it looks like a book someone would pay for. It flags the spelling, and you decide every change to your words. Someone else's book comes in to read, and Inkhorse never changes a word of it, not even a typo.

On November 19, revision 269 went live with a new opening screen: my StyleKnight horse in chrome on navy, the name Inkhorse, and the StyleKnight motto: "The power to get it done, and then some!"

Whether Inkhorse matters to the world is for the people who use it to decide. What it means to me is already settled. I struggled with writing in school. I went back to school believing technology would one day help people. And without typing a line of code, I piloted a tool that does exactly that.

Made for an easier way.
