---
name: prometeo-chatgpt-tool-readiness
description: "Invoke for any Prometeo request involving coding, QA, integrations, UI, documents, agents, local bridges or deciding which ChatGPT-connected tools/skills to use. Reuse existing connected tools with live verification; avoid redundant installs, unauthorized OAuth and false completion claims."
---

# Prometeo · ChatGPT tool router v2

**Trigger:** a fresh authorized Prometeo worker needs to execute real user work using any of 30 documented capabilities. No need to ask the human to paste another prompt, repo link, command or token.

**Important:** this file lives in the repo. It is **not** automatically installed as a ChatGPT account skill. It becomes available to a new worker only when that worker reads the existing Prometeo entry / `AGENTS.md`, or deliberately opens this file through its connected tools.

## Minimal one-turn algorithm

1. **AUTHORITY**. Before any material product write, load `AGENTS.md`, the Global Constitution, the current EPOCH and the exact active work packet/owner. Preserve Current/Catalog/Lineage/Human Accepted/Served. Do not create a new parallel coordinator.
2. **ROUTE**. Read `tooling/chatgpt-readiness/intents.json` + `capabilities.json`. Select by task using the first matching intent and only the needed skills. If a Node runtime is available, call:
   `node tooling/chatgpt-readiness/readiness.cjs --goal "<the user's existing request>" --json`.
   Never make the human run this command merely to save agent work.
3. **RE-CHECK CONNECTORS**. Catalog status is an old snapshot. Inspect the live available tools and permissions in *this* ChatGPT conversation before claiming execution. Prefer GitHub, Supabase, Vercel and available native skills already connected. Separate:
   - Methodology we can **apply** (Spec Kit, Superpowers practices, design skill guidance).
   - Tool/plugin whose actual API was **called and returned successfully**.
   - External runtime/CLI only **prepared**, not installed or linked.
   - OAuth/Meta/Ubuntu/local browser access **blocked pending explicit human consent**.
4. **IMPLEMENT**. Prepare and perform every authorized software-solvable step. Make narrow, reversible edits on the exact current owner, ideally a separate branch/PR for risky changes. Read source before applying changes; do not rewrite accepted interfaces.
5. **VERIFY**. Tests must demonstrate user-visible behavior, not simply JSON/schema validity. Use existing browser CI where applicable; verify browser/API/data boundaries, negative tests and preserved functions. A successful dry-run router test is never proof that a third-party capability is live. Save direct evidence.
6. **RETURN**. Report precise diffs, tested vs untested functions, actual tool calls, unresolved limitations and correct links. When the authorized Page Change/RETURN pathway works, persist through its existing owners. If it does not, report the real persistence boundary without inventing a receipt.

## Route priorities

- **Bug/code/UI fix:** GitHub exact owner → specification/preservation → test first → code fix → browser test → visual polish.
- **App integrations:** use existing connector → check provider scope → build missing bridge only → test real event; do not presume WhatsApp personal-account access.
- **Visual changes:** preserve accepted visual DNA → choose skills → generate candidate → test mobile, keyboard and screenshot → do not promote without actual approval when required.
- **Study/document ingestion:** authorized retrieval → source extraction → canonical markdown/structured document → reader and TTS tests; never hardcode content.
- **Agents/worker swarms:** reuse existing Work Graph and worker bus → measure results → avoid adding competing schedulers → publish truthful receipts.
- **Ubuntu/Android/Kindle:** prepare everything remotely before any human gesture; remote ChatGPT container is NOT the user's local machine.
- **Security:** only authorized targets and staging, no secrets in logs or public repositories.

## Explicit truth boundary

The planner output has `mode: DRY_RUN_ONLY`; every `callable_now` is `NOT_ATTESTED_BY_OFFLINE_PLANNER`. A real worker must verify current tool availability independently. `awaiting_oauth` can only become connected after explicit user consent and a successful runtime call. Nothing about this skill changes account settings automatically.

Source docs: `tooling/chatgpt-readiness/README.md`.
Catalog: `tooling/chatgpt-readiness/capabilities.json`.
Task patterns: `tooling/chatgpt-readiness/intents.json`.
Unit/negative test: `tooling/chatgpt-readiness/readiness.test.cjs`.
