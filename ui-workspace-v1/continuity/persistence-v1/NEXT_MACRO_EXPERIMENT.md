# NEXT MACRO EXPERIMENT · RESIDENT PROFILE ROTATION
5 chats, mismo kernel, dealer asigna slots.

Perfiles:
- P0 range1 + RETURN individual + verify
- P1 range1 + RETURN individual no-verify
- P3 range3 + batch3
- P5 range5 + batch5
- P10 range10 + batch10

Epoch = 30 durable tasks. Rotación Latin-square:
E0 W1 P0 W2 P1 W3 P3 W4 P5 W5 P10
E1 W1 P1 W2 P3 W3 P5 W4 P10 W5 P0
E2 W1 P3 W2 P5 W3 P10 W4 P0 W5 P1
E3 W1 P5 W2 P10 W3 P0 W4 P1 W5 P3
E4 W1 P10 W2 P0 W3 P1 W4 P3 W5 P5
Después repetir; no terminar por completar una ronda.

Métricas: durable tasks/min, external calls/durable task, RETURN→claim, conflicts, retries, local-complete-not-durable, interruption rate, orphan rate.

Fase B: winner + lease/generation/requeue + crash gauntlet.
Fase C: dual vs single transport.
Fase D: scale 5→10→25.
Fase E: autotuner modular con promoción separada.
