# UNIVERSAL BUTTON · CONTINUAR CHAT
Owner: Universal Shell V5, no segundo shell/sidebar/widget.

Posición estable: Páginas → favorite toggle → Favoritos → Continuar chat → Notas → Grabar.

Flujo: tap → import `shared/continuity/v1/continue-chat.js` → fetch prompt durable → inject page metadata → clipboard → open ChatGPT → toast.

Primary prompt: `/prometeo/ui-workspace-v1/continuity/persistence-v1/CONTINUE_CHAT_PROMPT.txt`.
Fallback: `/prometeo/continuity/CONTINUE_CHAT_PROMPT.txt`.

No tocar Corner Anchor, Favorites, Notes/recording, host ni single-shell invariant.
