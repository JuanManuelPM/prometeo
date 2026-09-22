# BACKLOG-175 · System Spec global · readiness evidence

Status: BLOCKED — final artifact must not be fabricated.

Checked: 2026-09-22

## Target

Produce the canonical `PROMETEO COGNITIVE FORGE SYSTEM SPEC` only after its upstream evidence exists.

The intended chain is:

`canonical point -> point interface -> section spec -> global integrator -> system spec -> build graph`

## Live blocker

Backend query against `blueprint_points` for `FORGE-BLUEPRINT-84-01` returned:

- total points: 84
- points with non-empty `canonical_text`: 0
- points with positive `canonical_words`: 0

Therefore BACKLOG-176 cannot satisfy its closure criterion of compiling at least three real canonicals into point interfaces, and the seven real Section Specifications required by BACKLOG-178 cannot honestly exist yet.

Repository inspection also found no final `PROMETEO_COGNITIVE_FORGE_SYSTEM_SPEC` artifact and no persisted real per-section specifications. Only the executable contracts/specifications for the pipeline exist.

## What is already implemented

The downstream contracts are no longer the blocker:

- the seven-section registry exists canonically in `docs/cognitive-forge/forge-sections.v1.json`;
- a runtime mirror validates the same seven identities and canonical order;
- `FORGE_SECTION_INTEGRATOR` v1 and its validator/smoke exist;
- BACKLOG-178 has an executable global-integrator specification;
- `forge_global_build_directives_compile` emits a deterministic COMPILED fixture System Spec from seven structured section fixtures;
- `forge_build_graph_compile` accepts that fixture and returns `BUILD_GRAPH_READY`.

Those fixture results prove the contracts compose. They do not constitute the final System Spec.

## Closure boundary

BACKLOG-175 may move to HECHO only when all of the following are evidenced with real source material:

1. canonical point material exists;
2. valid compact point interfaces exist from real canonicals;
3. seven canonical Section Specifications exist, exactly one per registry section;
4. the global integrator compiles those real section specs with all gates green;
5. the resulting System Spec is persisted with provenance and a stable hash;
6. rereading/validation confirms the persisted artifact matches the compiled hash.

Until then the correct observable state is BLOCKED/WAITING_INPUTS, not a provisional artifact presented as canonical.
