# CURRENT HANDOFF · 2026-10-08

El handoff viejo de EXP-004 queda superseded para la campaña mecánica.

Continuidad canónica:
§ui-workspace-v1/continuity/persistence-v1/00_INDEX.md§

Takeover público:
§shared/continuity/v1/CONTINUE_CHAT_PROMPT.txt§

Universal menu:
§Continuar chat§ copia ese takeover y abre ChatGPT.

UI experimental:
https://juanmanuelpm.github.io/prometeo/ui-workspace-v1/?v=15

## Dirección humana nueva: UI evolutiva (documentada, no implementada)
La idea de plugins extremos sin migraciones manuales NO debe desaparecer por cambio de chat. Registro aditivo:
- `ui-workspace-v1/continuity/evolution-v1/IDEA_INDEX_V1.json`
- `ui-workspace-v1/continuity/evolution-v1/ARCHITECTURE_SPEC_V1.md`
- `ui-workspace-v1/continuity/evolution-v1/EXECUTION_PLAYBOOK_V1.md`
- `ui-workspace-v1/continuity/evolution-v1/TAKEOVER_V1.txt`
No interpreta V15 como source en main ni sustituye Design DNA, Work Graph o el Current owner. El plan está pendiente de ejecución y verificación; no publicar por el mero handoff.

## Prioridad 2026-10-08: ONE TURN
Usuario quiere una sola entrada por chat, estado durable en la página, y skills para futuras modificaciones. Nuevas referencias: `coordination/one-turn/v1/ONE_TURN_CONTRACT_V1.json`, `coordination/one-turn/v1/EXECUTION_SPEC_V1.md`, `.agents/skills/prometeo-one-turn/SKILL.md`. **Fuente documentada, integración del runtime pendiente**. Reutilizar P4 Capture, Page Change, Context Foundry, Work Graph y Current. No copiar contenido privado a GitHub.

## IDEA HUMANA NUEVA: FIRE DISPATCH 🔥
Un símbolo inicial más palabra reemplaza prompts largos en chats configurados. El registro de comandos y tests está en `coordination/one-turn/v1/FIRE_COMMANDS_V1.json`; skill `.agents/skills/prometeo-fire/SKILL.md`. Estado en esta rama: CANDIDATE, sin activación automática en ChatGPT ni efecto en website. Más detalles en FIRE_ROUTER_CONTRACT_V1.md.
