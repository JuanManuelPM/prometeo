# PROMETEO WORKSPACE PROTOCOL V1

Status: CURRENT interaction protocol for Control Room V11 candidate.

A workspace is a human projection of an existing Prometeo thing. It is not a new source owner.

## Identity

Prefer an existing stable identity in this order:

1. Catalog `page_id` for a page/surface.
2. Organism/Semantic `node_key` for a system entity.
3. Existing durable Visual front id.
4. Existing Work Context key.
5. `UNPLACED` only when no durable address exists; never invent a canonical identity silently.

## Durable inputs

A workspace may project:

- Catalog identity and writable target;
- Current Tree / Semantic Registry status;
- Organism relationships;
- Work Context continuity;
- Page Change Thread captures, attachments and execution results;
- domain source-owner state;
- Visual front state/feedback/versions/assets/decisions;
- Work Graph / allocator execution state.

The projection never overrides those owners.

## Human loop

Normal V11 interaction is:

`LOOK → NOTE/TALK/ATTACH → HACER → existing worker pool → RETURN → same Page Change feed → HUMAN REVIEW`

Text, audio and files are captured in the existing Page Change/Capture system.

`HACER` freezes the currently unworked selection into an Execution Packet. New feedback after that belongs to the next generation and must not silently mutate the packet already being executed.

## Worker loop

V11 does not dispatch a special worker family.

WORKER_POOL packets are projected into the existing allocator/frontier as ordinary claimable opportunities. The winner retrieves private context only after durable claim, executes the existing Agent Execution Protocol, writes the canonical sanitized RETURN, and re-enters normal allocation.

## Acceptance

A successful worker RETURN can create a candidate and evidence.

It does not by itself mean:

- Human Accepted;
- Served;
- CURRENT architecture;
- canonical promotion.

## Manual fallback

`↻ REENCARNAR` remains available for difficult interactive work. Manual chat and automatic workers must consume the same source owners and leave compatible durable results.

## Abandonment law

No workspace may depend on one chat remembering prior work. If a chat disappears, durable source owners + Page Change/Page Memory + GitHub evidence must be enough to continue.
