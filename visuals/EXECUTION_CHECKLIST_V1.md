# PROMETEO VISUAL EXECUTION CHECKLIST V1

Status: CURRENT.

Every visual worker/chat must follow this sequence.

## 0. Inspect reality
Before editing:
- inspect the actual target file;
- inspect related existing Prometeo visual systems;
- read `visuals/VISUAL_PROTOCOL_V1.md`;
- read `visuals/VISUAL_FEEDBACK_LOG_V1.md`;
- identify what is technically reusable vs visually rejected.

Never assume prior chats completed what they claimed.

## 1. READBACK before code
Before making changes, write a concise 5-part readback:
1. What the user is actually asking for.
2. What the current implementation gets wrong.
3. What will be preserved.
4. What will be discarded/rebuilt.
5. What visible difference will prove this iteration is genuinely better.

Do not begin implementation until this mental model is clear.

## 2. Reference/asset pass
If visual identity depends on imagery:
- inspect existing repo assets first;
- inspect existing Coliseo/material systems;
- use the Pinterest image search lab when useful:
  - `demos/pinterest-image-query-lab-v1/`
  - `supabase/functions/pinterest-image-search-v1/`
- gather multiple candidates, not the first acceptable asset;
- prefer assets with strong silhouette/material identity;
- document source/licensing where external assets are used.

## 3. Build the visual still first
Ask:
"If animation stopped right now, is the screenshot already interesting?"

If no, improve assets/composition before adding more effects.

## 4. Implement the mechanism
Use code to:
- move;
- repeat;
- project;
- mask;
- crop;
- layer;
- occlude;
- transition;
- interact.

Do not use code to crudely draw the main art when an image asset should do it.

## 5. Mobile check
Ensure:
- landscape mobile works;
- touch targets are usable;
- no tiny essential controls;
- no accidental scroll/gesture conflicts;
- performance remains cheap;
- the main composition reads at phone size.

## 6. Regression check
Explicitly verify known feedback:
- no primitive placeholder characters;
- no wireframe/ellipse-only worlds;
- no generic fake-terminal HUD;
- no black hole under Spaces camera;
- no strafe where yaw was requested;
- no fragmented-image fake glitch in Trail;
- no single nearly invisible hand in Player.

## 7. SELF-CRITIQUE before publish
Before delivery, write 3 short points:
- what materially improved;
- what still feels weak;
- what you would try next if this iteration is rejected.

If you cannot identify a material visual improvement, do not publish yet.

## 8. Publish and verify
- validate syntax;
- publish identical content to `main` and `gh-pages`;
- verify both blobs/content match;
- verify the intended route exists;
- never claim visual/browser verification you did not actually perform.

## 9. Delivery
Return:
- public URL;
- one short paragraph describing the material visual change;
- no inflated claims of completion.

## Rejection gate
Do NOT mark ready for review if:
- it looks like a tech demo instead of a visual work;
- the iteration mainly changed UI labels/modes;
- the main image/scene is weak before animation;
- it repeats a documented rejected behavior;
- a stronger existing Prometeo technique was ignored without reason.


## 10. Durable reincarnation handoff

For fronts that have a `visuals/fronts/<front>/` package, follow `visuals/REINCARNATION_PROTOCOL_V1.md`.

A completed update must persist:
- state;
- accepted baseline vs current candidate;
- accumulated feedback;
- meaningful version history;
- asset/provenance changes;
- durable decisions;
- regenerated handoff.

Assume the chat will be abandoned immediately after delivery. If a fresh chat cannot continue from the handoff + repo alone, the task is incomplete.
