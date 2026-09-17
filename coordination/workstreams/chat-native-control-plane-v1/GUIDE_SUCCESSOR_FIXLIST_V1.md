# Guide Successor Fixlist v1

Status: ENCODED_AWAITING_FRESH_G_CANARY — DO NOT MARK RESOLVED YET
Owner: `chat-object-prometeo-chat-control-main`
Created from human correction on 2026-09-17.
Repair explicitly started by human on 2026-09-17 while the mass `/wc` wave was being launched.

Purpose: preserve the exact succession failures identified after a long guide chat hit its conversation limit, so the next `/g` does not reconstruct continuity too shallowly. The binding repair is now encoded in `GUIDE_SUCCESSION_PROTOCOL_V1.md`, `/g` v1.3, `p.txt` v4.9.2, Continuity Head and CHAT_OBJECT. Encoding is not proof: this debt remains open until a genuinely fresh `/g` canary demonstrates the required behavior.

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

Local/current gate observed in the prior handoff:
- `O-SWARM-PAGE-THREAD-BRIDGE-V1` lacked a terminal qualifying RETURN in the observed snapshot;
- its original attempt became stale;
- an append-only recovery attempt had STARTED;
- S2 local page integration must remain blocked until exact qualifying dependencies + Page Thread Bridge RETURN/DONE evidence exist.

This is historical handoff evidence, not a permanent claim. Every fresh guide must re-check its exact current state.

Architectural gap:
- even if a stale/recovery policy, scanner, allocator or readiness compiler exists, that does not prove an autonomous metabolism loop is invoking them and continuing work unattended.

## 4. Preserve truth-layer separation aggressively

Never collapse:

`IMPLEMENTED/CANDIDATE != TESTED/VERIFIED != PROMOTED != CURRENT != HUMAN ACCEPTED != SERVED`

Examples that must remain explicit:
- a Dynamic Readiness candidate passing tests does not itself prove a live dependency transition occurred;
- a recovery run in STARTED state does not prove recovery succeeded;
- return-directory existence does not prove a qualifying RETURN + DONE pair;
- many active/claimed workers do not prove useful autonomy.

## 5. Do not disguise an autonomy gap as “no human action required”

The human should not have to number workers, route jobs, transport results or manually merge routine page work.

However, saying “the human does not need to act” must not imply the system has proven autonomous continuation. Explicitly state whether the next cycle is actually self-triggered/self-allocated or whether chat/runtime invocation is still externally required.

## 6. Preserve the recovery-latency finding as a verification target

The predecessor discussion identified a material mismatch between the intended stale/recovery timing (roughly 20 min suspect / 30 min recovery-eligible) and a much longer observed real recovery delay (reported in-chat as roughly 8h22m for one case).

Before presenting that number as current fact, re-verify the exact run timestamps. The durable lesson is binding even if the exact duration changes:

**policy threshold != observed autonomous recovery latency**

The next guide must measure/verify the live path from stale detection to actual recovery action rather than assuming the written policy is the behavior.

## 7. Preserve the visible product loop

Do not solve coordination by ejecting the human into another app/shell/chat courier workflow.

The intended visible loop remains:

`human correction/intent -> Page Change Thread -> execution/local Planner -> micro-swarm -> local Steward -> verification -> durable result -> Page Change Feed -> host-routed preview/result -> same Universal Host surface`

The Universal Host remains the intended human-facing shell unless durable authority explicitly changes that decision. Page Thread Bridge is therefore both infrastructure and a product/UX continuity requirement.

## 8. Next `/g` handoff audit must be explicit

At reincarnation, before claiming continuity is restored, the guide must inspect at least:
- latest EPOCH / current main head;
- Continuity Head + FOCUS + CHAT_OBJECT;
- predecessor guide close/frontier and this fixlist;
- `GUIDE_SUCCESSION_PROTOCOL_V1.md`;
- exact active queues;
- claims/runs/returns/recovery claims/proposals;
- qualifying RETURN + DONE pairs for currently gating opportunities;
- Page Thread Bridge current state when it is still relevant;
- live readiness/allocator/metabolism evidence;
- whether later worker returns materially changed the predecessor's conclusions.

Then produce a compact handoff map:
- what is closed;
- what is candidate/verified/promoted/current/served;
- what is blocking or unproven;
- what changed since predecessor close;
- what can proceed autonomously now;
- what still requires an external wake/runtime/human action.

## 9. Metric correction

Do not optimize for “50 busy chats”.

Primary operational objective:
**useful durable verified progress per human intervention**, while keeping collisions, duplicate work, idle/filler work, stale latency and routine human routing low.

A large `/wc` wave is a means and a stress test, not the success criterion.

## 10. Production gate

Do not promote `/w` merely because `/wc` parallelism looks productive. Production remains evidence-gated through exact stress, critic, integration and live-loop receipts.

## 11. Repair encoding receipt

Encoded as of this repair pass:
- `coordination/workstreams/chat-native-control-plane-v1/GUIDE_SUCCESSION_PROTOCOL_V1.md` — binding succession protocol;
- `g` main — Prometeo Guide v1.3 with mandatory succession audit and open metabolism loop;
- `gh-pages/g/index.html` — public `/g` v1.3 entry;
- `p.txt` — Prometeo v4.9.2 stable bootstrap requires Guide Succession protocol/fixlist;
- `coordination/CONTINUITY_HEAD.json` — publication-time READY count is no longer live truth and guide-succession state is explicit;
- `CHAT_OBJECT.json` — guide succession is an explicit success condition/frontier.

These artifacts make the correction durable. They do **not** prove a fresh chat obeys them correctly.

## 12. Remaining closure canary

This fixlist may move to VERIFIED/RESOLVED only after a genuinely fresh `/g` demonstrates, without human reconstruction:
1. loads the protocol/fixlist and current durable state;
2. detects stale predecessor guidance/evidence drift;
3. distinguishes truth layers correctly;
4. preserves the broader metabolism loop separately from local gates;
5. states human-courier vs unattended-wake truth precisely;
6. executes one useful guide cycle;
7. persists any material correction;
8. does not ask the human to locate or summarize the exhausted predecessor chat.

Until then, status remains `ENCODED_AWAITING_FRESH_G_CANARY`.