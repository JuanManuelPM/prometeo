# Facultad V18 Notas/login · static preflight · 2026-09-18T12:10Z

Authority: `coordination/portfolio/pins/portfolio-facultad-v18-notes-login-static-contract-audit-v1/G000001.json`.
Worker: `gpt56sol-20260918T115800Z-p01-8f3c`.

## Result

**STATIC_CONTRACT_OK**

Current `gh-pages:pages/study-library/study-v18.js` blob: `b54ed6324d6f08f94b2116b3dc410d50244699c9`.

The completed implementation returns were re-read:
- native notes/date bridge: `RETURN-wc-20260918T013450Z-d8c55ec2-G000002-VERIFIED`;
- login capability boundary: `RETURN-wc-residency-01-20260918013509330-20260918014056Z-V18-LOGIN`.

The current V18 source remains aligned with both.

## Notas/fecha

Static checks on the exact current V18 blob confirm:
- no synthetic `Clase 01`–`Clase 04` placeholders;
- no `Fecha por definir` placeholder;
- Notas uses `notesState`, `loadNotes(row,...)` and the real legacy read-only API `api.courseSessions(row.course_id,row.canonical_title)`;
- loading state says it is reading saved Study Library sessions/notes;
- unreadable/error state explicitly says it will not invent dates or notes;
- an empty durable result renders `No hay clases guardadas para esta materia.`;
- session titles/dates/shared notes come only from returned legacy session rows.

The originating notes/date RETURN records that V11 resolves those rows from `study_class_sessions` and `study_session_docs.shared_notes`, read-only, and its pinned GitHub Actions regression passed.

## Login capability honesty

The exact current V18 source still renders:
- `data-v18-login disabled`;
- `aria-disabled="true"`;
- title `No hay un proveedor de autenticación configurado para esta vista`;
- label `Inicio de sesión no configurado`.

The misleading `Inicio de sesión · próximamente` text is absent. No Blackboard login is aliased into the generic product-auth control.

## Version anterior

The same real same-page fallback remains present. `legacyURL` sets `legacy=1` and optionally `course=<id>`; V18 exits at bootstrap when that flag is present.

## Boundary

This is static verification only. `representative_javascript_browser` remains required to prove desktop/mobile runtime behavior and absence of browser errors. Human Accepted is not inferred.

No Current, Human Accepted or Served promotion was performed.
