# Prometeo Page Watch Protocol v1

Status: CANARY / human-facing navigation contract

Purpose: let Prometeo Live act as the human's compact page shelf. The human chooses which pages are active; inactive pages remain stored in a collapsed library. User-visible page changes produce a tiny durable notification that becomes read when the page is opened in Live.

## Source of truth

Registry: `coordination/live/PAGE_WATCH_REGISTRY_V1.json`
Public projection: `gh-pages/live/pages.json`

The registry contains only public-safe page metadata. It is not product authority and does not promote Candidate/Current/Human Accepted/Served state.

## Page record

Each page has:
- `id`: stable slug
- `title`: short human title
- `url`: exact public URL
- `folder`: short library group
- `status`: `current`, `candidate`, `reference`, or `archive`
- `revision`: stable revision fingerprint; prefer immutable blob/hash/commit when known
- `changed_at`: ISO-8601 timestamp of the latest human-relevant visible change represented here
- `change_id`: short durable ID `P###`
- `change_note`: one short human sentence, normally <= 90 characters

## Human-active selection

Active/inactive is deliberately local human state stored by Live in the browser. Workers MUST NOT decide what the human keeps active unless the human explicitly asks. Newly registered pages go to the stored/inactive library by default.

## Read/unread semantics

Live stores the last seen `revision` per page locally. A page is unread when its registry revision differs from the revision the human last opened. Opening the page marks that exact revision seen. First installation baselines existing pages as seen so old catalog history does not create notification spam.

## Worker update law

When a `/wc` materially changes a public user-visible page or publishes a new reviewable page:
1. finish the page work and obtain the strongest available exact revision fingerprint;
2. re-fetch this registry with CAS;
3. add or update exactly that page record;
4. allocate the next unused `P###` from `next_change_number`, then increment it;
5. set a very short `change_note` describing what the human can notice, not implementation telemetry;
6. never update the registry for internal-only refactors with no human-visible effect;
7. continue normal RETURN/re-entry.

A page change notification is informational evidence only. It is never Human Acceptance.

## Guide continuity

`/g` should load this registry when the human refers to `P###`, a page title, or a recent page-change note. The human should be able to say `lo de P014` without pasting anything.

## Minimalism

Live should show page-change details only on demand: a dot/count in the menu, page title, optional `P### · change_note`, and the page itself. Technical refs stay hidden.