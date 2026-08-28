# PROMETEO TOUCH-FIRST INTERACTION

Status: CANONICAL SHARED RULE
Owner: `interaction.touch-first`
Current implementation: `shared/interaction/touch-first/v1/`

## North

Every Prometeo application is designed as if the primary device were an iPad used with a finger. Mouse and pen are alternate pointers that must use the same interaction contract rather than a separate desktop UI.

The interaction model is **direct manipulation first**: the user should be able to touch/press the content itself and move it in the direction the content travels. Desktop mouse/trackpad behavior must preserve that mental model rather than forcing the user to hunt for arrows, scrollbars or edge controls.

## Permanent laws

1. **Finger first.** Every primary action must work by direct tap or native scroll without hover.
2. **Pointer Events only.** Shared interactions use Pointer Events so touch, mouse and pen follow one code path.
3. **Mouse emulates contact.** During mouse/pen press and drag, a small contact circle may visualize the virtual fingertip. Actual touch does not need this proxy.
4. **Press begins on contact.** Physical feedback starts on `pointerdown`, not after `click`.
5. **Minimum target 44 px.** Visible controls may be smaller, but their effective hit area must be approximately 44×44 CSS px or larger.
6. **Direct manipulation beats edge hunting.** If a surface scrolls horizontally on iPad, a desktop user must also be able to move it from the surface itself. Do not require grabbing a scrollbar, clicking a tiny side control, or moving the pointer to an edge merely to navigate.
7. **Native touch scroll owns touch physics.** Touch devices keep browser-native scrolling, momentum and gesture behavior. Do not recreate iPad physics in JavaScript.
8. **Mouse drag may emulate finger pan.** On a dedicated scroll rail, fine-pointer users may press-drag the content itself to pan the same axis. Use a small movement threshold so a tap/click remains a tap/click; after crossing the threshold, the gesture becomes a pan and must not also activate the tapped item.
9. **Mouse wheel follows the rail axis when the rail is the world.** For a dedicated full-surface horizontal rail, ordinary vertical mouse-wheel intent may be translated into horizontal scroll when there is no competing vertical document scroll. Trackpad native horizontal delta must remain native and must not be doubled. Do not globally hijack wheel events.
10. **Axis declares touch-action.** Horizontal rails use `touch-action: pan-x`; vertical rails use `touch-action: pan-y`; ordinary controls use `manipulation`.
11. **Hover is optional enhancement.** No information, action, affordance or state may exist only on hover.
12. **No device UA branching.** Adapt by layout width, orientation and pointer capabilities, not `iPad`/`iPhone` user-agent checks.
13. **Drag never traps the user.** If drag is important, tap/click or another direct alternative must remain available.
14. **Scroll survives gestures.** Components must not call `preventDefault()` on touch/pointer movement unless the interaction truly requires taking ownership of that axis.
15. **Pointer capture is bounded.** Mouse/pen drag adapters may use pointer capture only after drag intent is established and must release on `pointerup`, `pointercancel`, blur, loss of capture or route teardown.
16. **One gesture, one result.** A drag that scrolls must not also trigger click/enter. A tap that does not cross the drag threshold must not produce scroll drift.
17. **No custom inertia for mouse by default.** Mouse drag should move the native scroll container directly; do not add fake momentum unless later proven materially better and mechanically safe.
18. **Orientation changes layout, not grammar.** Landscape may favor horizontal rails and portrait may favor vertical rails, but touch → move → focus → enter remains the same model.
19. **Reachable by touch.** No essential action may depend on cursor precision, tiny text, right click, double click, hover, modifier keys or a hidden scrollbar.
20. **Reduced motion survives.** Removing animation must not remove interaction or state feedback.

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

For a dedicated rail that should feel like direct iPad manipulation on desktop, the shared interaction owner should provide the generic behavior rather than each app implementing its own drag/wheel adapter. The app declares the axis; the owner handles pointer thresholding, contact feedback, click suppression after drag, and safe wheel-to-axis translation when eligible.

An application should not implement its own generic pointer adapter when this owner can be consumed.

## Efficiency law

Touch-first must make future applications **cheaper**, not more complicated. Device behavior belongs in the shared interaction owner once. New applications should mostly declare semantic intent (`touch`, `scroll-x`, `scroll-y`) and inherit the tested behavior. App-specific code should describe product behavior, not recreate iPad compatibility.

## Test baseline

Every reusable Prometeo UI must be mechanically checked at minimum for:
- coarse pointer / touch mental model
- direct finger pan on the declared axis
- mouse click with contact proxy
- mouse press-drag pan from the content surface
- tap/click remains activation below drag threshold
- drag suppresses accidental activation after threshold
- ordinary mouse wheel can traverse a dedicated horizontal world without edge hunting
- native trackpad horizontal scrolling is not doubled
- vertical native scroll
- horizontal native scroll when used
- tap without hover
- pressed-state reset after pointerup and pointercancel
- orientation change preserves interaction grammar
- 320–430 px mobile width
- tablet/iPad portrait viewport
- tablet/iPad landscape viewport
- desktop viewport
