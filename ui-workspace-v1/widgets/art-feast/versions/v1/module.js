Prometeo.registerWidget({
 id:'art-feast',name:'IMAGEN II',version:1,widgetApi:1,defaultHeight:420,pages:[{title:'IMAGEN II'}],
 css:`
 [data-widget="art-feast"] .widget-content{padding:0!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;background:#0a0a0a}
 .art-feast-wrap{width:100%;height:100%;display:flex;align-items:flex-start;justify-content:center;background:#0a0a0a;overflow:hidden}
 .art-feast-img{display:block;width:min(100%,735px);height:auto;max-height:none;object-fit:contain}
 `,
 render(){return '<div class="art-feast-wrap"><img class="art-feast-img" src="assets/art/feast-mouth.jpg" alt=""></div>';},
 afterRender({root,widgetState}){
  const img=root?.querySelector('.art-feast-img');if(!img)return;
  const fit=()=>{if(widgetState.editing||widgetState.full||widgetState.min)return;const w=Math.min(root.clientWidth,735);root.style.height=Math.round(44+w*(738/735))+'px';};
  if(img.complete)fit();else img.addEventListener('load',fit,{once:true});
 }
});