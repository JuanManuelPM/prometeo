# Deployment hardening after V15 load failure

V15 passed local geometric QA but the public page still failed because the browser could not load/decode the external sprite request. That exposed a missing deployment QA layer.

## V16 deployment rules
1. Local geometric QA and public asset-load QA are separate gates.
2. The isolation lab must not depend on a second Pages request while geometry is under review.
3. V16 embeds the exact aligned JPEG bytes as a data URI inside index.html.
4. The source base64 is read from the GitHub V15 blob at publish time.
5. Publication aborts if the encoded stream does not have a JPEG signature.
6. Runtime asserts naturalWidth=640 and naturalHeight=256 before enabling animation.
7. Runtime reports a visible Spanish diagnostic if decoding or geometry fails.
8. There is no relative sprite path, MIME-by-extension dependency, secondary CDN request, cache race, or 404 path in the V16 critical rendering path.
9. Once the isolated animation is accepted, the final Player integration may return to a standalone optimized asset, but only after a real browser/deployment decode check.
