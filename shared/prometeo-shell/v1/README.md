# Prometeo Global Shell v1

Shared owner-only floating shell for Prometeo GitHub Pages.

Activation on a browser/origin:

`?prometeo=1`

Disable without deleting notes:

`?prometeo=0`

Capabilities:
- V45-family floating puck with internal dimple.
- Long-press puck: start voice note immediately.
- Tap puck: navigation / notes / voice.
- Recording controls: pause/resume, save, delete.
- Save is local-first to IndexedDB; one recording = one note.
- Whisper Small Spanish transcription runs in a Web Worker.
- Queued audio survives page navigation and resumes on the next page.
- Notes keep page path/title/viewport context, can be edited, replayed, deleted and copied.
