# PROMETEO — Part 2 Adversarial Audit

Status: **REPAIR CANDIDATE — CI NOT YET RECORDED**

Baseline audited: `gitcommit:fcb77473ecaa4855514253b3c6166bf400356d43`, previously certified by Part 2 Candidate CI run `33874647321`.

## Scope
This audit attacks the claims that Part 2 is durable, fail-closed and chat-agnostic. It does **not** upgrade browser/perceptual, Human Accepted, Served or production truth; those remain Part 3 gates.

## Findings and repairs
1. **BLOCKER — forged privacy declassification.** A plausible in-memory object could authorize LOCAL→PROJECT/PUBLIC. Repair: declassification now requires durable receipt id+hash matching the trusted ledger map supplied by the platform.
2. **BLOCKER — PROJECT externally exportable by default.** `allowProject` was effectively always true in Context Pack compilation. Repair: external PROJECT export is opt-in; LOCAL remains forbidden.
3. **BLOCKER — Current transition not ledger-anchored.** A caller could pass a matching receipt-shaped object. Repair: transition requires trusted receipt membership.
4. **BLOCKER — no CAS for Current.** Competing writers could overwrite a newer graph. Repair: `expectedRevision` is mandatory.
5. **BLOCKER — state escalation through a non-human pointer.** `candidate_current` could set an artifact state to HUMAN_ACCEPTED. Repair: HUMAN_ACCEPTED and SERVED state elevation always require their evidence, regardless of pointer name.
6. **HIGH — shallow immutability.** Frozen outer objects exposed mutable nested arrays/maps. Repair: durable deep immutable snapshots and deep-frozen platform state.
7. **HIGH — wake accepted inconsistent durable documents.** Reincarnation checked only two schemas. Repair: all required docs, branch/head/parent/catalog and receipt cross-links are validated before wake.
8. **HIGH — explicit context could disappear silently.** Repair: an explicitly requested missing ID fails closed.
9. **MEDIUM — watermark write without mandatory CAS/post-validation.** Repair: expected source watermark is mandatory and the result is revalidated.
10. **MEDIUM — migration registry runtime injection.** Repair: built-in graph is sealed after bootstrap.

## Mutation regression suite
`tests/part2-adversarial-repair.test.mjs` introduces 10 mutants covering the repairs above. These are permanent known diseases, not one-off audit scripts.

## Explicitly not claimed here
- no browser QA PASS;
- no perceptual QA PASS;
- no fresh-chat empirical PASS;
- no Human Accepted change;
- no Served verification;
- no production pointer move;
- no same-link release or rollback rehearsal.

## Exit condition
Part 2 adversarial repair is not closed until: all Part 1 regressions + all Part 2 tests + the 10 new mutants + JS syntax + JSON parsing pass on the exact repair commit, followed by a durable audit receipt and a second CI pass over the closure metadata.
