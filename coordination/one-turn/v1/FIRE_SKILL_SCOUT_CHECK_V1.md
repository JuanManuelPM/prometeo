# 🔥prometeo · Verificación estática del descubridor V1

- Rama candidata: `feature/fire-skill-dispatch-v1-20261009`.
- Decisión humana: `🔥prometeo` activa una **skill especial de inventario de todas las skills observables** y enumera las aplicables al caso concreto; que muchas se repitan entre tareas es aceptable. NO las invoca, instala ni publica automáticamente.
- Diferencia preservada: `🔥` y `🔥p` siguen `RESYNC_AND_CONTINUE`.
- Descubrimiento en tiempo real: metadatos de catálogo GitHub + todas las skills que el entorno efectivamente exponga, sin suponer acceso fuera de él.
- Entregables: skill `prometeo-skill-scout`, parser/registry `FIRE_COMMANDS_V1.json`, bootstrap del Proyecto, tests y documentación de semántica.
- Resultado verificado por evaluación JS equivalente al parser recuperado de la rama: **30/30 escenarios de ruteo**, **0 alias duplicados** tras casefold/acento, **0 referencias a skills faltantes** en catálogo, 6 skills catalogadas. Los casos de seguridad siguen como contrato, no como test de permisos runtime.
- Inspección real del entorno de esta conversación: lista de **66 skills accesibles para descubrimiento** mediante catálogo; otras sesiones pueden exponer un conjunto diferente. Una skill en GitHub no equivale a una skill instalada en ChatGPT.
- Límite de prueba: no se ejecutó Node directamente sobre un checkout descargado; el contenedor no podía resolver raw.githubusercontent.com. La interpretación se comprobó reproduciendo la lógica exacta del parser JS en entorno V8 con fixtures leídos de GitHub. Prueba e2e de Project/Work y privado `P4 Capture` **PENDIENTE**.
- `main` y `gh-pages` no fueron modificados. PR #71 permanece en borrador, para no pisar Work.
- Próximo control antes de integrar: `node scripts/verify-prometeo-fire.mjs` en checkout real, revisión de cambios concurrentes, configuración una vez del launcher/Proyecto, chat fresco con `🔥prometeo libros`, y comparación de skills enumeradas contra catálogo de sesión.

## 2026-10-09 · Revisión del modo de preparación (CANDIDATE)
La acción anterior `ENUMERATE_APPLICABLE_SKILLS` queda sustituida por `PREPARE_SKILLS_AND_PLAN`; el punto aislado se parsea como `EXECUTE_PREPARED_PLAN` sin interpretar que hay plan disponible. Este texto documenta el cambio, NO un test de ejecución del backend.
