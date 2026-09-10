# Whiteboard interaction V3

The mnemonic whiteboard is an additive capability. It never replaces the study hierarchy.

## Closed study state

The original hierarchy remains unchanged:

`module summary -> topic cards -> topic detail`

Every visible topic card receives one small whiteboard footer. The footer is always visible while the topic card itself is visible, even when topic detail is closed.

Before drawing, the footer contains a small empty-board glyph plus `pizarrón`. After drawing, the glyph is replaced by the drawing thumbnail. The thumbnail is therefore part of topic review, not a separate gallery.

## Drawing state

Tapping/clicking the footer or thumbnail opens a fixed, almost-fullscreen workspace independent of the topic grid. The study page remains behind it unchanged.

The workspace uses all available viewport area: compact top identity/tool bar + canvas occupying the remaining viewport. On close, state persists and the topic immediately returns to its small thumbnail card.

## Rules

- Opening the whiteboard must not require first opening the topic explanation.
- Opening/closing the whiteboard must not modify topic mastery.
- Closing the whiteboard must not close/open/restructure the study topic.
- The whiteboard cannot be hidden merely because the topic detail is closed.
- Drawing state is vector data; thumbnail is derived and auto-cropped for mnemonic visibility.
- The capability must mount robustly even if the host study DOM is constructed asynchronously.