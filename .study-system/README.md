# Prometeo Study System

Canonical entrypoint for reusable exam-study infrastructure.

## Current direction

For **new exam instances**, start with `v2/README.md` and follow `v2/AI_BUILD_PROTOCOL.md`.

Study System V2 is the readable engine/content contract created from the Modelos y Teorías II reference implementation. It separates reusable interaction from source-derived exam content and adds reusable capabilities such as mnemonic whiteboards.

## Historical material

`STUDY_SYSTEM_V1.zip.b64` and `chunks/` are preserved as V1 historical artifacts. Do not use their opaque packaging as the canonical pattern for new work.

## Rule for future AIs

Do not redesign the study interface from scratch when a new course/exam arrives. First load V2, inspect the current capability contracts, analyze the new sources, produce/validate an exam instance, and render it through the reusable system. A new UI direction belongs in a separate lab until accepted.