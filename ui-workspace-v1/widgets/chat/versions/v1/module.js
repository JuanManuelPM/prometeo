Prometeo.registerWidget({
  id:'chat',
  name:'CHAT',
  version:1,
  widgetApi:1,
  defaultHeight:280,
  pages:[{title:'CHAT'},{title:'CONTEXT'},{title:'FILES'},{title:'HISTORY'}],
  css:`
    .chat-placeholder{width:100%;height:100%;display:grid;place-items:center}
  `,
  render(ctx){
    const names=['Primary Chat','Context','Files','History'];
    return `<div class="chat-placeholder">${names[ctx.page]||'Primary Chat'}</div>`;
  }
});
