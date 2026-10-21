# ChatGPT skill readiness · Prometeo (staging)

**Scope:** isolated, additive preparation of 30 capabilities mentioned in the Revolutia transcript selection. **Does not modify Prometeo's application, agent runtime, CURRENT, stored data, Page Change, served UI, or connected-account authorizations.**

## Ready now (from this conversation, last observed 2026-10-20)

- GitHub: connected, read/write repository and Actions tools observed.
- Supabase: connected; active project discovered.
- Vercel: connected; projects discovered.
- Vercel full-flow verification skill: available; browser execution still requires a suitable runner.
- Plan using Spec Kit methods; convert documents with tools already available.
- Superpowers plugin: **connected**; its native callable actions have **not yet been demonstrated**.
- Context7: user shown OAuth consent screen, **connection still unconfirmed**. The user must choose whether to authorize it.

All these statuses are **time-stamped snapshots**, NOT live introspection or implicit rights. Actual use must confirm current permissions.

## One-line commands in a code execution environment

```sh
node tooling/chatgpt-readiness/readiness.cjs --self-test
node tooling/chatgpt-readiness/readiness.cjs --zero-friction
node tooling/chatgpt-readiness/readiness.cjs --all --json > readiness-plan.json
node tooling/chatgpt-readiness/readiness.cjs --id github,playwright,context7 --json
```

The planner has no dependencies outside Node standard library and never performs installs, OAuth, network requests or repo modifications. **The plan is a dry run**. The GitHub Actions workflow validates it, exports an audit artifact, and **never invokes external integrations**.

## How to use from ChatGPT

1. User can simply ask: "Usá las herramientas que ya están conectadas para [tarea concreta]."
2. Inspect currently available connected tools and the exact target repository/project. Prefer existing GitHub, Supabase, Vercel and Docs tools over duplicating integrations.
3. Read `capabilities.json`, select the requested capability IDs, check its `state` and `blocker`; check actual available tool schemas, then work.
4. For `awaiting_oauth`, `external_auth` or `local_bridge_required`, do everything not requiring permission first and stop precisely at the consent/local step.
5. Don't claim the tool is installed or that work succeeded based on a written skill alone. Run the actual E2E verification and report evidence.

## Non-destructive adoption

This folder is an opt-in staging catalog, not a new Prometeo authority. Existing `AGENTS.md`, Global Constitution, Work Graph, Control Plane, Page Change and ONE TURN govern all material changes. Do not install 30 unrelated packages into the live runtime. Build narrowly scoped, reversible adapters against requested tasks only.

## Why 30 tools won't automatically be usable from ChatGPT

- A skill is usually an instruction package, **not executable authorization**.
- GitHub-hosted CLI tools run in controlled runners or on your machine, not inside ChatGPT's remote connectors.
- External OAuth / account permissions must be explicitly granted by the account owner.
- A screenshot of a consent screen does not verify that the grant finished.
- A GitHub Actions green result validates the **isolated readiness harness only**, not browser UX, local Ubuntu connectivity or WhatsApp.

## Sources and safety

The catalog links to project or provider sources; treat social-video claims about stars, cost savings and all-sites access as unverified until separately tested. Never push credentials, private chats, local files or auth cookies to the public Prometeo repo. Use staging, dry runs, scoped permissions, and rollback.
