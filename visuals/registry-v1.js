window.PROMETEO_VISUALS_REGISTRY_V1={
  version:'PROMETEO_VISUALS_REGISTRY_V1',
  defaultPage:'production',
  folders:[
    {
      id:'work-current',label:'Trabajo actual',open:true,
      items:[
        {id:'workbench',label:'📌 Trabajo actual',description:'Nuevos, en trabajo y listos para revisar.',src:'./workbench/'}
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
      id:'labs',label:'Laboratorios',open:false,
      items:[
        {id:'lab-live',label:'Live Dynamics',description:'Semántica causal.',src:'../demos/coliseo-live/'},
        {id:'lab-workers',label:'Workers / Avatars',description:'Cuerpos y poses.',src:'../demos/coliseo-workers/'},
        {id:'lab-animation',label:'Animation',description:'Motion language.',src:'../demos/coliseo-animation/'},
        {id:'lab-maps',label:'Maps / World',description:'Mundo y cámara.',src:'../demos/coliseo-maps/'},
        {id:'lab-materials',label:'Materials / FX',description:'Primitivas y materiales.',src:'../demos/coliseo-materials/'},
        {id:'lab-hud',label:'HUD',description:'Información y semantic zoom.',src:'../demos/coliseo-hud/'},
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
        {id:'labs-index',label:'Parallel Labs Index',description:'Índice técnico de labs.',src:'../demos/coliseo-labs/'}
      ]
    }
  ]
};