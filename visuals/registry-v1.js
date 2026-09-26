window.PROMETEO_VISUALS_REGISTRY_V1={
  version:'PROMETEO_VISUALS_REGISTRY_V1',
  defaultPage:'production',
  folders:[
    {
      id:'work-current',label:'Trabajo actual',open:true,
      items:[
        {id:'workbench',label:'📌 Trabajo actual',description:'Nuevos, en trabajo y listos para revisar.',src:'./workbench/'},
        {id:'prompt-launcher',label:'📋 Copiar prompts',description:'Copiar prompts nuevos desde un solo lugar.',src:'./prompts/'}
      ]
    },
    {
      id:'coliseo-current',label:'Coliseo · actual',open:true,
      items:[
        {id:'live',label:'Live Workers',description:'Estado público real de workers.',src:'../demos/coliseo-live-workers-v1/'},
        {id:'production',label:'Producción causal',description:'Worker → output → dependencia → READY.',src:'../demos/coliseo-production-demo/'},
        {id:'multi',label:'3 proyectos · gauges',description:'Varios proyectos con cilindros altos.',src:'../demos/coliseo-vertical-projects-demo/'},
        {id:'components',label:'Component Lab',description:'Renderer, mapas y componentes históricos.',src:'../demos/coliseo-3d-component-lab/',hideSelectors:['.picker','.fxDrawer']}
      ]
    },
    {
      id:'visual-experiments',label:'Experimentos visuales',open:true,
      items:[
        {id:'trail-lab',label:'🐉 Motion Trail',short:'Trail',emoji:'🐉',quick:true,description:'Copias completas superpuestas: redraw roto sin fragmentar el asset.',src:'./trail-lab/',front:'trail',handoff:'./handoff/trail.txt',reviewState:'review'},
        {id:'spaces-lab',label:'🌀 Pseudo-3D Spaces',short:'Spaces',emoji:'🌀',quick:true,description:'Un passage image-first con yaw, avance recto y suelo continuo.',src:'./spaces-lab/',front:'spaces',handoff:'./handoff/spaces.txt',reviewState:'review'},
        {id:'player-lab',label:'🖐️ Retro Player',short:'Player',emoji:'🖐️',quick:true,description:'Escena persistente con cuatro poses/hand assets fuertes e interacción.',src:'./player-lab/',front:'player',handoff:'./handoff/player.txt',reviewState:'review'},
        {id:'mask-eye-lab',label:'👁️ Mask / Eye',short:'Mask',emoji:'👁️',quick:true,description:'Una sola máscara real; media visual intercambiable dentro de cada ojo.',src:'./mask-eye-lab/',front:'mask-eye',handoff:'./handoff/mask-eye.txt',reviewState:'review'},
        {id:'reference-curator',label:'🖼️ Reference Curator',short:'Curator',emoji:'🖼️',quick:true,description:'Búsqueda visual con memoria local, contexto, A/B, colecciones y provenance.',src:'./reference-curator/',front:'reference-curator',handoff:'./handoff/reference-curator.txt',reviewState:'review'},
        {id:'reference-search',label:'Referencia · baseline',short:'Referencias',emoji:'🖼️',quick:false,description:'Baseline limpio de búsqueda Pinterest.',src:'../demos/pinterest-image-query-lab-v1/'}
      ]
    },
    {
      id:'labs',label:'Laboratorios',open:false,
      items:[
        {id:'lab-live',label:'⚡ Live Dynamics',short:'Live',emoji:'⚡',quick:true,description:'Semántica causal.',src:'../demos/coliseo-live/',front:'live-dynamics',handoff:'./handoff/live-dynamics.txt',reviewState:'review'},
        {id:'lab-workers',label:'👾 Workers / Avatars',short:'Avatares',emoji:'👾',quick:true,description:'Cuerpos y poses.',src:'../demos/coliseo-workers/',front:'avatars',handoff:'./handoff/avatars.txt',reviewState:'review'},
        {id:'lab-animation',label:'🎞️ Animation',short:'Animation',emoji:'🎞️',quick:true,description:'Motion language.',src:'../demos/coliseo-animation/',front:'animation',handoff:'./handoff/animation.txt',reviewState:'review'},
        {id:'lab-maps',label:'🗺️ Maps / World',short:'World',emoji:'🗺️',quick:true,description:'Mundo y cámara.',src:'../demos/coliseo-maps/',front:'maps-world',handoff:'./handoff/maps-world.txt',reviewState:'review'},
        {id:'lab-materials',label:'🧪 Materials / FX',short:'FX',emoji:'🧪',quick:true,description:'Primitivas y materiales.',src:'../demos/coliseo-materials/',front:'materials-fx',handoff:'./handoff/materials-fx.txt',reviewState:'review'},
        {id:'lab-hud',label:'📟 HUD',short:'HUD',emoji:'📟',quick:true,description:'Información y semantic zoom.',src:'../demos/coliseo-hud/',front:'hud',handoff:'./handoff/hud.txt',reviewState:'review'},
        {id:'lab-integration',label:'Integration',description:'Composición y candidate.',src:'../demos/coliseo-integration/'}
      ]
    },
    {
      id:'prometeo',label:'Prometeo · global',open:false,
      items:[
        {id:'current-tree',label:'Current Tree',description:'Continuidad y estado actual.',src:'../current-tree/'},
        {id:'observatory',label:'Observatory',description:'Observabilidad del sistema.',src:'../observatory/'},
        {id:'strategy',label:'Strategy / Ahora',description:'Superficie estratégica.',src:'../strategy/'}
      ]
    },
    {
      id:'meta',label:'Índices / referencia',open:false,
      items:[
        {id:'visual-protocol',label:'Visual Protocol V1',description:'Reglas image-first y criterios de rechazo visual.',src:'./VISUAL_PROTOCOL_V1.md'},
        {id:'visual-feedback-log',label:'Visual Feedback Log V1',description:'Correcciones acumuladas que ningún chat debe olvidar.',src:'./VISUAL_FEEDBACK_LOG_V1.md'},
        {id:'visual-execution-checklist',label:'Execution Checklist V1',description:'Readback, assets, autocrítica y verificación antes de publicar.',src:'./EXECUTION_CHECKLIST_V1.md'},
        {id:'labs-index',label:'Parallel Labs Index',description:'Índice técnico de labs.',src:'../demos/coliseo-labs/'}
      ]
    }
  ]
};