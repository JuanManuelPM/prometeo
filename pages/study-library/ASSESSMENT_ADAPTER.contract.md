# Study Library → Study System V2 assessment adapter

Status: active integration contract, 2026-09-10.

## Ownership

Study Library owns `course_id`, assessment identity/metadata, navigation and source links. Study System V2 owns the study instance defined by `.study-system/v2/EXAM_INSTANCE.schema.json` and its pedagogy.

A Study Library assessment is therefore an entity, not a row of display text:

```json
{
  "assessment_id": "course-p1",
  "course_id": "course",
  "label": "Primer parcial",
  "date": "2026-09-10",
  "study_instance_id": "course-p1-v1",
  "study_schema": "prometeo.study.exam/v2",
  "renderer": "exam-instance"
}
```

If `study_instance_id` is null, Study Library may show assessment metadata but must not pretend a study system exists.

## Rendering boundary

Future assessments provide validated instance data. They do not copy or rewrite Study Library chrome, the Study System interaction shell, or whiteboard physics.

The transitional Modelos y Teorías II P1 registry entry uses `renderer = reference-surface-bridge` so the complete real M1–M5 implementation remains usable inside Study Library while its historical compressed content is migrated. That bridge is reference lineage, not the storage pattern for new assessments.

## Navigation

`Study Library → course → Parciales → assessment → Study System V2`

The assessment surface must remain a child of Study Library and return to the same course/Parciales context.

## State separation

Personal assessment state is namespaced by `study:v2:<study_instance_id>:...` and is not class-shared state. Class sessions, participants, transcript, Walky, published notes and shared boards remain under Study Library/Supabase ownership.
