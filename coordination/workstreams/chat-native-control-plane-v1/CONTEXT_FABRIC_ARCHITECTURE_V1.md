# Context Fabric Architecture v1

Status: BINDING DIRECTION / IMPLEMENTATION CANDIDATE
Owner: `chat-object-prometeo-chat-control-main`

## Goal
Allow any parent/planner/worker to reach the right durable context without reading the whole repository or depending on transcript memory.

The design is hybrid. Do not choose only folders, only summaries, only a tree, only embeddings, or only a database.

Use four coordinated layers:

1. **Hierarchical manifests** for cheap navigation and progressive disclosure.
2. **Typed knowledge graph** for identity, dependency, authority, lineage and contradiction relationships.
3. **Hybrid retrieval index** (metadata/keyword + embeddings/vector) for semantic discovery across large corpora.
4. **Role/task context compiler** that selects the smallest sufficient L0/L1/L2 Working Set with freshness and evidence pointers.

## Why this is better than reading 100 files
A model should normally load:

### L0 — Cognitive Kernel
Small stable strategic packet, roughly 1–3k tokens:
- north star;
- active method/non-regression rules;
- current root identity;
- authority rules;
- current frontier;
- exact pointers to deeper context.

### L1 — Domain / folder digest
A generated summary/manfiest for a relevant subsystem/folder:
- what artifacts exist;
- current status/authority;
- key decisions/invariants;
- unresolved conflicts;
- important changes since previous digest;
- links/hashes to source artifacts.

### L2 — Evidence sources
Only the exact original files/chunks needed to execute or verify the current task.

A worker starts with L0 + one or more L1 digests. It opens L2 only when evidence or exact implementation detail is needed.

## Hierarchical manifest model
Every meaningful durable namespace may have a generated `MANIFEST.json` / `DIGEST.md` with:
- namespace_id;
- content hash / source head;
- generated_at;
- child artifacts;
- artifact type/status/authority;
- summary;
- key facts/invariants;
- open questions;
- dependencies;
- supersedes/superseded_by;
- provenance;
- semantic tags;
- freshness;
- retrieval hints.

These manifests are derived projections, not authority. They can be rebuilt from source truth.

## Typed knowledge graph
Represent durable entities as nodes:
- Project / Root / Chat Object
- North / Campaign / Batch / Opportunity / Claim / Run / Return
- Decision / Hypothesis / Invariant / Incident / Golden / Vaccine
- Artifact / Source / Method / Capability / Test / Human boundary

Use typed edges such as:
- OWNS
- DEPENDS_ON
- BLOCKS
- PRODUCED_BY
- CONSUMED_BY
- SUPERSEDES
- CONTRADICTS
- SUPPORTS
- VALIDATES
- IMPLEMENTS
- AFFECTS
- DERIVED_FROM
- CURRENT_FOR

Graph identity/edges are especially important where vector similarity is unsafe: authority, lineage, dependencies, ownership, contradiction and currentness.

## Hybrid retrieval
Use structured filters first when known:
- project/root
- artifact type
- authority/status
- recency/freshness
- campaign/work item
- tags
- owner

Then combine:
- lexical/keyword retrieval for exact names/codes/contracts;
- embeddings/vector retrieval for semantic similarity;
- graph expansion for dependencies/lineage/contradictions;
- recency + authority weighting.

Vector search must never decide authority or currentness by itself.

## Context Compiler
Input:
- actor role (parent/planner/steward/worker/critic/validator)
- mission
- root/project
- opportunity/run
- tool/capability constraints
- privacy class
- freshness requirement
- token budget

Output:
- L0 kernel
- ordered L1 digests
- exact L2 evidence refs/chunks
- omitted-but-available pointers
- freshness/source hashes
- authority labels
- contradictions needing attention

## Context selection objective
Minimize tokens while maximizing task sufficiency and avoiding critical omission.

Conceptual scoring:
`utility = relevance + authority_need + dependency_need + contradiction_need + freshness + evidence_need - token_cost - redundancy`

Never compress away:
- authority boundary;
- negative knowledge/incidents relevant to the task;
- current blockers;
- conflicting evidence;
- human acceptance requirements;
- exact contract for a material write.

## Automatic summarization/compaction
Digests should be regenerated when:
- child content hashes change;
- important decision/integration occurs;
- incident changes method;
- authority head changes;
- digest is older than a configured freshness policy.

Use map-reduce style compaction:
1. source chunks -> artifact summary;
2. artifact summaries -> folder/domain digest;
3. domain digests -> root digest;
4. root digests -> global cognitive kernel.

Each summary preserves source refs/hashes so a model can drill back down rather than trust lossy prose blindly.

## Database/storage direction
Fastest robust path:
- Git remains durable auditable source for canonical artifacts/protocols/evidence.
- A derived index service (Supabase/Postgres is suitable) stores artifact metadata, graph edges, content hashes, chunks, embeddings and retrieval projections.
- The index is disposable/rebuildable from Git and other authorized source connectors.
- Do not put authority only in the vector/database index.

Suggested relational core:
- `artifacts(id,path,root,type,status,authority,hash,updated_at,summary,privacy)`
- `artifact_chunks(id,artifact_id,ordinal,text,embedding,hash)`
- `edges(src_id,edge_type,dst_id,evidence_ref)`
- `digests(namespace_id,source_head,summary,generated_at,hash)`
- `context_receipts(id,actor,mission,source_head,selected_artifacts,token_estimate,created_at)`

## Self-critique integration
Every Planner/parent strategic cycle should retrieve:
- current Master Context;
- User Intent Gap Audit;
- Strategic Non-Regression + Self-Critique protocol;
- current incidents/negative phenotypes;
- recent progress events;
- relevant root/domain digest;
- conflicting/unresolved proposals.

That makes the human's recent corrective instinct part of the machine's default context rather than something the human must repeat.

## Implementation sequence
1. Build repository artifact inventory + typed metadata extractor.
2. Generate folder/domain manifests/digests.
3. Build graph edges for known durable schemas/contracts.
4. Add lexical + vector index as derived service.
5. Build role/task Context Compiler.
6. Emit context receipt for every strategic/work execution.
7. Falsify with tests: missed critical source, stale digest, authority confusion, contradiction omission, oversized context.

## Success test
A fresh planner given only root + mission should find the same critical sources a knowledgeable parent would, while opening a small fraction of total files and preserving all authority/negative-knowledge constraints relevant to the decision.
