# Prometeo New Minimal Shell — Seed Notes / Planner Test

Date: 2026-09-14
Status: ACTIVE DESIGN TEST / NOT HUMAN ACCEPTED

## Purpose

This file records the seed set loaded into Capture V12 so a future chat can understand what the human is trying to reorganize without relying on old conversation history.

The human wants to leave the old Prometeo as accessible legacy and begin a smaller Prometeo centered on a few clear tools. The immediate goal is not to finish every historical workstream. It is to create a minimal, navigable new shell that can host new tools while keeping old pages reachable.

The seed is deliberately written as heterogeneous raw notes. The Planner is expected to reorganize them into a small number of coherent jobs instead of treating every note as one job.

## Seed notes

1. Start a new Prometeo that is much smaller and simpler. The home should not try to expose the entire old system. It should be a clean entry into a few clear tools and new work.

2. Temporarily leave the complex spatial/button navigation aside. Use a simple folders/list navigator for now. A more polished spatial control can return later without blocking the product.

3. Preserve access to old Prometeo and all useful historical pages through a Legacy area. Legacy must remain reachable without being automatically promoted to Current.

4. Create a Tools folder. Every tool should have one clear function and its own simple page. Avoid dashboard clutter in the new home.

5. Create Voice → Text from the accepted Capture donor: MediaRecorder-first, raw audio durable before ASR, local Whisper, Spanish forced, Small with Base fallback, nonblocking transcription. Later experiments may try more-live/partial transcription without breaking the accepted baseline.

6. Create Text → Voice as a separate tool. Recover the actual donor/page already being developed elsewhere before rebuilding it. It should work simply from phone and PC.

7. Prometeo Live / TV becomes a principal tool: a universal large-screen host for pages, dashboards, video, games, worker previews, and multiple surfaces.

8. Add a direct Remote mode for Live without AI in the loop: QR from the TV, phone joins the exact room/session, direct control of surfaces/video, later multiplayer/friends.

9. Calendar becomes a clear tool in the new Prometeo. Recover the best existing Calendar rather than rebuilding blindly, preserving useful Month/Week/Day/event-identity behavior where actually available.

10. Student World, José, PageKit, Class Player and whiteboard remain valuable but should not make the new home huge. Keep them accessible under Projects/Legacy or specialized tools, preserving their best donors.

11. New tools should be cheap to add: register title, route, one-line function and status, and have them appear in the correct folder without redesigning navigation.

12. Visual law: mobile-first, few words, flat surfaces, depth only on manipulable controls, function visible through interaction rather than giant titles or decorative panels.

## Expected Planner behavior

Do not hard-code this grouping into the Planner. It is a QA expectation only.

A strong Planner output would likely produce roughly these jobs:

### Job A — Minimal new Prometeo shell / registry / legacy access
Sources: 1, 2, 3, 4, 11, 12.
Outcome: simple folder/list shell, small tool registry, Legacy access, no forced spatial-control redesign.

### Job B — Audio tools
Sources: 5 and 6.
Outcome: Tools/Audio area with two separate focused pages or siblings: Voice→Text and Text→Voice, both recovered preserve-first from real donors.

### Job C — Prometeo Live + Remote / Rooms
Sources: 7 and 8.
Outcome: universal Live host plus QR/direct realtime remote channel, keeping AI optional rather than mandatory for remote actions.

### Job D — Calendar tool
Source: 9.
Outcome: recover and expose best existing Calendar through the new shell; avoid clean-slate rebuild unless evidence requires it.

### Job E — Projects / legacy specialized surfaces
Source: 10, possibly merged into Job A if the Planner can keep scope small.
Outcome: make Student World / José / PageKit / Class Player / whiteboard reachable without promoting them into the primary home or rebuilding them merely for navigation.

The exact number of jobs is not authoritative. Planner should choose boundaries based on current repo/runtime evidence and dependencies.

## What remains legacy / outside the new core

Historical Prometeo navigation physics, V50/V53 spatial browser work, Student World/José, PageKit/Class Player/whiteboard, Finance/Auth integration, Recovery Sweep artifacts, Factory and other historical pages may remain accessible. They should not automatically become first-level items in the new minimal shell.

The new shell is an additive reset in UX, not destructive deletion of historical work.

## Capture V12

Served entry:

`https://juanmanuelpm.github.io/prometeo/experiments/capture-lab/?v=12`

On first V12 load in a browser profile:

- existing active Capture notes are backed up locally under `captureLabBackupBeforeReorgV12`;
- existing note IDs are archived from the active V9/V11 inbox, not deleted;
- the 12 seed notes are inserted as the only active reorganization notes;
- V11 copy-only handoff behavior remains active;
- dragging global **Preparar** should create one `PROMETEO PREPARE` packet and copy it to the clipboard;
- the human then pastes that tiny handoff into a fresh ChatGPT Planner chat.

Do not treat the Planner output as accepted until the human inspects the generated jobs.
