# PROMETEO REINCARNATION ENTRY

This file is a machine/human entrypoint, not canonical truth by itself.

1. Read `reincarnation/BOOTSTRAP.json`.
2. Verify every required artifact exists and matches its declared schema.
3. Validate `catalog/CATALOG_MANIFEST.json` against `catalog/tree.json` and `catalog/pages.json`.
4. Validate the receipt ledger before trusting pointer transitions.
5. Validate `state/CURRENT_GRAPH.json` against the catalog identity and receipt IDs.
6. Load HOT context first; use WARM/COLD only when task relevance requires it.
7. Apply privacy before selection. Explicit IDs never bypass LOCAL.
8. Read `state/PENDING.json`, `state/CARRY.json`, and `state/WATERMARKS.json`.
9. For a change request, use the modification resolver to create Seed → Work Item → Context Pack.
10. Return a Candidate. Never mutate Human Accepted or Served from an artifact return.

A fresh agent should be able to wake from these durable sources without this chat.

## Primary Chat interactive continuation

For the human-copyable fallback prompt, use `reincarnation/PRIMARY_CHAT_CONTINUE_PROMPT_V1.txt`.
It is an invocation alias only, not a truth owner: it must resolve the current session from `coordination/chat-sessions/INDEX.json`, create a fresh successor first, and then obey the durable owners named by that session.
