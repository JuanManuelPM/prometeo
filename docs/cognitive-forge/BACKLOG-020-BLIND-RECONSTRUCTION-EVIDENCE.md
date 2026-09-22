# BACKLOG-20 · Blind reconstruction evidence

Status reconciled: **HECHO**

## Durable contract

Blind reconstruction is implemented in the live backend as `public.forge_blind_reconstruction_runs` plus role-specific functions:

1. `forge_blind_reconstruction_describer_packet(run_id)` exposes the reference to the describer.
2. `forge_blind_reconstruction_submit_description(...)` persists the transfer description.
3. `forge_blind_reconstruction_reconstructor_packet(run_id)` exposes only `run_id` + `description_text`.
4. `forge_blind_reconstruction_submit_reconstruction(...)` rejects the same worker that authored the description.
5. `forge_blind_reconstruction_evaluator_packet(run_id)` restores the hidden reference and evaluation atoms for scoring.
6. `forge_blind_reconstruction_evaluate(...)` records recovered atoms and deterministic loss ratio.

The source table is private to privileged execution; anon/authenticated cannot read the hidden reference directly.

## Loss metric

Each run stores stable evaluation atoms with unique ids. After reconstruction, the evaluator records which atoms survived.

`loss_ratio = 1 - recovered_atoms / total_atoms`

Unknown or duplicated recovered atom ids are rejected. The reconstructor cannot score its own reconstruction.

## Verification

The live smoke test returned:

- `state = BLIND_RECONSTRUCTION_SMOKE_OK`
- `blind_packet = PASS`
- `role_separation = PASS`
- `loss_measurement = PASS`
- expected loss ratio for 2/4 recovered atoms = `0.5`
- `fixture_cleaned = true`
- remaining fixture rows = `0`

The blind-packet assertion specifically checks that the reconstructor packet contains `description_text` but does **not** contain `source_ref`, `reference_payload`, or `evaluation_atoms`.

## Receipts

- GitHub source migration: `supabase/migrations/20260922043510_forge_blind_reconstruction_v1.sql`
- source commit: `1069843f2f8fe43c1a815065c2f9c792de6408d8`
- live Supabase migration registry: `20260922043503_forge_blind_reconstruction_v1`

The differing timestamp prefix reflects the deployment registry timestamp versus the source-file timestamp; the migration name and deployed contract are the same.

## Boundary

This implements the reusable blind-reconstruction mechanism. It does not claim that a particular production artifact has already been benchmarked. Real runs can now use the contract without exposing the original reference to the reconstructor.
