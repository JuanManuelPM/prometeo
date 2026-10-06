# WIDGET API V1

Un módulo se registra mediante:

```js
Prometeo.registerWidget({
  id: "unique_id",
  name: "VISIBLE TITLE",
  version: 1,
  widgetApi: 1,
  defaultHeight: 260,
  pages: [{ title: "PAGE" }],
  css: `...`,
  render(ctx) { return `...`; },
  actions: [
    { id: "custom_action", label: "Custom action", run(ctx) { ... } }
  ]
});
```

## Garantías del kernel
El kernel aporta:
- shell
- selección
- menu
- minimizar
- fullscreen
- Edit
- move ABOVE/RIGHT
- resize vertical inferior
- pagers
- swipe de página interna
- persistencia
- close/unmount

## Prohibiciones
Un widget NO debe:
- cambiar `.topbar`
- redefinir `.widget`, `.widget-top`, `.widget-options`, `.resize-bottom`
- crear su propio motor de layout
- modificar otros widgets
- cambiar la dirección responsive de splits
- escribir fuera del scope de su TASK

## Assets
Los assets del módulo deben ser relativos al build candidato o estar explícitamente registrados como referencia.
Para video-loop usar preferentemente `<video autoplay muted loop playsinline>`; no convertir a GIF salvo requerimiento expreso.

## Compatibilidad
- `widgetApi: 1`
- kernel V1 soporta Widget API V1.
- Futuros kernels deberán mantener adaptadores si se rompe compatibilidad.
