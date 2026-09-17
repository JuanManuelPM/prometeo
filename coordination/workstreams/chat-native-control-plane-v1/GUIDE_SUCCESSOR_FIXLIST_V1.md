# Guide Successor Fixlist v1

Status: VERIFIED_FRESH_G_CANARY_PASS — CORE SUCCESSION DEBT CLOSED; POINTER REFRESH DEBT REMAINS
Owner: `chat-object-prometeo-chat-control-main`
Created from human correction on 2026-09-17.
Repair explicitly started by human on 2026-09-17 while the mass `/wc` wave was being launched.

Purpose: preserve the exact succession failures identified after a long guide chat hit its conversation limit, so the next `/g` does not reconstruct continuity too shallowly. The binding repair is encoded in `GUIDE_SUCCESSION_PROTOCOL_V1.md`, `/g` v1.3 and `p.txt` v4.9.2. A genuinely fresh `/g` canary has now demonstrated the binding behavior and persisted an exact receipt. The core succession-behavior debt is therefore VERIFIED. `Continuity Head`, `FOCUS` and `CHAT_OBJECT` may still contain older projection text until their next safe refresh; successors must treat that as pointer/projection staleness, not as evidence that the verified canary did not occur.

## 1. Core succession failure

A fresh guide must not jump from a generic/current FOCUS summary to “I understand the state” when the predecessor guide ended with a more specific unresolved frontier.

Required successor behavior:
1. recover the predecessor guide's durable close/frontier;
2. separate CLOSED / CANDIDATE / VERIFIED / PROMOTED / CURRENT / SERVED / BLOCKED / UNPROVEN / HUMAN_DECISION;
3. compare that close against evidence created after it;
4. repair stale durable guidance when authorized;
5. only then rewrite/present the current frontier.

A plausible reconstruction is not equivalent to verified continuity.

## 2. Do not lose the actual open control-loop

The predecessor's critical unresolved loop was not merely “launch more workers”. Preserve and explicitly test:

`durable work -> live state consumption -> allocator/readiness -> wake/claim -> next useful work -> visible/local integration`

The system already demonstrated broad worker generation and parallel execution. The important remaining question is whether completed work actually changes live readiness and causes the next actor/work to happen without a human courier or guide manually pushing every cycle.

## 3. Separate the local S2 gate from the architectural metabolism gap

Do not collapse these into one statement.

Historical local gate from the predecessor handoff:
- `O-SWARM-PAGE-THREAD-BRIDGE-V1` lacked a terminal qualifying RETURN in the observed snapshot;
- its original attempt became stale;
- an append-only recovery attempt had STARTED.

Fresh-canary correction:
- exact later evidence showed a recovered Page Thread Bridge run reached terminal `DONE` with a durable `RETURNED_CANDIDATE` and preserved recovery lineage;
- control-plan and Alumnos local integrations later reached terminal `DONE` as scoped local candidates;
- Prometeo móvil and Facultad Digital local integrations became dynamically-ready and started;
- therefore the old statement “S2 is blocked on Page Thread Bridge” is stale and must not be repeated as current truth.

Architectural gap still open:
- even if stale/recovery, readiness, allocator, Page Thread and local integrations each have candidate/verified evidence, that does not prove an autonomous metabolism loop is invoking them and continuing work unattended.

## 4. Preserve truth-layer separation aggressively

Never collapse:

`IMPLEMENTED/CANDIDATE != TESTED/VERIFIED != PROMOTED != CURRENT != HUMAN ACCEPTED != SERVED`

Examples that must remain explicit:
- a Dynamic Readiness candidate passing tests does not itself prove a live end-to-end readiness/wake transition;
- a recovery run in STARTED state does not prove recovery succeeded;
- return-directory existence does not prove a qualifying RETURN + DONE pair;
- many active/claimed workers do not prove useful autonomy;
- a terminal local integration candidate does not self-promote product Current, Human Accepted or Served.

## 5. Do not disguise an autonomy gap as “no human action required”

The human should not have to number workers, route jobs, transport results or manually merge routine page work.

However, saying “the human does not need to act” must not imply the system has proven autonomous continuation. Explicitly state whether the next cycle is actually self-triggered/self-allocated or whether chat/runtime invocation is still externally required.

Fresh-canary result: no human result transport or manual worker routing was required for the guide recovery, but unattended wake/event-loop continuation remains UNPROVEN and external chat/runtime invocation can still be required.

## 6. Preserve the recovery-latency finding as a verification target

The predecessor discussion identified a material mismatch between the intended stale/recovery timing (roughly 20 min suspect / 30 min recovery-eligible) and a much longer observed real recovery delay in at least one earlier discussion.

Before presenting any old latency number as current fact, re-verify exact run timestamps. The durable lesson remains binding:

**policy threshold != observed autonomous recovery latency**

