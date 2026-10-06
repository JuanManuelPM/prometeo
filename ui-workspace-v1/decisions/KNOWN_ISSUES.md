# KNOWN ISSUES / REGRESSION WATCH

Errores que ya ocurrieron y deben probarse en cambios futuros:

1. Drawer global tapando/recortando topbar.
2. Drawer global imposible de cerrar tocando afuera.
3. Icono de menú mal renderizado (2 líneas o línea cortada).
4. Drawer interno limitado al body en vez del alto entero del widget.
5. Drawer de widget minimizado intentando renderizar dentro de 44 px.
6. Widgets lado a lado ensanchando el viewport móvil.
7. Topbar cortada por overflow horizontal.
8. Responsive cambiando RIGHT a BELOW.
9. Resize mostrando guía pero no cambiando widget.
10. Resize desde arriba causando saltos/relación ambigua con vecino.
11. Rerender durante pointermove rompiendo geometría.
12. Swipe de tabs compitiendo con move/edit.
13. Estados incompatibles: minimized+drawer, fullscreen+edit, etc.

Todo candidato que toque shell/layout debe revisar estos puntos relevantes.
