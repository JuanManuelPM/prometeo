---
name: visual-reference-discovery
description: "Experimental, evidence-first visual reference search and refinement from user-supplied images. Scope: Pinterest Papercraft Experiment 01; reusable methodology, NOT installed as an account skill."
status: CANDIDATE_NOT_INSTALLED
---

# PROMETEO · Visual Reference Discovery · Candidate Skill v0.1

## Goal
Given 1-4 user-supplied image references, find *real* visually relevant public results, identify niche terminology, compare query variants, distinguish templates from finished-object photos, retain decisions and provenance, and export reproducible evidence. Do not confuse search result titles with image-level proof.

## Entrypoint / Reference implementation
- Public candidate: \`demos/pinterest-image-query-lab-v1/visual-discovery/index.html\`
- Search executor: \`demos/pinterest-image-query-lab-v1/visual-discovery/engine.js\`
- Original owner (preserve): \`demos/pinterest-image-query-lab-v1/index.html\`
- Original Edge Function (reuse, do not fork): \`supabase/functions/pinterest-image-search-v1/index.ts\`
- State: browser localStorage + user-exported JSON. Do **not** claim cross-device persistence.

## Operational contract
1. **Inspect inputs**: detect subject, artifact type, output format, geometric structure, cut/fold/glue language, authors or IP, aesthetic, languages and constraints. Cite source when named attribution is discovered.
2. **Generate diverse search families**: exact title/creator, geometry, format, construction method, aesthetics, communities, multilingual vocabulary. Preserve which reference caused each query.
3. **Run real image search**: use previously authorized Pinterest Edge Function or an actually connected live image search tool; cap concurrency and enforce request budget. Log every query, returned count, duplicates, wall time, failure, source and timestamp. Never count unexecuted proposals.
4. **Validate provenance**: store original Pin/source URL and image URL; distinguish first-party/original creator from repins and aggregators; detect unavailable images. No fake image URLs, thumbnails or counts.
5. **Score clearly**: lexical heuristics use text, low-resolution pixel probes use actual browser-readable image pixels, human KEEP/REJECT overrides heuristic. Do not call weak image-color detection CLIP or neural computer vision.
6. **Refine**: use best-*measured* query variants and explicit user selections; mutate terminology one factor at a time when feasible. Compare early precision (top 10/20), diversity, duplicate rate, image errors, source quality. Pause with an honest failure after consecutive upstream errors.
7. **Present**: show direct clean images, source links, query explanation, reject/keep/similar controls, filters, no Pinterest iframe and no removal of embedded creator marks.
8. **Export**: JSON with seed metadata, query executions, errors, results, timestamps, selections, scoring limitations and schema version. Don't leak private attachments into public repos without user permission.
9. **Papercraft quality gates**: label \`confirmed printable\` only after full template, tabs, cut/fold lines, component completeness and A4 fit have been genuinely checked, and \`physically verified\` only after construction. A thumbnail alone is always \`candidate\`.
10. **License boundary**: public visibility is not reuse permission. Link third-party works and respect attribution. For a distributed gift collection use owner-approved templates or original geometric patterns.

## Human input
Only the original reference image(s) are required to start. User KEEP/REJECT choices improve results but should not be obligatory.

## Query and evaluation budget
- initial 80: 20 per reference (interleaved);
- optional adaptive 40: prioritize queries that yielded relevant results;
- max 20 Pin results per Edge Function query currently;
- up to 2400 raw slots, not guaranteed unique or reachable;
- first 50 searches auto-start on page load to demonstrate without manual commands;
- 4 consecutive failures trigger a pause rather than fabricated success.

## Truth / measurement boundaries
- The current code implements **weak lexical + optional pixel heuristics**, NOT a pretrained image embedding network; no automatic geometric fabrication or completed papercraft guarantee.
- Precision cannot be certified by its own heuristic scores. Report user-labeled Precision@20 and samples reviewed independently.
- Backend active deployment status does not prove current search success. Use new actual API responses and live served bytes as release gates.
- Search results from public Pinterest are subject to availability, rate controls, provider layout/endpoint change and local browser CORS.
- Treat this candidate as an experiment until the tests below are passed. Do not describe as installed skill.

## Acceptance tests
1. Four exact reference images are shown and linked to source authors/pages.
2. Native endpoint returns Pin IDs, \`i.pinimg.com\` image links, original Pinterest URLs.
3. Normalized result count equals actual API records; no placeholder results counted.
4. Duplicate Pin IDs are removed; reported "recibidas" and "únicas" differ when duplicates occur.
5. User selects KEEP, REJECT, reloads page: state preserved.
6. User selects SIMILARES: **actual** request executes, not merely a proposed string.
7. Consecutive upstream errors: pause, readable diagnostic, no false completed state.
8. Export/import schema can reconstruct experiment without contacting API (import is planned, not yet implemented; this is a pending gate).
9. Responsive mobile and desktop views; no unexpected horizontal overflow, source URLs open separately.
10. Verify live GitHub Pages served bytes and API via independent smoke test, not only source SHA.

## Next implementation iteration
- Import JSON + IndexedDB for large collections / cross-session.
- OpenCLIP/SigLIP or equivalent **real** model with reproducible model ID/weights, calibrated human-labeled reference set, and independent precision metrics.
- Cross-provider discovery, legitimate API keys kept server-side and provider ToS-respecting rate controls.
- Geometric-template analyzer: segment cut lines, tabs, parts and topology; printable-quality decisions based on explicit evidence.
- User-owned model-factory output original A4 templates and physically test before calling them verified.
