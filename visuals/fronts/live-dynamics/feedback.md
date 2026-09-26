# ⚡ Live Dynamics · Durable Feedback

Status: CURRENT

## KEEP / ACCEPTED
- worker/job/output/dependency separation
- progress-based liveness semantics
- bounded transition events
- no fake ETA

## OPEN / NEXT REVIEW
- ACTIVE alone is not proof of liveness.
- Animation is presentation, never evidence.
- Show output emission, dependency satisfaction, progress, recovery and completion only when real state authorizes them.
- Do not conflate worker with job/task.

## REJECTED / DO NOT REVIVE
- ACTIVE => alive assumption.
- Fake ETA/progress or decorative busy motion.
