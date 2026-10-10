---
name: prometeo-web-change
description: "Use for every Prometeo webpage, UI, widget, web design, plugin cartridge, mobile layout or web code change."
---

# prometeo-web-change

Read Constitution, Design DNA index, `ui-workspace-v1/continuity/evolution-v1/IDEA_INDEX_V1.json`, architecture specification and exact widget/kernel owner. Pass existing `READINESS_GATE_V1.md` before modifying.
- Preserve one universal shell; kernel owns layout/resize/tabs/minimize/fullscreen/selection. UI baseline includes black/paper, ABOVE/RIGHT, bottom-only resize, no mobile overflow.
- Cartridge uses manifest and validated build-time auto-discovery, component version, explicit capabilities, state independent of page_version, mount/update/unmount/dispose cleanup, CSS isolation, permission allowlist and continuity bundle.
- Shared improvements are inherited by interface composition, NOT copied widget code. Shadow DOM isolates styles, NOT trust. Untrusted JS needs a sandbox and verified permissions.
- Use existing P4 Capture/Page Change, Context Foundry, Current, Work Graph. Do NOT create new scheduler, shell, global memory or publisher.
- Main and gh-pages diverged historically (main V7, gh-pages V15); refetch fresh. Never overwrite served with stale source. Candidate != Current != Served.
- Preserve history and data on unplug/reinstall; read adapters for schema evolution; reversible write upgrades only if required. Zero **manual** migrations is a goal, not guaranteed zero data transformations.
- Test old functionality, mobile behavior, direct assets, security, offline/staleness, rollback, and served bytes when claiming published. New widget needs CONTEXT, PROMPT, EXAM, messages, references, versions.
- Return scoped diff, tests, evidence, regression/failure notes and continuity in authorized store.


## Required proof-first gate for material UI changes
Before writing code, load `coordination/one-turn/v1/PROOF_FIRST_BUILD_METHOD_V1.md`. Define what the human must DO/SEE/CHECK, design FEATURE→PROOF and V6 demo first, run acceptance RED (if defect), implement minimal GREEN, test preservation, then compile/test REAL page in Demo Engine V6. Synthetic labs do not prove the widget. Leave staged candidate if demo/release gates are unverified. Quick TV switches are explicitly exempt; they use the existing state-owner path and immediate readback.
