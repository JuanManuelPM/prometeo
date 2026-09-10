# Study System V2 — Blueprint

## Product objective

A source-grounded study surface that helps answer the real exam, not merely read a summary. At all times it must answer:

1. **What exists?** — complete coverage map.
2. **What do I actually understand / remember?** — persistent mastery.
3. **Can I produce it under exam conditions?** — practice shaped by the actual exam.

## Fixed pedagogical architecture

### OVERVIEW
Compact, scannable map of all required material. Closed modules/topics expose the complete inventory without explanatory UI prose.

### UNDERSTAND
Opening a topic reveals connected meaning, not isolated flash-card prose. Every important topic should contain:

- `anchor` — shortest reconstructive cue;
- `summary` — compact connected account;
- `explanation` — enough context to rebuild the theory;
- `relations` — causes, links, sequence or structure;
- `do_not_confuse` — nearest conceptual trap;
- `exam_use` — what the learner should be able to do;
- `source_refs`.

### RECALL
Atomic elements retrieve knowledge without looking: names, definitions, sequences, categories, distinctions, formulas, events. A completion check means **“I can retrieve this without looking”**, not “I read it”.

### PRODUCE
Practice mirrors the cognitive operation of the real exam: development, cases, problems, oral explanation, drawings, derivations, etc. Multiple choice is allowed when absent from the real exam only as a **coverage/discrimination radar**, never as a fake simulation.

## Mastery dimensions

The engine may track these underneath a simple UI:

- `recognition` — identify it when seen;
- `recall` — retrieve without seeing;
- `explanation` — explain coherently;
- `discrimination` — distinguish from neighboring concepts;
- `application` — use in a case/problem;
- `integration` — combine with other concepts.

A single visible check may initially represent `recall`; richer mastery must not make the interface noisy.

## Transversal map

Do not hard-code “history” as universal. Each exam instance may define one or more `transversal_maps` that solve the hardest cross-topic memory relation.

Examples: `author → contribution → school → revolution`, `event → cause → consequence`, `structure → function → lesion`, `theory → method → object → critique`.

Each transversal group combines a short connected summary with recall atoms beneath it. This prevents the atomized-checklist problem.

## Information density

**Closed state is dense; open state is generous.**

- Closed modules show full topic inventory.
- Closed topics may show title + anchor + mnemonic thumbnail.
- Open topics may become a large reading/working surface.
- Desktop and mobile are separately composed, not scaled copies.
- Avoid one full-width row per tiny atom on desktop when a compact matrix is clearer.

## Visual system

### Two-color invariant
Every theme contains exactly:

```json
{"background":"#...","ink":"#..."}
```

No third semantic/accent color. Glow, when used, uses the same `ink` and only for a true state signal such as progress fill.

### Typography
One family per surface, a small explicit scale, and few real weights. Within one header/toolbar, functional text shares optical size and weight unless hierarchy is deliberate.

### Interactive honesty
Anything that looks like a control must act like one. Informational chips must not masquerade as buttons.

### Copy rule
Do not add generic UI prose such as “welcome”, “your journey”, “master sheet”, “prepare”, “start your path”, “first look at what enters”. The study content itself is the page.

## Persistent header

Recommended order:

`course title | mastery % + progress | mastered/total | theme | countdown`

- progress derives from persistent mastery nodes;
- countdown exists only while exam datetime is in the future;
- after the exam it disappears;
- header uses one typographic voice.

## Persistence

Namespace all state by `instance_id`:

```text
study:v2:<instance_id>:settings
study:v2:<instance_id>:mastery
study:v2:<instance_id>:topic:<topic_id>:board
study:v2:<instance_id>:topic:<topic_id>:note
```

Theme changes, resize and orientation changes must not destroy study state.

## Capability model

Baseline capabilities:

- `themes_two_color`
- `mastery_progress`
- `countdown`
- `transversal_map`
- `practice`
- `mnemonic_whiteboard`

Experimental candidates may include audio dialogue, spaced resurfacing, oral recall, camera/imported handwriting, adaptive gap queues and spatial maps. Experiments do not silently become baseline.

## Definition of done for an exam instance

Rendering HTML is not enough. The instance is complete when source authority is resolved, scope and exam operations are explicit, the coverage map accounts for relevant concepts, explanations are connected, recall atoms cover easy-to-omit details, practice matches the real exam, high-stakes claims trace to sources, desktop + touch pass, and persistent state survives reload/resize.