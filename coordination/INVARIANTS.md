# Prometeo · Cross-System Invariants v1

Status: CANDIDATE CONTRACT · does not modify any Human Accepted pointer.

## Authority

1. Exact verified artifact beats reconstruction.
2. Explicit Human decision beats AI preference.
3. HUMAN_ACCEPTED is an exact artifact identity, never a floating visual similarity.
4. Version labels from different lineages are not numerically comparable.
5. UNKNOWN stays UNKNOWN. RECONSTRUCTED stays RECONSTRUCTED until authentic evidence is recovered.
6. Candidate, Human Accepted, Served and Archived are distinct states.

## Human surface

7. Human-facing Home stays simple; workers, hashes, providers, receipts and pipelines live backstage unless requested.
8. Products may share laws and primitives without sharing visual identity. Calendar, Adriana, Classes and Student Worlds are not skins of one template.
9. Content/page surfaces are flat by default. Depth is a manipulability signal, not decoration.
10. Manipulable controls may use physical relief: dark exterior shadow + restrained inner highlight; pressed state must physically collapse.
11. No essential information or action is hover-only.
12. Two-color product grammar is preferred; a third color is reserved for explicit semantic state, not decoration.

## Interaction

13. Finger/iPad direct manipulation is the primary mental model. Mouse/pen adapt to that grammar.
14. Shared input uses Pointer Events; no product-specific UA branches for iPad/iPhone.
15. Exactly one subsystem owns an active gesture. Ownerless or multiply-owned input is a test failure.
16. Crossing a drag threshold converts the gesture to drag/pan and suppresses the originating click.
17. Native touch scrolling owns touch momentum; generic JavaScript must not recreate fake inertia.
18. Pointer capture is acquired only when needed and released on up, cancel, loss of capture, blur and teardown.
19. Focus/temporary modal ownership is lease-based: acquire, suspend/nest, release, semantic restore. Stale leases cannot restore focus.

## Spatial navigation

20. The exact Human Accepted navigation artifact is the regression baseline until another exact candidate is accepted.
21. Navigator owns spatial camera/gesture/entry/return. Pages own content. Catalog owns hierarchy/route metadata.
22. One-child semantic folders may collapse without erasing breadcrumb semantics; two-or-more-child folders remain real decisions.
23. Exact Back restores semantic identity first (route/branch/page/item/anchor/focus/scroll owner), then adapts coordinates to the current viewport.
24. Resize/orientation cannot turn an old pixel coordinate into false semantic state.
25. No blank flash between spatial states; preload and visible rear/edge ownership must preserve physical continuity.

## Shared architecture

26. Design Kernel owns tokens/laws, not product layout.
27. Material is opt-in and versioned. Loading neutral tokens must never implicitly raise every surface.
28. Component/widget upgrades are candidate versions. Existing consumers stay pinned until representative tests + Human acceptance.
29. PageKit is one shared engine with host contracts, not copied bytes inside every class page.
30. Classes and Student Worlds separate engine, content, config/theme and durable student/class state.
31. Universal Shell owns truly global services only. It does not absorb Navigator or page-specific domain logic.

## Persistence / context / privacy

32. Chat history is not canonical storage.
33. Durable state has explicit schema/version/migration and artifact lineage.
34. Context bundles carry source provenance, authority class and privacy policy.
35. LOCAL is not exportable by default. Derived summaries cannot silently downgrade privacy.
36. Seed → Work Item → Artifact → Return → Review → Accept → Integrate is explicit and receipt-carrying.

## Proof / release

37. Model, static, runtime, browser, visual, Human and Served correctness are separate gates.
38. Tests must bind to the final bytes they claim to validate.
39. A declaration/receipt is not proof unless it references executable or inspectable evidence.
40. Promotion is pointer movement after acceptance, not file overwriting.
41. Rollback must be tested A→B→A and verify identity, state compatibility and cache/pointer restoration.
42. A failed worker-soluble test creates a repair + regression; it is not normalized as “known limitation”.