The guide must measure/verify the live path from stale detection to actual recovery action rather than assuming the written policy is the behavior.

## 7. Preserve the visible product loop

Do not solve coordination by ejecting the human into another app/shell/chat courier workflow.

The intended visible loop remains:

`human correction/intent -> Page Change Thread -> execution/local Planner -> micro-swarm -> local Steward -> verification -> durable result -> Page Change Feed -> host-routed preview/result -> same Universal Host surface`

The Universal Host remains the intended human-facing shell unless durable authority explicitly changes that decision. Page Thread Bridge is therefore both infrastructure and a product/UX continuity requirement.

## 8. `/g` handoff audit remains binding

At reincarnation, before claiming continuity is restored, the guide must inspect at least:
- latest EPOCH / current main head;
- Continuity Head + FOCUS + CHAT_OBJECT;
- predecessor guide close/frontier and this fixlist;
- `GUIDE_SUCCESSION_PROTOCOL_V1.md`;
- exact active queues;
- claims/runs/returns/recovery claims/proposals;
- qualifying RETURN + DONE pairs for currently gating opportunities;
- Page Thread Bridge current state when relevant;
- live readiness/allocator/metabolism evidence;
- whether later worker returns materially changed predecessor conclusions.

Then produce a compact handoff map:
- what is closed;
- what is candidate/verified/promoted/current/served;
- what is blocking or unproven;
- what changed since predecessor close;
- what can proceed without human routing/transport;
- what still requires an external wake/runtime/human action.

## 9. Metric correction

Do not optimize for “50 busy chats”.

Primary operational objective:
**useful durable verified progress per human intervention**, while keeping collisions, duplicate work, idle/filler work, stale latency and routine human routing low.

A large `/wc` wave is a means and a stress test, not the success criterion.

## 10. Production gate

Do not promote `/w` merely because `/wc` parallelism looks productive. Production remains evidence-gated through exact stress, critic, integration and live-loop receipts.

## 11. Repair encoding receipt

Encoded repair inputs:
- `coordination/workstreams/chat-native-control-plane-v1/GUIDE_SUCCESSION_PROTOCOL_V1.md` — binding succession protocol;
- `g` main — Prometeo Guide v1.3 with mandatory succession audit and open metabolism loop;
- `gh-pages/g/index.html` — public `/g` entry;
- `p.txt` — Prometeo v4.9.2 stable bootstrap requires Guide Succession protocol/fixlist;
- `coordination/CONTINUITY_HEAD.json` — projection/pointer, must be refreshed against exact current evidence;
- `CHAT_OBJECT.json` / `FOCUS.json` — durable role/frontier projections, likewise subordinate to exact newer evidence when stale.

Verified fresh-canary receipt:
- `coordination/workstreams/chat-native-control-plane-v1/GUIDE_SUCCESSION_CANARY_20260917T1046_SOL56_V1.json`
- creation commit: `91ffcca1d99894e68aff1738fa5ef3f22986e4c9`

The canary proved fresh-guide recovery behavior; it did not promote any product bytes, architecture candidate, production `/w`, Human Accepted or Served authority.

## 12. Fresh-guide canary result

VERIFIED on 2026-09-17 by a genuinely fresh `/g` invocation without human reconstruction.

The canary demonstrated:
1. loaded the protocol/fixlist and current durable state;
2. detected stale predecessor guidance/evidence drift;
3. distinguished truth layers correctly;
4. preserved the broader metabolism loop separately from local gates;
5. stated human-courier vs unattended-wake truth precisely;
6. executed a useful guide cycle by re-deriving the live frontier from newer exact evidence;
7. persisted the material correction as a durable canary receipt and this fixlist update;
8. did not ask the human to locate or summarize the exhausted predecessor chat.

Material drift detected by the canary included:
- Page Thread Bridge recovery terminalized after the predecessor snapshot;
- control-plan and Alumnos local integrations completed as scoped candidates;
- Prometeo móvil and Facultad Digital local integrations started after dynamic activation;
- the GEN2 two-generation Planner canary produced exact durable N+1/N+2 evidence without human task wording between generations;
- the compounding-gate verifier became dynamically ready and started.

## 13. Remaining pointer-refresh debt

Core guide-succession behavior is VERIFIED. Do not regress it.

Remaining housekeeping debt is narrower: refresh `Continuity Head`, `FOCUS` and `CHAT_OBJECT` when a safe CAS window exists so their projected status stops saying `ENCODED_AWAITING_FRESH_G_CANARY` and reflects the post-canary frontier. Until then:
- exact newer evidence + this fixlist + the canary receipt supersede those stale projection strings;
- do not call stale projection text current merely because it lives in a canonical pointer file;
- do not confuse this pointer refresh debt with the still-open global autonomous-metabolism proof.
