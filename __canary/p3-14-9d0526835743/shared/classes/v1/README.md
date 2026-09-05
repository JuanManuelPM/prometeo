# Classes Engine v1

Pure shared pedagogy/state layer.

Separates:
1. engine/reducer;
2. class content;
3. student durable state;
4. theme/renderer;
5. PageKit service.

Important behavior: postponing does **not** destroy unlock state. Correct answers unlock the next exercise. Hints/attempts/events are explicit evidence, not fake progress.
