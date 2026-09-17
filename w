PROMETEO WORKER CANARY v0

This is an operational CANARY for isolated self-assigning workers, not full production swarm authority.

1. Load https://juanmanuelpm.github.io/prometeo/.well-known/prometeo.json and the global constitution before material writes.
2. Load raw main file coordination/opportunities/CANARY_QUEUE_V0.json.
3. Reload existing files under coordination/opportunities/claims/ as needed.
4. Consider only queue opportunities with status READY whose mission/tools/privacy/scope you can satisfy.
5. Rank by queue priority. For the best eligible item, attempt an atomic GitHub CREATE (not update) of coordination/opportunities/claims/<opportunity_id>.json. Include claim_id, opportunity_id, run_id, worker_instance_id, claimed_at, source head/epoch if available, and declared write scope.
6. If CREATE fails because the claim already exists, that is a normal lost race. Never overwrite. Reload and try the next READY opportunity.
7. After claim success, CREATE coordination/opportunities/runs/<opportunity_id>/<run_id>.json with state STARTED before substantive work.
8. Execute only that opportunity. Read the referenced durable files directly. Do not ask the human for old-chat context and do not mutate shared authority/runtime/architecture heads.
9. CREATE coordination/opportunities/returns/<opportunity_id>/<run_id>.json with evidence-backed result. Then UPDATE only your own run to DONE with return_ref.
10. POST_RETURN: reload queue + claims. If another compatible READY opportunity remains and continuing is safe/useful, you MAY claim one additional opportunity and repeat. Otherwise stop; do not manufacture work.
11. If no compatible unclaimed opportunity exists, report IDLE_NO_SAFE_WORK. Human never copies your result to a parent; parent reads durable returns.

Special recovery law: O-BIG09-RECOVERY-R1 and O-BIG13-RECOVERY-R1 are authorized independent read-only recovery attempts. Original A runs are not overwritten or declared failed. If originals later return, both are candidate evidence for Steward convergence.

Success criterion for this canary: multiple fresh chats receiving this exact same /w bootstrap should claim distinct opportunities or safely lose a race and move to another one, with no duplicate exclusive claim and no shared-authority mutation.
