window.P48_DATA=(()=>{
const I={
 note:'<svg viewBox="0 0 24 24"><path d="M6 5h12v14H6z"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>',
 files:'<svg viewBox="0 0 24 24"><path d="M3.8 8.5h6.1l1.8 2h8.5v7.6H3.8z"/><path d="M3.8 8.5V6.2h6.1l1.7 2.3"/></svg>',
 back:'<svg viewBox="0 0 24 24"><path d="M15 6 9 12l6 6"/></svg>',
 folder:'<svg viewBox="0 0 24 24"><path d="M3.5 7.6h6.2l1.8 2h9v8.8h-17z"/><path d="M3.5 7.6V5.8h6.2l1.7 1.8"/></svg>',
 page:'<svg viewBox="0 0 24 24"><path d="M6.5 3.5h7l4 4v13h-11z"/><path d="M13.5 3.5v4h4M9.5 12h5M9.5 15h5"/></svg>'
};
const ROOT_MENU=[{id:'note',name:'Nueva nota',icon:I.note,action:'note'},{id:'files',name:'Páginas',icon:I.files,action:'nav'},{id:'back',name:'Volver',icon:I.back,action:'back'}];
const TREE={id:'root',name:'/',type:'folder',children:[
{id:'prometeo',name:'Prometeo',type:'folder',children:[
{id:'live',name:'Live',type:'page',href:'/prometeo/experiments/prometeo-live/'},
{id:'remote',name:'Remoto',type:'page',href:'/prometeo/experiments/prometeo-remote/'},
{id:'tv',name:'TV simple',type:'page',href:'/prometeo/experiments/prometeo-tv-simple/'}]},
{id:'projects',name:'Proyectos',type:'folder',children:[
{id:'student',name:'Student World',type:'page',href:'/prometeo/pages/PROMETEO_STUDENT_WORLD_MAP_FIXED_OPEN_ME.html'},
{id:'jose',name:'José',type:'folder',children:[
{id:'jose-home',name:'Materia',type:'page',href:'/prometeo/pages/PAGINA_MATERIA_JOSE_RECONSTRUCTION.html'},
{id:'jose-index',name:'Index Laws',type:'page',href:'/prometeo/pages/Prometeo/PROMETEO_JOSE_CLASE_INDEX_LAWS_V4.html'},
{id:'jose-quimica',name:'Química',type:'page',href:'/prometeo/pages/Prometeo/JOSE_QUIMICA_FINAL.html'}]},
{id:'class-player',name:'Class Player',type:'page',href:'/prometeo/pages/PROMETEO_CLASS_PLAYER_ULTIMA_VERSION_BUENA_v26.html'},
{id:'vault',name:'Visual Vault',type:'page',href:'/prometeo/pages/PROMETEO_STUDENT_VISUAL_VAULT.html'}]},
{id:'tools',name:'Herramientas',type:'folder',children:[{id:'tts',name:'Texto → Voz',type:'page',href:'/prometeo/pages/audio-demo/'}]},
{id:'legacy',name:'Legado',type:'folder',children:[{id:'old',name:'Prometeo anterior',type:'page',href:'/prometeo/legacy/prometeo-v5/',external:true}]}
]};
return{I,ROOT_MENU,TREE};})();
