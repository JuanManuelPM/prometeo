export const MENU = Object.freeze({
  id:'root', title:'Prometeo', items:[
    {id:'record',label:'Grabar una nota',action:'record'},
    {id:'notes',label:'Notas y trabajo',action:'notes'},
    {id:'prometeo',label:'Prometeo',items:[
      {id:'live',label:'Prometeo Live',href:'/prometeo/experiments/prometeo-live/'},
      {id:'remote',label:'Remoto',href:'/prometeo/experiments/prometeo-remote/'},
      {id:'tv-simple',label:'TV simple',href:'/prometeo/experiments/prometeo-tv-simple/'}
    ]},
    {id:'tools',label:'Herramientas',items:[
      {id:'voice-text',label:'Voz → Texto',href:'/prometeo/experiments/capture-lab/'},
      {id:'text-voice',label:'Texto → Voz',href:'/prometeo/pages/audio-demo/'}
    ]},
    {id:'study',label:'Proyectos',items:[
      {id:'student-world',label:'Student World',href:'/prometeo/pages/PROMETEO_STUDENT_WORLD_MAP_FIXED_OPEN_ME.html'},
      {id:'jose',label:'José',items:[
        {id:'jose-hub',label:'Materia',href:'/prometeo/pages/PAGINA_MATERIA_JOSE_RECONSTRUCTION.html'},
        {id:'jose-index',label:'Index Laws',href:'/prometeo/pages/Prometeo/PROMETEO_JOSE_CLASE_INDEX_LAWS_V4.html'},
        {id:'jose-quimica',label:'Química',href:'/prometeo/pages/Prometeo/JOSE_QUIMICA_FINAL.html'}
      ]},
      {id:'class-player',label:'Class Player',href:'/prometeo/pages/PROMETEO_CLASS_PLAYER_ULTIMA_VERSION_BUENA_v26.html'},
      {id:'student-vault',label:'Visual Vault',href:'/prometeo/pages/PROMETEO_STUDENT_VISUAL_VAULT.html'}
    ]},
    {id:'legacy',label:'Legado',items:[
      {id:'legacy-v5',label:'Prometeo anterior',href:'/prometeo/legacy/prometeo-v5/'}
    ]}
  ]
});
