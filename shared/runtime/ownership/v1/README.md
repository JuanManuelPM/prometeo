# Runtime Ownership v1 — candidate

This primitive makes two previously informal laws executable without coupling them to a particular Navigator or page.

## Gesture ownership

- At most one active generic gesture owner.
- A second acquire fails closed with `PROMETEO_INPUT_OWNER_CONFLICT`.
- Tokens carry a generation; after route/runtime invalidation, stale tokens cannot release or regain authority.

## Focus Lease

- Focus leases nest explicitly.
- A child lease must name the current top lease as parent.
- Release is LIFO.
- Releasing a stale generation cannot restore focus.
- The core returns a semantic `restoreKey`; the host resolves it against the current DOM/layout instead of keeping a stale element reference.

## Semantic Return / Exact Back

`semantic-return.js` captures route/page/item/anchor/focus/scroll-owner identity first. Old scroll pixels are advisory data passed only after the semantic scroll owner is resolved for the current viewport.

This module does not replace the Human Accepted V23 navigation physics. It is a candidate service for future integration through an adapter.
