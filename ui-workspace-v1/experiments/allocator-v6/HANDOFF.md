# EXP-007 HANDOFF · Prompt Tournament

Status: READY_TO_RUN

Goal:
Compare five prompt designs while keeping the work backend fixed.

Variants:
A · EXP-006 recortado
B · máquina de estados
C · Coliseo causal
D · telemetría tardía
E · ultra mínimo

Each variant:
- 2 mechanically registered workers
- 4 identical blocks
- independent Drive registry + allocator
- isolated Git branch per worker
- same work/RETURN contract

Launch measurement:
The public UI records the browser timestamp at the instant the user taps COPY.
It injects:
- launch_id
- launch_clicked_at
- launcher_button

The worker persists those values plus:
worker_started_at, registered_at, first_claim_at, first_return_at, empty_at.

Primary metric:
TTFW = first_claim_at - launch_clicked_at

Winner rule:
First require 4/4 blocks, both workers EMPTY, 0 duplicates, 0 critical errors.
Among valid variants, lowest average TTFW wins.

Public UI:
https://juanmanuelpm.github.io/prometeo/ui-workspace-v1/?v=13

Do not alter allocators or prompt templates after launching a variant.
