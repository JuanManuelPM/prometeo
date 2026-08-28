# PROMETEO TOUCH-FIRST INTERACTION

Status: CANONICAL SHARED RULE
Owner: `interaction.touch-first`
Current implementation: `shared/interaction/touch-first/v1/`

## North

Every Prometeo application is designed as if the primary device were an iPad used with a finger. Mouse and pen are alternate pointers that must use the same interaction contract rather than a separate desktop UI.

## Permanent laws

1. **Finger first.** Every primary action must work by direct tap or native scroll without hover.
2. **Pointer Events only.** Shared interactions use Pointer Events so touch, mouse and pen follow one code path.
3. **Mouse emulates contact.** During mouse/pen press and drag, a small contact circle may visualize the virtual fingertip. Actual touch does not need this proxy.
4. **Press begins on contact.** Physical feedback starts on `pointerdown`, not after `click`.
5. **Minimum target 44 px.** Visible controls may be smaller, but their effective hit area must be approximately 44×44 CSS px or larger.
6. **Native scroll owns movement.** Do not recreate scrolling with pointermove, wheel interception, fake physics or heavy animation when browser scrolling can do the job.
7. **Axis declares touch-action.** Horizontal rails use `touch-action: pan-x`; vertical rails use `touch-action: pan-y`; ordinary controls use `manipulation`.
8. **Hover is optional enhancement.** No information, action, affordance or state may exist only on hover.
9. **No device UA branching.** Adapt by layout width and pointer capabilities, not `iPad`/`iPhone` user-agent checks.
10. **Drag never traps the user.** If drag is important, tap/click or another direct alternative must remain available.
11. **Scroll survives gestures.** Components must not call `preventDefault()` on touch/pointer movement unless the interaction truly requires taking ownership of that axis.
12. **Reduced motion survives.** Removing animation must not remove interaction or state feedback.

## Shared primitive

Load:
- `interaction.css`
- `interaction.js`

Then mark ordinary interactive objects with:

```html
<button data-p-touch>...</button>
```

For native rails:

```html
<div data-p-scroll="x">...</div>
<div data-p-scroll="y">...</div>
```

An application should not implement its own generic pointer adapter when this owner can be consumed.

## Test baseline

Every reusable Prometeo UI must be mechanically checked at minimum for:
- coarse pointer / touch mental model
- mouse click with contact proxy
- vertical native scroll
- horizontal native scroll when used
- tap without hover
- pressed-state reset after pointerup and pointercancel
- 320–430 px mobile width
- tablet/iPad-size viewport
- desktop viewport
