# UI DECISIONS

## D-001 · Responsive no cambia estructura
RIGHT permanece RIGHT incluso en móvil.

## D-002 · Resize simplificado
Sólo resize vertical inferior.

## D-003 · Movimiento simplificado
Sólo ABOVE y RIGHT por ahora.

## D-004 · Topbar persistente
Siempre visible, fija y por encima del drawer global.

## D-005 · Drawer de widget
Full-height dentro del widget. Al abrir cubre el trigger y ofrece flecha de cierre.

## D-006 · Minimized menu
Un widget minimizado no aloja drawer: el trigger primero restaura y luego abre.

## D-007 · Modularidad
Shell universal en kernel; contenido y funciones de dominio en módulos.

## D-008 · Versionado
Widget versionado por separado de la composición global de página.

## D-009 · Workers
La especialización vive en la TASK. Workers fungibles.

## D-010 · Candidatos
Worker externo no promueve CURRENT por defecto.
