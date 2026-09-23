# PROMETEO · STRATEGIC REASONING CHECKLIST V2

Status: MANDATORY FOR EVERY 15-MINUTE STRATEGIC PERSPECTIVE/PREVIEW CYCLE

Purpose: compensate for lightweight-model shortcuts by forcing every strategic cycle through explicit checks before it can publish a preview or prepare high-intelligence work.

The lightweight layer is NOT the final authority. Its job is to keep continuity fresh, detect drift/friction, update versioned memory, and prepare good packets for stronger workers. A high-intelligence worker may later produce the FIRM brief and deeper work.

## Mandatory gates

C01 LIVE_STATE_FRESHNESS
Read current canonical runtime state. Do not reason only from recovery files or the previous brief.

C02 CURRENT_DRIFT
Compare the existing CURRENT/preview against live state. Explicitly name material facts that changed or say NONE.

C03 SESSION_IS_NOT_LIVENESS
Never treat a session row, ACTIVE status, or null terminal_at as proof that a chat/process can execute again. Distinguish durable membership from recent execution.

C04 RECENT_EXECUTION
Inspect recent last_seen/event/claim/submit/expiry/wait evidence before saying workers are alive, stalled, dead, or resident.

C05 TRANSPORT_VS_RUNTIME
Separate pre-backend connector/tool wake failure from backend/runtime failure. Do not attribute transport loss to Prometeo scheduler without evidence.

C06 BENCHMARK_NO_REPLACEMENT
For a fixed-attempt benchmark such as SCREEN-10, do not hide missing human attempts with replacements mid-run.

C07 SERVICE_RECOVERY_IS_DIFFERENT
Do not blindly copy benchmark no-replacement semantics into a production/resident service. If the strategic service needs N useful workers, recovery/replacement may be correct there.

C08 POLICY_LANE_BOUNDARY
S01–S07 are the worker-policy comparison lane. Keep this boundary explicit.

C09 PROTOCOL_PROBE_BOUNDARY
S08–S10 are protocol probes. Never rank them causally against S01–S07 as one leaderboard.

C10 EXPOSURE_NORMALIZATION
Raw DONE is descriptive only. Before strategy claims, consider admitted workers, recent activity, active-worker-seconds, elapsed exposure, quality and phase mix.

C11 ZERO_OUTPUT_HYPOTHESES
When an arm has zero output, generate concrete hypotheses (missing role, cold-start dependency, dead shell, policy eligibility, transport) without mutating the active experiment.

C12 ACTIVE_RUN_PRESERVATION
Do not stop, rescue, redesign or patch a useful active benchmark merely because a new idea appeared.

C13 PREVIOUS_RECOMMENDATION_OUTCOME
Read the previous next_action. State whether it was executed, superseded, blocked, unnecessary, or still pending.

C14 RECOMMENDATION_DRIFT
Explicitly compare the new recommendation with the previous one. Explain why it changed or why it did not.

C15 NOTE_VERSIONING
For every durable conclusion that changed, prepare a note update with note_key, previous version/ref, change_kind, change_reason, update_context and evidence_refs. Never erase intellectual history.

C16 RECOVERY_DRIFT
If a durable recovery/static artifact contradicts runtime, mark it stale and prepare a repair/update candidate instead of making future reincarnations rediscover it.

C17 HUMAN_GESTURE_TEST
Before asking the user to do anything, prove the action cannot be done by existing backend/jobs/workers. Prefer NO_HUMAN_ACTION.

C18 MESSAGE_BUS_TEST
Never ask the human to relay results between Guides/workers when the same information can be durable/server-routed.

C19 GUIDE_NECESSITY_TEST
Do not create/use a Guide merely because work is long. Ask whether the job can be encoded for fungible workers.

C20 FUNGIBLE_SHELL_MODEL
Never assign durable identity to P1/P2/etc chats. Perspective is job state. Chat shell is disposable transport.

C21 LOOP_CONTINUITY
Do not stop because one perspective/job is missing. Continue with bounded timeout/minimum quorum when protocol permits, and explicitly mark missing evidence.

C22 EXISTING_CAPABILITY_CHECK
Before proposing a new subsystem, check whether the capability/protocol/state already exists and needs activation, repair, instrumentation or simplification instead.

C23 WORK_AVAILABLE_NOW
Identify useful work that high-intelligence workers could do immediately while the user is away. Do not leave them idle merely because integration is pending.

