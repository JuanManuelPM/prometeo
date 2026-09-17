# Prometeo Page Watch Protocol v1

Status: CANARY / human-facing navigation contract

Purpose: let Prometeo Live act as the human's compact page shelf. The human chooses which pages are active; inactive pages remain stored in a collapsed library. User-visible page changes produce a tiny durable notification that becomes read when the page is opened in Live.

## Source of truth

Registry: `coordination/live/PAGE_WATCH_REGISTRY_V1.json`
Public projection: `gh-pages/live/pages.json`
Identity/continuity law: `coordination/pages/PAGE_PLATE_PROTOCOL_V1.md`
Guide request/publication law: `coordination/pages/PAGE_REQUEST_PUBLICATION_PROTOCOL_V1.md`

The registry contains only public-safe page metadata. It is not product authority and does not promote Candidate/Current/Human Accepted/Served state.

## Page record

Each page has:
- `plate`: permanent human reference shaped `AAA000`; identifies the page across revisions/chats
- `id`: stable internal slug
- `title`: short human title
- `url`: exact public URL
- `folder`: short library group/path
- `status`: `current`, `candidate`, `reference`, or `archive`
- `revision`: stable revision fingerprint; prefer immutable blob/hash/commit when known
- `changed_at`: ISO-8601 timestamp of the latest human-relevant visible change represented here
- `change_id`: short durable notification ID `P###`
- `change_note`: one short human sentence, normally <= 90 characters
- `context_path`: deterministic page-continuity handle `coordination/pages/contexts/<PLATE>.json`

`plate` and `change_id` must never be confused: `CAL001` means the Calendar page; `P018` means one visible Calendar change/notification.

## Human-active selection

Active/inactive is deliberately local human state stored by Live in the browser. Workers MUST NOT decide what the human keeps active unless the human explicitly asks. Newly registered pages go to the stored/inactive library by default.

## Read/unread semantics

Live stores the last seen `revision` per page locally. A page is unread when its registry revision differs from the revision the human last opened. Opening the page marks that exact revision seen. First installation baselines existing pages as seen so old catalog history does not create notification spam.

## Worker update law

When a `/wc` materially changes a public user-visible page or publishes a new reviewable page:
1. resolve/follow its page plate and context under `PAGE_PLATE_PROTOCOL_V1.md`;
2. finish page work and obtain the strongest available exact revision fingerprint;
3. re-fetch this registry with CAS;
4. add or update exactly that page record;
5. allocate the next unused `P###` from `next_change_number`, then increment it;
6. set a very short `change_note` describing what the human can notice, not implementation telemetry;
7. never update the registry for internal-only refactors with no human-visible effect;
8. for a NEW page, reserve its unique plate/context and satisfy `PAGE_REQUEST_PUBLICATION_PROTOCOL_V1.md` before registration;
9. continue normal RETURN/re-entry.

A page change notification is informational evidence only. It is never Human Acceptance.

## Guide continuity

`/g` should load this registry and page protocols when the human refers to:
- any `AAA000` plate;
- any `P###` change ID;
- page title/folder/recent change note.

The human should be able to say `CAL001: cambiá esto` or `CAL001 + VOZ001: creá una página nueva que combine...` without finding an old chat or transporting context manually.

## Minimalism

Live should show page-change details only on demand: a dot/count in the menu, page title, permanent plate, optional `P### · change_note`, and the page itself. Technical refs stay hidden. The plate should be easy to copy.
