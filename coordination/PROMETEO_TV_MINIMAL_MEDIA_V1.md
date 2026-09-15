# Prometeo TV — Minimal Media V1

Status: ACTIVE EXPERIMENT / NOT HUMAN ACCEPTED

Human direction: keep the TV/control experiment minimal and prove one direct action at a time. For now use one page that contains both the visual output and the control; split TV and phone into separate pages only after the interaction is solid.

First interaction only:
- one search field;
- typing a song/video query silently pre-resolves the first YouTube result after a short idle delay;
- pressing Play or Enter uses the prepared result when available;
- the first result opens in the visual area and requests autoplay;
- no ChatGPT or AI participates in this path.

Implementation:
- Public page: `experiments/prometeo-tv-simple/`
- Backend: `prometeo-tv-media-v1`
- YouTube resolution uses the existing connected Google/YouTube OAuth and the official YouTube Data API search endpoint; results are cached to reduce quota use.
- A scoped lab capability is passed in the URL fragment and stored locally after first opening; it is not embedded in the public source.

Future split: the exact same `search -> prepared video -> play` semantic action should later emit to the paired TV room rather than render locally. Do not add QR, multiplayer, worker panels, navigation, games, or other controls to this minimal page until this first interaction is physically validated.
