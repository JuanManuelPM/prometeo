# Prometeo · ChatGPT Capability Router v2

> **Purpose:** make the best available capabilities from the 30-skill Revolutia review reusable across disposable Prometeo chats, with **one human message, no copying commands, no invented permissions**.

## One-message workflow

A human asks a normal task, such as **«Prometeo, corregí el lector y comprobá que no rompiste nada»**.

An authorized ChatGPT worker:
1. Loads the existing Prometeo bootstrap, Global Constitution and the precise work packet/owner.
2. Consults the repo skill at `.agents/skills/prometeo-chatgpt-tool-readiness/SKILL.md`.
3. Picks only the needed techniques/tools from `intents.json` and `capabilities.json`. No installing thirty packages speculatively.
4. **Checks currently connected tools live**, because the catalog only records past observations. Uses GitHub, Supabase or Vercel native connectors when present, or methods/specifications without claiming installed runtimes.
5. Implements within the authorized branch/scope, invokes real tests, checks regressions, records source/commit/evidence, and follows the existing Page Change/RETURN mechanism for durable results when available.
6. If OAuth, the local Ubuntu connection or other external approval is required, prepares everything possible first and requests only the essential consent action. No private data in the public repo.

**This repository cannot force an unrelated new ChatGPT conversation to open it.** Bootstrap works when the other agent actually reads Prometeo's `AGENTS.md` or the existing Prometeo entry. A `SKILL.md` in a repo is not automatically an account-installed ChatGPT skill, and a catalog is not an autonomous worker.

## Evidence-based hierarchy

1. **Real connected tool** (e.g. GitHub, Supabase, Vercel): check presence and permissions in the current session. Execute narrowly and record actual responses.
2. **Available methodological skill** (Spec Kit practices, Superpowers process, visual design principles): apply the method; this is not evidence that a particular external package ran.
3. **GitHub Actions/isolated container**: implement browser automation, converters, safe evaluations and scripts using an approved runner and capture evidence; code generation alone is not verified execution.
4. **External/local system** (WhatsApp Business, Ubuntu device, Claude CLI, user browser): requires explicit authorization or a working, verified bridge. Never assume ChatGPT can access it.
5. **Unknown/blocked**: label accurately, keep dependent steps pending, continue every independent task.

## Reusable commands (for coding runtimes; ChatGPT can read the files directly)

```sh
node tooling/chatgpt-readiness/readiness.cjs --goal "corregir errores de la interfaz" --json
node tooling/chatgpt-readiness/readiness.cjs --goal "conectar calendario y WhatsApp" --json
node tooling/chatgpt-readiness/readiness.cjs --goal "estudiar PDFs de Blackboard" --json
node tooling/chatgpt-readiness/readiness.cjs --all --json
node tooling/chatgpt-readiness/readiness.cjs --zero-friction --json
node tooling/chatgpt-readiness/readiness.cjs --self-test
node --test tooling/chatgpt-readiness/readiness.test.cjs
```

**IMPORTANT:** These commands are **100% offline DRY RUN**. They install nothing, grant nothing and make zero API calls. The field `callable_now` is deliberately always `NOT_ATTESTED_BY_OFFLINE_PLANNER`. Only a live, successful tool operation can upgrade that status in an actual worker's report.

## Corrected limitations of v1

- `ready_connected` is a historical snapshot, not an account permission or live API health check.
- A Superpowers install/connection doesn't prove any callable plugin action is exposed in every chat. If unavailable, use its development methodology without falsely claiming its runtime was executed.
- The Context7 consent screen alone does not prove OAuth is complete. **Its catalog entry remains pending**, regardless of social claims or previous screenshots, until independently checked in the actual session.
- `human_actions_min: 0` means **no obvious extra consent required to begin prep**. It does NOT mean the software is installed, executable, validated or served.
- Browser control in ChatGPT Work is not interchangeable with direct Playwright access from an ordinary ChatGPT chat.
- "all" means all 30 can be **assessed**, not that thirty external tools were installed.

## Guaranteed by the isolated tests

The GitHub workflow `.github/workflows/chatgpt-capability-readiness.yml` runs Node syntax checks, 11 programmatic assertions (including negative auth, invalid flags, language routing) and five user-story dry runs. It saves its JSON outputs as a build artifact for 30 days.

A green build proves ONLY: catalog consistency, deterministic routing, fail-closed permission claims and reproducibility of the planner. It does **not** prove all 30 external tools work, that Prometeo is deployed, that a fresh chat autoloaded this skill, or that the user's Ubuntu/mobile is connected.

## Scope, safety, permanence

- Additive staging only; never replace current `AGENTS.md`, the active owner chain, `CURRENT`, accepted UI or `Served` versions with this router.
- Follow `coordination/GLOBAL_AGENT_CONSTITUTION_V1.md` and all current Prometeo owner/worker rules for material changes. Do not create a duplicate control plane.
- Do not commit personal email, WhatsApp transcripts, auth cookies, credentials, private ChatGPT chats or local Ubuntu files.
- Preserve current capabilities, test rollback, never label unverified work as finished.
- Source catalog: `capabilities.json`. Goal patterns: `intents.json`. Deterministic CLI: `readiness.cjs`. QA: `readiness.test.cjs`.
- Upstream tool versions and external API promises require verification at actual use time. Avoid assuming all YouTube claims are accurate.

## Observable results from another chat

The minimum truthful worker report is:

```json
{
  "task": "...",
  "methods_applied": ["..."],
  "connected_tools_executed": ["..."],
  "verified_changes": [{"path": "...", "commit": "...", "test": "..."}],
  "independently_verified": false,
  "served": false,
  "blocked": [{"capability": "...", "missing": "OAuth | runtime | permission | ..." }],
  "next_unavoidable_human_action": null
}
```

The report format is illustrative: concrete fields must derive from **actual tool results**, not from this template.