C24 HIGH_INTELLIGENCE_PACKET
Prepare typed, self-contained candidate packets for stronger workers: objective, why_now, evidence refs, constraints, expected output, falsification/checks, and material-authority boundary.

C25 AUTHORITY_BOUNDARY
A checkbox/user selection authorizes work on that option, not arbitrary production mutation. State what can be analyzed/prepared versus what needs an authorized executor/promotion.

C26 CHECKBOX_EXECUTION_REALITY
Do not imply “OK” means any requested production change is complete. Track selected option → job graph → result → verification/promotion when material action is required.

C27 SELECTED_HISTORY_LEARNING
Use prior user selections/discards as evidence for future option quality, but do not turn them into an irreversible permanent preference.

C28 STRATEGIC_SYSTEM_METRICS
Assess whether prior recommendation helped: unnecessary human gestures, blocked/unblocked prediction, selected jobs completed, recommendation falsified, Guide work avoided.

C29 BASELINE_COMPARISON
When an automatic brief replaces the manual baseline or previous FIRM brief, compare them: discoveries, omissions, changed next_action, new evidence, and lost context.

C30 PREVIEW_VS_FIRM
The 15-minute lightweight output is PREVIEW. It must be short, friendly and current. It is not the deep final judgment. Prepare evidence/work packets for a high-intelligence FIRM brief.

C31 AUDIO_SOURCE
When a high-intelligence FIRM brief exists, audio should prefer FIRM. PREVIEW may be displayed immediately but must not silently replace deeper verified advice as equivalent quality.

C32 FRIENDLY_PREVIEW
User-facing preview should explain: what changed, current situation, one or two real tensions/alternatives, what Prometeo is doing, and whether the user needs to act. Avoid internal IDs/JSON.

C33 NO_FALSE_RESIDENCY
Do not say five chats are “resident” merely because five session rows exist. A resident loop is only demonstrated by execution across successive scheduled epochs.

C34 TWO_EPOCH_CANARY
Before declaring 15-minute autonomy working, require evidence that the strategy system completed at least two successive epochs without manual wake between them.

C35 LIGHT_MODEL_DISCIPLINE
Do not shortcut mandatory gates because the answer seems obvious. Each gate must have a concise evidence/result field.

C36 DO_NOT_WAIT_FOR_PERFECTION
After completing the mandatory gates, publish the PREVIEW and prepared work. Do not stall in recursive planning.

## Required perspective output

Every STRATEGIC_PERSPECTIVE result must include:

{
  "perspective_key": "...",
  "checklist_result": {
    "C01": {"ok": true, "evidence": "..."},
    ...
    "C36": {"ok": true, "evidence": "..."}
  },
  "read": [],
  "what_changed": [],
  "frictions": [],
  "recommended_next": {},
  "note_updates": [],
  "high_intelligence_work_packets": [],
  "do_not_do": [],
  "questions": [],
  "evidence_refs": [],
  "confidence": "LOW|MEDIUM|HIGH"
}

Server-side validation rejects missing/false C01–C36.

## Required lightweight synthesis output

The 15-minute synthesis is PREVIEW and must include:

{
  "brief_level": "PREVIEW",
  "headline": "...",
  "preview_text": "...",
  "what_changed": [],
  "current_read": [],
  "frictions": [],
  "recommendation_drift": "...",
  "previous_action_outcome": "...",
  "action_options": [],
  "note_updates": [],
  "high_intelligence_work_packets": [],
  "do_not_do_yet": [],
  "open_questions": [],
  "falsification_conditions": [],
  "confidence": "LOW|MEDIUM|HIGH",
  "evidence_refs": []
}

Target preview: roughly 80–160 spoken/read words, friendly Rioplatense Spanish.

## FIRM layer

A high-intelligence worker can consume PREVIEW + underlying five perspective results + canonical snapshot + previous FIRM and produce a deeper FIRM brief.

FIRM should:
- audit the lightweight checklist conclusions rather than trust them;
- resolve conflicts between perspectives;
- inspect high-intelligence packets;
- decide which options deserve presentation;
- preserve uncertainty;
- produce the preferred audio text;
- prepare safe worker job graphs.

The lightweight preview is allowed to be provisional. FIRM is still candidate advice, not material authority.

## Transport reality

Supabase cron can create/supersede jobs every 15 minutes.
It cannot by itself wake a dormant ChatGPT chat.

Therefore:
- READY jobs do not prove cognition happened;
- a session row does not prove a chat is still executing;
- continuous 15-minute cognition is not certified until actual workers execute successive epochs;
- do not claim otherwise.
