# PROMETEO · RESIDENT COMMENTATOR V1

## Purpose

Treat live narration as another Universal Worker job, not as a special Guide capability.

COMMENTARY is a typed job on the same durable worker bus.

Current SCREEN-10 integration is isolated:
- benchmark cohort remains EXPERIMENT_CELL-only;
- commentary uses PREP cohort PROMETEO-UNIVERSAL-V1-COMMENTARY-E1;
- the same worker architecture and lease semantics are reused;
- future universal prompts may support COMMENTARY natively.

## Trigger policy

Current channel:
- interval target: 90 seconds;
- minimum gap: 30 seconds;
- immediate candidate triggers: first commentary, admission milestone, 5% progress milestone, new REVISE/FAIL, worker terminal, expiry/stale anomaly, prolonged submit stall.

The worker itself does not decide when narration is due.

## Snapshot variables

Canonical snapshot includes:
- DONE/total/% and words;
- backend sessions/admitted/target;
- active_status and seen_last_120s separately;
- semantic PASS/REVISE/FAIL;
- active/accepted/expired/stale claims;
- per-arm policy/protocol, workers, DONE, quality and exposure;
- top worker trajectories;
- per-phase average/p50/p90;
- frame/solve/review active time;
- seed→frame, frame→solve and solve→review gaps;
- recent event counts and last activity.

## Causal discipline

S01-S07 are worker-policy arms.
S08-S10 are cell-protocol probes.
The commentator must not mix them in one causal ranking.

Raw DONE leadership is descriptive only when worker exposure differs.

## Audio

Reuse existing function:
audio-lab-page-audio-v1

Engine:
Qwen3-TTS VoiceDesign.

No new TTS backend was added.

A dedicated Rioplatense football-radio voice prompt is stored in prometeo_commentary_channels_v1.

## Playback telemetry

Every spoken item records:
- job created;
- worker claim;
- worker completed;
- TTS requested;
- TTS ready;
- playback started;
- playback ended/error.

This yields:
- queue→claim time;
- worker-generation time;
- TTS-generation time;
- audio queue time;
- trigger→heard time;
- playback duration.

## Read-only consumer contract

- public.prometeo_commentary_snapshot_v1(experiment_id)
- public.prometeo_commentary_audio_feed_v1(experiment_id, after)
- public.prometeo_commentary_state_v1
- public.prometeo_commentary_metrics_v1
- public.prometeo_commentary_feed_v1

Visual systems may consume these variables read-only.
Visual presentation is intentionally outside this implementation.
