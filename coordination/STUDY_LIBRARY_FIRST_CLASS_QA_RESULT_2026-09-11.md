# Study Library — first-class QA result

Date: 2026-09-11

Canonical readiness handoff: `coordination/STUDY_LIBRARY_FIRST_CLASS_READY_2026-09-11.md`

GitHub Actions workflow: `.github/workflows/study-live-class-qa.yml`
Run: `34626683313`
Result: **SUCCESS**

Passed in the live run:

- JavaScript syntax for class-ready, V14 transcription, V14 quality fix, performance loader and Study Library loader;
- first-class structural/privacy invariants;
- required live request to `study-transcribe-v1`;
- backend reported `canonical-long-window` with 150000 ms window / 135000 ms step / 15000 ms overlap and Spanish language contract;
- real Whisper audio self-test completed successfully against the deployed backend.

The static class QA run immediately before it (`34626360069`) also passed.

Deployment reconciliation checked the canonical currently loaded Study Library first-class files on `main` and `gh-pages`: index, loader, class-ready JS/CSS, V14 transcription, V14 quality fix, V15 performance loader and public transcript-share surface are aligned by blob for the checked release.

This closes software/backend preflight for the first real class. Remaining acceptance evidence is physical/runtime only: actual classroom microphone/acoustics, simultaneous friends on separate devices, and hardware stylus behavior if used.
