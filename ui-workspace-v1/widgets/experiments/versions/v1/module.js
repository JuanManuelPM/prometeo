Prometeo.registerWidget({
  id:'experiments',
  name:'EXPERIMENTOS',
  version:1,
  widgetApi:1,
  defaultHeight:360,
  pages:[{title:'EXPERIMENTOS'},{title:'EXP-001'},{title:'EXP-002'},{title:'CONTINUIDAD'}],
  css:`
    .exp-wrap{width:100%;height:100%;overflow:auto;text-align:left;padding:2px 2px 18px;color:var(--fg)}
    .exp-stack{display:grid;gap:10px;width:100%}
    .exp-card{border:1px solid var(--line);border-radius:8px;padding:11px 12px;background:rgba(255,255,255,.24)}
    .exp-row{display:flex;gap:8px;align-items:flex-start;justify-content:space-between;min-width:0}
    .exp-id{font-weight:900}.exp-title{font-size:12px;color:var(--muted);margin-top:3px}
    .exp-status{font-size:10px;border:1px solid currentColor;border-radius:99px;padding:3px 6px;white-space:nowrap}
    .exp-status.partial{color:#805b00}.exp-status.ready{color:#1d5e34}
    .exp-kicker{font-size:10px;letter-spacing:.08em;color:var(--muted);margin-bottom:8px}
    .exp-body{font-size:12px;line-height:1.45;white-space:normal}
    .exp-body b{color:var(--fg)}
    .exp-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
    .exp-links a{color:var(--fg);text-decoration:none;border:1px solid var(--line);border-radius:6px;padding:6px 8px;background:var(--panel)}
    .exp-code{font-size:11px;line-height:1.4;background:#111;color:#f8f6ef;border-radius:7px;padding:9px;white-space:pre-wrap;overflow-wrap:anywhere}
    @container (max-width:240px){.exp-row{display:block}.exp-status{display:inline-block;margin-top:6px}.exp-card{padding:9px}.exp-links{display:grid}}
  `,
  render(ctx){
    if(ctx.page===0) return `<div class="exp-wrap"><div class="exp-kicker">CUADERNO DE LABORATORIO · evidencia ≠ entusiasmo</div><div class="exp-stack">
      <div class="exp-card"><div class="exp-row"><div><div class="exp-id">EXP-001</div><div class="exp-title">Drive broker / claim por revisión</div></div><span class="exp-status partial">PARTIAL_PASS</span></div><div class="exp-body">Transporte Drive → trabajo local → RETURN: PASS. Exclusión por revisión: PASS como simulación. Dos chats reales: todavía no.</div></div>
      <div class="exp-card"><div class="exp-row"><div><div class="exp-id">EXP-002</div><div class="exp-title">Dos chats reales compiten por un claim</div></div><span class="exp-status ready">READY</span></div><div class="exp-body">Siguiente prueba preparada. Exactamente un owner, loser no reintenta, RETURN sólo del ganador.</div></div>
      <div class="exp-links"><a href="experiments/EXPERIMENTS_INDEX.json">índice JSON</a><a href="continuity/CURRENT_HANDOFF.md">CURRENT handoff</a></div>
    </div></div>`;
    if(ctx.page===1) return `<div class="exp-wrap"><div class="exp-kicker">EXP-001 · 2026-10-06</div><div class="exp-card"><div class="exp-body"><b>Resultado correcto:</b> PARTIAL_PASS.<br><br>Se probó una lectura única de WorkBlock desde Drive, trabajo local y RETURN durable. Luego dos escrituras concurrentes simuladas usaron la misma revisión base: una ganó y la otra fue rechazada por revision mismatch.<br><br><b>No fueron dos chats reales.</b> No confundir exclusión de la primitiva con broker multi-worker completo.</div><div class="exp-links"><a href="experiments/EXP-001_DRIVE_BROKER_ATOMIC_CLAIM.md">nota completa</a><a href="experiments/EXP-001.json">registro</a></div></div></div>`;
    if(ctx.page===2) return `<div class="exp-wrap"><div class="exp-kicker">EXP-002 · READY_TO_RUN</div><div class="exp-card"><div class="exp-body">Dos conversaciones independientes deben apuntar al mismo <b>CLAIM-REALCHAT-002</b>. Cada una lee revision + estado; si está READY intenta una sola escritura condicionada a esa revision. El ganador procesa el bloque. El perdedor no reintenta ownership.</div><div class="exp-code">Drive → CLAIM READY
Chat A ─┐
        ├─ compare revision → 1 WIN
Chat B ─┘                    → 1 LOSE
WIN → BLOCK → trabajo local → RETURN</div><div class="exp-links"><a href="experiments/EXP-002_REAL_TWO_CHAT_CLAIM.md">protocolo completo</a><a href="prompts/EXPERIMENTS_CONTINUITY_PROMPT.txt">prompt worker</a></div></div></div>`;
    return `<div class="exp-wrap"><div class="exp-kicker">CONTINUIDAD</div><div class="exp-card"><div class="exp-body">Un chat nuevo no trabaja hasta leer CURRENT + handoff + contexto del widget y aprobar 10 preguntas. Si no puede responder con evidencia, marca <b>READINESS: FAIL</b>.</div><div class="exp-code">CURRENT → CONTEXT → READINESS EXAM
             ↓
       READINESS: PASS
             ↓
            TASK</div><div class="exp-links"><a href="widgets/experiments/CONTINUITY_PROMPT.txt">prompt continuidad</a><a href="widgets/experiments/READINESS_EXAM.json">readiness exam</a><a href="continuity/CHAT-001_2026-10-06.md">Chat 001 completo</a></div></div></div>`;
  }
});
