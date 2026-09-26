# 👾 Workers / Avatars · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- mass stress test
- stable worker identity
- state/liveness semantics outside body
- distance readability testing
- image-first modular collage instead of primitive geometric bodies
- default review shows ONE large avatar at a time
- horizontal swipe across a short curated set

## IMPLEMENTED / AWAITING USER REVIEW
- Removed the rectangular portrait photographs from the visible avatar candidates.
- Removed the scanned anatomy hand plates that visibly carried white rectangular backgrounds.
- Visible candidate assets are now alpha cutouts only:
  - a new transparent mask cutout;
  - one transparent photographic hand reused via flip/rotation;
  - the existing transparent Prometeo mask.
- Current three morphologies remain intentionally short:
  1. mask + body, with hands reused as arms/legs;
  2. legless mask + torso + floating hands;
  3. head + hands only.
- Remote cutouts have a local transparent-mask fallback so failed loading does not intentionally expose a rectangular source plate.
- Hidden mass diagnostic remains at `?mass=1`.

## OPEN / NEXT REVIEW
- Verify on the real published phone render that there are no visible rectangular image bounds.
- Judge whether the new mask and hand composition is visually compelling enough.
- If it still feels assembled rather than creature-like, reduce or reposition pieces instead of adding clutter.
- Continue preferring strongly cut-out masks/hands/objects with transparent outer silhouettes.

## REJECTED / DO NOT REVIVE
- Circle heads / rectangle torsos / stick limbs as final identity.
- Randomly changing worker identity each frame.
- Leading the review with a wall of 72/108 tiny examples.
- Any source image whose square/rectangular photo or scan background remains visible in the final avatar.
- Portrait rectangles and white anatomy-plate rectangles used as collage pieces.
