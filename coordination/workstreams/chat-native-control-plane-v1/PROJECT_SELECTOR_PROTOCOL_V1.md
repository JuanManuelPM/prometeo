# Prometeo Home / Chat Object Selector Protocol v2

Status: ACTIVE CANDIDATE RUNTIME EXTENSION
Owner: `chat-native-control-plane-v1`

## Goal

A user opens a completely fresh ChatGPT conversation, sends only `Prometeo`, chooses a project/working identity by a short menu number, and the fresh conversation **reincarnates the selected durable Chat Object** without requiring the originating transcript.

## Identity model

Keep these separate:

1. `project_id` — human umbrella, e.g. Facultad or Alumnos.
2. `chat_object_id` — durable conversational/operational identity that can reincarnate across ChatGPT conversations.
3. `workstream_id` — durable execution/coordination stream; a Chat Object may coordinate several.
4. `work_item_id` — one delegated prepared job.
5. `worker_instance_id` — disposable main-incarnation or one-shot worker execution identity.
6. menu number / launch code — temporary human-friendly aliases only.

A project may initially have no Chat Object binding. When recovered from legacy workstreams, create/persist one instead of making transcript history the canonical state.

## Fresh-chat `Prometeo`

1. Load stable entry/runtime.
2. If already bound to a Chat Object/project/workstream, reincarnate/resync it.
3. Else if materially unfinished Prometeo intent is clearly recoverable locally + durably, continue it.
4. Else load `PROJECT_INDEX.json` and render compact Home in `menu_order`.
5. Do not ask the human to paste old prompts or identify an old chat when durable discovery can resolve it.

## Numeric Home selection

After Home, a bare integer:

1. resolves only against the exact menu snapshot just rendered;
2. converts immediately to `project_id`;
3. resolves preferred `chat_object_id` when one is bound;
4. loads the Chat Object recovery pointers;
5. creates/binds this disposable conversation as a new incarnation when durable write transport allows;
6. reconstructs mission + FOCUS + design/rules + work board + shared graph + relevant worker/return state;
7. continues the durable frontier.

Never persist the integer as identity.

For `REGISTERED_DISCOVERY_REQUIRED` projects, search current runtime/catalog/workstreams using aliases + declared workstreams, recover the smallest coherent current state, then persist a project/Chat Object binding.

## Reincarnation / PRE_RESPONSE

Before a material answer in a bound Chat Object:

1. IDENTITY — project/chat-object/workstream/incarnation identity.
2. EPOCH — cheap shared freshness.
3. CHAT OBJECT — manifest/pointers.
4. FOCUS — objectives/frontier/blockers/open questions.
5. DESIGN + RULES — only what is relevant to the request.
6. WORK BOARD — newly relevant work-item/run/return state and derived batch progress.
7. PACK — refresh only on first load/new epoch/relevant dependency change.
8. AUTHORITY — Current/Catalog/Lineage/owners only when the requested action needs authority resolution.
9. OPTIONAL EVENTS — targeted messages/collisions/questions only when present and relevant.
10. INTERPRET + EXECUTE.
11. SELF-DOCUMENT — persist material new goals/design/rules/dependencies/work/return-integration/frontier before relying on transcript memory.

A previous ChatGPT transcript is optional archaeology/evidence. It is not required durable state.

## Delegated launch

`Prometeo <launch_code>` bypasses Home and resolves exact prepared `work_item_id/JOB` through stable delegated-work state. Follow `DELEGATED_WORK_PROTOCOL_V1.md`.

The human transports only the short address, never the job body or result.

## Parent/worker relationship

One-shot workers are not persistent sibling conversations. They are executions of prepared Work Items under a parent `chat_object_id`.

Normal feedback path is:

`Chat Object -> JOB -> independent Worker Run -> durable RETURN -> parent consumption/integration`

Directed Inbox/message transport is optional for exceptional targeted questions/collisions/corrections, not the primary architecture.

## Compatibility

Legacy bound workstreams continue to recover as before. The system should progressively wrap valuable long-lived work in Chat Objects instead of forcing a clean migration of everything at once.

## Acceptance test

1. Open a brand-new ChatGPT conversation.
2. Send only `Prometeo`.
3. Home shows durable menu.
4. Select `Prometeo · continuidad entre chats` by number.
5. Resolve `project-prometeo-chat-control` -> `chat-object-prometeo-chat-control-main` -> its workstreams.
6. Load `CHAT_OBJECT.json + FOCUS + PRODUCT_BLUEPRINT_V2 + WORK_BOARD + SHARED_GRAPH + relevant PACK`.
7. Fresh conversation must know the exact current frontier, first prepared batch, rules and active/returned worker state without asking what the old chat discussed.
