# PROMETEO UI RULES CURRENT · V1

## 1. Layout y viewport
- El documento nunca debe ensanchar el viewport.
- La topbar queda fija y visible aunque haya scroll.
- La topbar siempre está por encima del drawer global.
- Los gaps entre widgets son reales.
- Un split RIGHT sigue siendo RIGHT incluso en móvil. El responsive adapta contenido interno, no la dirección del layout.
- Los widgets pueden quedar angostos; deben compactar su contenido antes de empujar el viewport.

## 2. Apariencia
- Fondo general negro/casi negro.
- Superficies principales claras.
- Duotono visual: evitar colores decorativos extra sin motivo semántico.
- Radios contenidos, aproximadamente 8–10 px, no estética de píldora.
- Chrome mínimo.

## 3. Shell universal del widget
El kernel, no cada widget, controla:
- selección
- minimizar/restaurar
- fullscreen
- close/unmount
- drawer interno
- movimiento
- resize vertical
- navegación de páginas internas
- persistencia básica

Cerrar un widget significa desmontarlo del workspace actual, NO borrar su módulo, versiones, mensajes o referencias.

## 4. Header
- Es una franja mínima con título de página interna y pagers sólo si hay más de una página.
- El menú de tres líneas aparece al seleccionar el widget.
- En modo normal, swipe horizontal sobre el header cambia página interna.
- En Edit, el mismo header se convierte en handle de movimiento y el swipe interno queda deshabilitado.

## 5. Drawer interno
- Ocupa todo el alto del widget.
- Cubre el icono de menú al abrirse.
- Usa una flecha hacia la derecha para cerrar.
- No debe ensanchar el viewport.
- Si un widget está minimizado y se toca su menú, primero se restaura y luego se abre el drawer.

## 6. Edit
Por ahora sólo:
- mover desde header
- resize vertical desde abajo

No:
- resize lateral
- resize desde arriba
- resize desde izquierda/derecha

Movimiento permitido por ahora:
- ABOVE de otro widget
- RIGHT de otro widget

## 7. Resize
- Sólo handle inferior.
- Visual pequeño, hitbox táctil grande.
- Pointermove cambia la altura en vivo.
- Pointerup persiste.
- Pointercancel restaura.
- No rerender del árbol durante pointermove.
- No autoscroll durante resize.

## 8. Movimiento
- El widget original puede quedar semitransparente.
- Sólo una guía fina de inserción.
- No reconstruir el árbol hasta pointerup.
- Autoscroll vertical permitido durante move.
- El destino RIGHT jamás se transforma automáticamente en BELOW.

## 9. Módulos
- Cada widget declara `widget_api_version`, `version`, páginas internas y capacidades.
- El módulo sólo implementa su contenido/dominio.
- No reimplementa el shell universal.
- Un widget viejo debe poder seguir montándose mientras sea compatible con la Widget API indicada.

## 10. Verificación
- Output externo es candidato hasta ser verificado/promovido.
- No declarar PASS de interacción física no probada.
- Reportar problemas fuera de scope sin arreglarlos por cuenta propia.
