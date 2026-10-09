---
name: prometeo-knowledge
description: "Use when a Prometeo task concerns books, reading, bibliography, the organism's knowledge atlas, exams, study materials, or 🔥libros / 🔥examen / 🔥personal libros. Create precise grounded knowledge and questions with page-scoped continuity."
---

# Knowledge Atlas / Exam and Reading Skill

**Goal:** turn sources into durable, actionable knowledge connected to explicit Prometeo organs and page contexts. Do not conflate a user's personal learning records with public GitHub docs.

## Relevant inputs
- For books: title, author, edition/year/publisher, source URL for cover or publisher, core arguments, limitations, bibliography, **questions Prometeo could test**, organ/idea IDs, status (QUESTION, EVIDENCE, VERIFIED_DESIGN_DECISION).
- For study: exact course/topic, accessible student files/notes, practice questions and answers, spaced-review hooks when requested. Avoid asserting that current materials were found unless actually read.
- For earlier sessions/publications: exact private Page Change Thread/Feed and authorized library or connected account; git evidence/served bytes when public. An older chat message is not proof of published code.

## Steps
1. Invoke `prometeo-one-turn` and obey the Fire dispatcher. For `🔥personal`, inspect ONLY permitted relevant private sources, not every profile/file. Ask no history recap when source is recoverable.
2. Identify source / version / confidence; browse public book metadata when current verification is useful; keep publisher/cover URLs grounded, never fabricated.
3. Create the smallest relevant structured entry with category, authors, publication metadata, key ideas, counterarguments, organ links, questions, source citations and status. Link multiple books via precise concepts rather than blanket "everything connected".
4. For exams, separate confirmed course documents from likely topic assumptions; build concise thematic summaries or assessments backed by available materials. Keep personal class information private.
5. Critique the artifact: missing sources? mistaken attribution? unanswered questions? untested claim? stale context? Verify and correct genuine defects.
6. Persist result only to authorized page/notes/library owner with receipt; if local HTML or another chat artifact is unavailable here, don't claim you modified it. Return a portable candidate when actual owner isn't writable.

**Do not** create a second public knowledge authority, publish personal study data automatically, infer editions from artwork alone, or treat AI-generated summaries as evidence of what a book contains if the full text wasn't consulted.
