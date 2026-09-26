# 👾 Workers / Avatars · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- mass stress test
- stable worker identity
- state/liveness semantics outside body
- distance readability testing
- image-first modular collage instead of primitive geometric bodies

## IMPLEMENTED / AWAITING USER REVIEW
- Default review surface now shows ONE avatar at a time rather than 72/108 workers.
- The avatar is displayed much larger for visual judgment.
- Horizontal swipe changes to another candidate.
- Initial curated set is intentionally short: full body, legless, and head + hands.
- The old mass stress test is preserved as a hidden diagnostic via \`?mass=1\`, not as the default review UI.

## OPEN / NEXT REVIEW
- Judge whether each of the three avatars is visually strong enough, not merely structurally different.
- Check mobile-landscape scale and swipe feel.
- Refine asset combinations if any candidate looks weak, generic, or insufficiently creepy.
- After individual candidates are strong, re-evaluate them in mass without making mass the first review surface.

## REJECTED / DO NOT REVIVE
- Circle heads / rectangle torsos / stick limbs as final identity.
- Randomly changing worker identity each frame.
- Leading the review with a wall of 72/108 tiny examples before individual avatar quality is established.
