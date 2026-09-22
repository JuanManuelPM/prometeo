# PROMETEO · V3 Design Research Question Bank V1

Purpose: prebuild high-value questions that can be assigned to research workers after C0, so design work is parallelized instead of being done serially by one Guide.

## Worker collaboration

1. Under what measurable conditions should a worker remain sticky to one grid instead of taking the globally highest-priority useful task?
2. Compare stable pairs, stable triads and fully fungible workers. What coordination benefits could emerge, and what failure modes would distinguish genuine team learning from simple exposure differences?
3. Does repeated FRAME execution by one worker improve question quality, speed and consistency, or does it create redundancy and narrowing? Define metrics and falsification criteria.
4. Does repeated SOLVE execution improve integration and efficiency? Separate genuine within-worker improvement from easier later tasks or selection bias.
5. Does repeated REVIEW execution improve calibration? Measure score consistency, revision usefulness and disagreement with independent reviewers.
6. What deterministic specialization schedule best preserves fairness while allowing repeated-role learning?
7. When does phase rotation reduce fatigue, and when does it destroy beneficial specialization?
8. Design a self-comparison context that lets a worker learn from prior outputs without turning runtime data into executable instructions.
9. Design a peer-exemplar context that transfers useful patterns without causing imitation collapse or homogenization.
10. What minimum worker count is needed to distinguish pair/triad/global policies on a short screening horizon?

## Cell structure and DAGs

11. Which parts of five-question framing are truly independent, and which require shared context before parallelization?
12. Can Q1–Q5 be solved independently without destroying cross-question coherence? Define a synthesis contract and measurable synthesis cost.
13. When should a SYNTHESIZER be a separate worker versus the final question-solver?
14. Design a multi-review panel where evidence, contradictions, implementation and adversarial review are independent but merge into one semantic outcome.
15. What failure patterns would show that intra-cell parallelism increases coordination overhead more than useful throughput?

## Prompt / protocol design

16. For the same rule, how could placement at the beginning versus end of a protocol change adherence? Define a matched A/B/C test.
17. Compare objective-first, evidence-first, adversarial-first and synthesis-first FRAME grammars while holding all other text constant.
18. Which FRAME properties best predict downstream SOLVE quality and low revision burden?
19. Is five questions optimal for useful density, or would 4+1 adversarial / 3+2 synthesis-implementation be better? Define a fair comparison.
20. What protocol fields should be human-readable text versus machine-readable constraints so the engine remains stable?

## Measurement and causality

21. Define the smallest screening horizon that can reject clearly bad strategies without overfitting to early noise.
22. Which metrics must be normalized by active-worker-seconds?
23. How should unmatched worker counts across arms be handled statistically?
24. How do we distinguish within-worker learning from task-order effects?
25. What matched-cell design best controls domain/difficulty while avoiding duplicated content leakage?
26. Define predeclared promotion criteria for moving from SCREEN-10 to TOP-3.
27. What quality dimensions should be evaluator-independent versus evaluator-specific?
28. What should count as a terminal worker failure versus a normal experiment stop?
29. Design observability that detects silent workers within one minute without falsely declaring long SOLVE work dead.
30. What raw evidence must remain durable so all summary statistics can be recomputed later?

## Adversarial / architecture

31. Find ways round-robin or balance-seeking arm assignment could still bias a comparison.
32. Find ways sticky crews could appear better simply because they receive easier matched cells.
33. Find ways self-comparison or peer exemplars could leak treatment across arms.
34. Identify which proposed experiments require engine changes versus only declarative policy/protocol changes.
35. Design a V3 namespace so no screening implementation can mutate C0 evidence.
36. Identify the minimum runtime primitives needed to support all ten strategies without hardcoding ten separate schedulers.
37. Propose a declarative strategy-policy schema expressive enough for pairs, triads, specialization, affinity and fanout.
38. Propose a protocol registry/promotion lifecycle: DRAFT → CANARY → PROMOTED → RETIRED.
39. Define how every run pins protocol hashes so historical results remain reproducible.
40. Define what must remain impossible for Supabase-returned data to instruct a worker to do.
