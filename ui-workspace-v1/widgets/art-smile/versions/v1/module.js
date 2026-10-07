Prometeo.registerWidget({
 id:'art-smile',name:'IMAGEN I',version:1,widgetApi:1,defaultHeight:340,pages:[{title:'IMAGEN I'}],
 css:`
 [data-widget="art-smile"] .widget-content{padding:0!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;background:#0a0a0a}
 .art-smile-wrap{width:100%;height:100%;display:flex;align-items:flex-start;justify-content:center;background:#0a0a0a;overflow:hidden}
 .art-smile-img{display:block;width:min(100%,736px);height:auto;max-height:none;object-fit:contain}
 `,
 render(){return '<div class="art-smile-wrap"><img class="art-smile-img" src="assets/art/how-to-smile.jpg" alt=""></div>';},
 afterRender({root,widgetState}){
  const img=root?.querySelector('.art-smile-img');if(!img)return;
  const fit=()=>{if(widgetState.editing||widgetState.full||widgetState.min)return;const w=Math.min(root.clientWidth,736);root.style.height=Math.round(44+w*(569/736))+'px';};
  if(img.complete)fit();else img.addEventListener('load',fit,{once:true});
 }
});