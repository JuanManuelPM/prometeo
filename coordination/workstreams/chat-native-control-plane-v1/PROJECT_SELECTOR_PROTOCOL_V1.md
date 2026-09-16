# Prometeo Project Selector Protocol v1

Status: ACTIVE CANDIDATE RUNTIME EXTENSION
Owner: `chat-native-control-plane-v1`

## Goal

A user must be able to open a completely fresh ChatGPT conversation, send only `Prometeo`, choose a project by a short menu number, and continue durable project state without relying on the originating chat transcript.

## Identity model

Three identities must remain separate:

1. `project_id` — durable human project identity. Survives every chat.
2. `workstream_id` — durable execution/coordination stream inside Prometeo. A project may own one or many.
3. `worker_instance_id` — disposable chat/agent instance participating in a project/workstream.

A menu number is never identity. It is only the current rendering alias of a `project_id`.

## Fresh-chat `Prometeo`

When the user sends exactly `Prometeo`:

1. Load the stable entry and current runtime.
2. Run PRE_RESPONSE restore.
3. If this conversation already has a durable/bound `project_id`, recover that project and continue its latest materially-unsatisfied frontier.
4. Else if this conversation contains a clearly recoverable unfinished Prometeo intent, recover it under the existing compatibility rule.
5. Else treat the conversation as HOME/UNBOUND and load `PROJECT_INDEX.json`.
6. Render a compact numbered list in `menu_order` and say only that the user may send the number.
7. Do not make the human paste an old prompt or identify an old chat.

## Numeric selection

If the previous Prometeo response rendered the project menu and the user sends a bare integer:

1. Resolve the integer against the exact menu snapshot just rendered.
2. Convert it immediately to `project_id`.
3. Never store or route on the integer afterward.
4. Load the project recovery object.
5. If `ACTIVE_BOUND`, load its primary Work Packet + FOCUS + relevant Inbox, then continue the durable frontier.
6. If `REGISTERED_DISCOVERY_REQUIRED`, search current runtime/catalog/workstreams using the project's aliases and declared child workstreams. Resolve the smallest coherent durable binding and persist it back into `PROJECT_INDEX.json` before relying on it in future chats.
7. Create or recover a `worker_instance_id` for the current disposable chat when write-capable transport is available. Bind it to `project_id` and the selected `workstream_id`; never make this worker identity the project identity.

## PRE_RESPONSE v1

Before any material answer after a project is selected:

1. IDENTITY — know `project_id`, `workstream_id`, `worker_instance_id` if available, and parent worker if any.
2. EPOCH — compare cheap shared epoch.
3. INBOX — consume unread directed messages relevant to this worker/project.
4. FOCUS — load the durable operational map.
5. PACK — if epoch changed or no active packet is loaded, refresh the selected compiled Work Packet.
6. AUTHORITY — load Current/Catalog/Lineage only when the requested action requires authority resolution.
7. INTERPRET — only now interpret the user's new material request.
8. EXECUTE — preserve-first, then implement/critique/repair.
9. OUTBOX/RETURN — persist useful frontier and route directed cross-chat messages before finishing when they materially affect other workers.

Same-EPOCH turns may skip packet/network reload, but may not skip unread directed Inbox if the mailbox cursor says new messages exist.

## Parent/child rule

A critic/branch/specialist is a child `worker_instance_id` with the same `project_id` and normally a scoped child workstream or task scope. It publishes conclusions to the parent's Inbox. The parent consumes them during PRE_RESPONSE. The human is not the courier.

## Compatibility

Existing Prometeo chats keep the old RESYNC + RECOVER + CONTINUE behavior when their local project/workstream can be inferred. The project menu is the fallback for fresh/unbound conversations, not a replacement for active recovery.

## First acceptance test

1. Open a brand-new ChatGPT conversation.
2. Send only `Prometeo`.
3. It must show the durable project menu.
4. Send the number corresponding to `Prometeo · continuidad entre chats`.
5. The chat must resolve `project-prometeo-chat-control` -> `chat-native-control-plane-v1`, read PACK + FOCUS + INDEX, and continue from the current frontier without asking what the previous chat discussed.
