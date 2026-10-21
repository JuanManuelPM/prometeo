---
name: prometeo-chatgpt-tool-readiness
description: "Map available ChatGPT connected tools to Prometeo requests, use existing GitHub/Supabase/Vercel before new installs, enforce permission and verification boundaries."
---

# ChatGPT tool readiness (opt-in recipe)

**This is a repo-side skill, not an automatically installed ChatGPT plugin or account permission.**

1. Before product changes, obey repository `AGENTS.md`, the Global Constitution and relevant owner/work packet. This skill **does not** supersede those.
2. Read `tooling/chatgpt-readiness/capabilities.json`, which ranks 30 opportunities and states the precise blockers. Treat `state` values as observations from 2026-10-20, not live access claims.
3. For a user request, identify the smallest set of capabilities required. Prefer live ChatGPT tools for GitHub, Supabase, Vercel, native document processing and verification; never create duplicate connectors merely because an external repo was recommended.
4. If needed, run `node tooling/chatgpt-readiness/readiness.cjs --id <comma-delimited-ids> --json` to produce a **dry-run activation plan**. Do not treat its output as installed software.
5. For runnable changes, act only in authorized scope. Prepare all safe code, CI checks, candidate previews and tests, but do **not** silently install plugins, grant OAuth, use private credentials, run scripts on the user's local computer or expose private data.
6. Superpowers plugin was connected by the user, but individual callable tools were not yet available at capture time. Apply its method where appropriate; discover real callable actions before claiming plugin-native execution.
7. Context7 OAuth was shown in a screenshot, not confirmed connected. Avoid storing the screenshot's email or copying identity/authorization data to public GitHub.
8. For a new local bridge or external account, generate a least-privilege, reversible package first, then request only the unavoidable human consent/activation.
9. Return truth-separated states: **prepared**, **tested in CI**, **connected**, **local active**, **human accepted**, **served**. A successful `readiness.cjs --self-test` proves catalog integrity only.
10. Prefer one-turn software execution: do not ask human to transport prompts/paths when ChatGPT and existing connectors can act.

Primary catalog: `tooling/chatgpt-readiness/capabilities.json`.
Method and commands: `tooling/chatgpt-readiness/README.md`.
