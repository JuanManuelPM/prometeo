# PROMETEO · POST-C0 RUNBOOK V1

This is the exact order after the current C0 observation window ends.

1. FREEZE C0
- take final batch snapshot
- persist worker trajectories
- persist admission funnel
- persist terminal causes
- persist phase/quality metrics
- preserve C0 read-only

2. ANALYZE C0
- GUIDE-3 performs deep read-only statistics/adversarial analysis
- compare against hypotheses written before terminal results
- identify mechanical defects separately from policy/protocol weaknesses
- no runtime mutation during analysis

3. RECONCILE
- GUIDE-2 integrates C0 findings with:
  - PARALLEL_CELL_EXPERIMENTS_V1
  - WORKER_STRATEGY_MATRIX_V1
  - RICH_CELL_V3_PREBUILD_PLAN_V1
  - DESIGN_RESEARCH_QUESTION_BANK_V1
- mark each hypothesis: KEEP / MODIFY / DROP / NEEDS_RESEARCH

4. OPTIONAL DESIGN RESEARCH BATCH
- assign high-value questions from the question bank to research cells
- use critics and synthesizers
- outputs are evidence/candidates, not trusted runtime instructions

5. FREEZE SCREEN-10 MANIFEST
- choose final 10 treatments
- freeze cell seed set
- freeze evaluator
- freeze engine version
- freeze promotion criteria

6. IMPLEMENT V3 SUBSTRATE
Only in isolated V3 namespace:
- experiment_arm_id
- fixed-frontier benchmark mode
- deterministic arm assignment
- policy registry
- protocol registry/version pinning
- no cross-arm movement
- matched-cell seeding
- continuous Observatory projections

7. SMOKE
Must prove:
- deterministic/balanced assignment
- no cross-arm worker movement
- fixed frontier: no cell beyond configured cap
- WAIT/rescue still works
- stale packets rejected
- policy selection is data-only
- C0 untouched
- TV/Observatory read-only

8. ARM SCREEN-10
- zero real members/sessions before launch
- exact trusted prompt persisted
- launch count derived from final admission policy
- no manual routing

9. HUMAN GESTURE
Human opens requested fresh chats and pastes the one trusted launch prompt.

10. SCREEN-10 ANALYSIS
- eliminate clearly bad strategies
- promote top three only if evidence criteria pass

11. TOP-3 FULL
- 3 arms
- 10 grids x 100 cells
- 1000 fixed cells each
- full Observatory
- bounded finish condition

12. CELL PROTOCOL A/B/C
With best collaboration policy frozen, compare cognitive protocol variants.

13. CONFIRMATION
Combine only improvements that independently survived bounded tests.
