# Study System V2 — AI Build Protocol

Execution contract for any future AI asked to build a study instance.

## Input

At minimum: source location(s), course/exam identity, exam date/time if known, and any known exam-format/instructor clues. If something is unknown, mark it unknown. Do not invent exam format.

## Required workflow

### 1. Inventory sources
List every relevant file/resource before summarizing. Detect duplicates, old versions and scope boundaries.

### 2. Establish authority
Classify each source as:

- `current_authority`
- `required_reading`
- `evaluation_evidence` — review sheets, sample cases, last-class exercises
- `supporting`
- `historical_or_old`
- `out_of_scope`

Current course material outranks old summaries when they conflict.

### 3. Build exam profile
Extract scope, question formats, required operations (`define`, `compare`, `develop`, `apply`, `solve`, `interpret`, `draw`, etc.), explicit review questions, repeated instructor emphasis and example-case grammar. Separate evidence from inference.

### 4. Build the complete coverage map
Before writing explanations, enumerate the meaningful concepts that could be tested. Coverage is a map, not a summary. Do not drop something merely because it looks minor.

### 5. Choose pedagogical grouping
Do not blindly copy slide order. Group concepts so the learner can reconstruct relationships and causes while preserving source terminology.

### 6. Write connected explanations
For every important topic produce `anchor`, `summary`, `explanation`, `relations`, `do_not_confuse`, `exam_use`, and `source_refs`. Avoid explanations that are just expanded bullet lists.

### 7. Extract recall atoms
Only after the connected explanation exists, create atoms such as author→contribution, concept→definition, stage→order, category→members, condition→consequence, formula→meaning, exception→rule. Atoms support recall; they do not replace theory.

### 8. Design transversal map(s)
Find the cross-module relation most likely to collapse in memory and encode it as a compact map with connected group summaries.

### 9. Build practice by operation
Practice type follows the exam profile, not UI convenience:

- MCQ → recognition/discrimination/coverage gaps
- short recall → retrieval
- development → coherent production
- case/problem → application
- integrated case → integration
- oral prompt → explanation without notes
- drawing → spatial/structural reconstruction

For case-based exams, preserve the course’s solution grammar when evidence supports one, e.g. `concept → evidence → justification`.

### 10. Gap test
Explicitly target false confidence: neighboring concepts with similar wording, missing middle steps, correct author/wrong contribution, rule/exception swaps, and concepts understood abstractly but misapplied.

### 11. Coverage QA
Cross-check the completed instance against the source inventory. Every relevant concept must be represented or explicitly excluded with reason.

### 12. Interaction QA
Verify closed overview readability, open-topic readability, desktop/touch layouts, no overlaps, honest controls, two-color invariant, persistence, whiteboard state if enabled, and countdown timezone/date if enabled.

### 13. Publish
Prefer a stable URL. Ordinary exam-content changes must not require rewriting the engine. Publish/update the exam instance and render through the reusable engine.

## Prohibited shortcuts

- Do not start by producing one giant generic summary.
- Do not generate flashcards for everything before understanding source structure.
- Do not use MCQ as a fake exam when the real exam is not MCQ.
- Do not infer unseen source content.
- Do not fill empty space with motivational or instructional UI copy.
- Do not redesign baseline interaction because a new subject has different content.
- Do not keep the only canonical engine/specification inside opaque ZIP/base64 chunks.