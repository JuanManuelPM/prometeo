# Prometeo Soft Material v1

Canonical owner for the stable 3D/neumorphic material language first validated in the Soft Object specimen.

## Scope
Owns ONLY material appearance and physical interaction:
- raised windows/surfaces;
- inset fields;
- shell depth;
- pressed/active control state;
- shared light direction;
- radii/depth tokens;
- light + dark material palettes.

It deliberately does NOT own typography, layout, product topology or content.

## AI QUICK LOAD
Do not recreate shadows locally. Do not copy specimen CSS. Use semantic primitives only.

```html
<html data-p-material="dark">
  <p-shell>
    <p-surface>Anything</p-surface>
    <p-inset>Inset area</p-inset>
    <button class="p-control">Action</button>
  </p-shell>
</html>
```

Equivalent class/attribute forms:
- `p-shell` / `.p-shell` / `[data-p-surface="shell"]`
- `p-surface` / `.p-surface` / `[data-p-surface="raised"]`
- `p-inset` / `.p-inset` / `[data-p-surface="inset"]`
- `.p-control` / `[data-p-control]`
- `.p-field`

## Rule for future AIs
If a generic UI object needs the Prometeo material look, choose the semantic primitive and STOP. Never manually invent box-shadow values unless evolving this owner itself.

Typography is a separate owner so Human typography preference can change without breaking the material system.

## Cost model
Runtime: CSS only, no JS, no images, no API calls.
Authoring: one semantic tag/class per surface.
Maintenance: update this file once; every consumer inheriting it gets the new material behavior.
