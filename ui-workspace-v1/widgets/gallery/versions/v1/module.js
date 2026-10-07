Prometeo.registerWidget({
 id:'gallery',name:'IMÁGENES',version:1,widgetApi:1,defaultHeight:300,
 pages:[{title:'IMÁGENES'},{title:'I'},{title:'II'}],
 css:`
 [data-widget="gallery"] .widget-content{padding:0;background:#0a0a0a}
 .gal{width:100%;height:100%;overflow:hidden;background:#0a0a0a}
 .gal-grid{display:grid;grid-template-columns:1.35fr .9fr;gap:4px;width:100%;height:100%;padding:4px}
 .gal-img{width:100%;height:100%;object-fit:cover;display:block;min-width:0;min-height:0}
 .gal-grid .gal-img:first-child{object-position:center 46%}.gal-grid .gal-img:last-child{object-position:center 35%}
 .gal-single{width:100%;height:100%;display:grid;place-items:center;background:#090909}
 .gal-single img{width:100%;height:100%;object-fit:contain;display:block}
 @container (max-width:330px){.gal-grid{grid-template-columns:1.2fr .8fr;gap:3px;padding:3px}}
 `,
 render(ctx){
   const a='assets/art/how-to-smile.jpg',b='assets/art/feast-mouth.jpg';
   if(ctx.page===1)return '<div class="gal gal-single"><img src="'+a+'" alt=""></div>';
   if(ctx.page===2)return '<div class="gal gal-single"><img src="'+b+'" alt=""></div>';
   return '<div class="gal gal-grid"><img class="gal-img" src="'+a+'" alt=""><img class="gal-img" src="'+b+'" alt=""></div>';
 }
});