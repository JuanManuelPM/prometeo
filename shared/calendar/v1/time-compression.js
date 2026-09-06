/* Prometeo Calendar · adaptive time-axis compression
   Canonical visual contract:
   - the visible range is cropped to real timed activity;
   - a whole-week internal empty span >= 90 min becomes ONE passive full-width band;
   - the band says only TIEMPO LIBRE;
   - it has no duration, day dividers, focus, click, expansion or hidden interaction. */
(function(){
  const GAP_MINUTES=90;

  function timedItemsForDate(dateISO){
    return [
      ...universityForDate(dateISO),
      ...personalEventsForDate(dateISO),
      ...classesForDate(dateISO),
      ...timedOpportunitiesForDate(dateISO),
      ...gamesForDate(dateISO)
    ].filter(item=>Number.isFinite(item.start)&&Number.isFinite(item.duration)&&item.duration>0);
  }

  function weekTimedItems(dates=visibleDates()){
    const items=[];
    dates.forEach(d=>{
      const dateISO=isoDate(d);
      timedItemsForDate(dateISO).forEach(item=>items.push({dateISO,item}));
    });
    return items;
  }

  function roundedWeekRange(dates=visibleDates()){
    const entries=weekTimedItems(dates);
    if(!entries.length)return {start:BASE_START,end:BASE_START+30,empty:true};
    let start=24*60,end=0;
    entries.forEach(({item})=>{
      start=Math.min(start,item.start);
      end=Math.max(end,item.start+item.duration*60);
    });
    start=Math.max(0,Math.floor(start/30)*30);
    end=Math.min(24*60,Math.ceil(end/30)*30);
    if(end<=start)end=Math.min(24*60,start+30);
    return {start,end,empty:false};
  }

  /* Replace the old 13:00–20:00 baseline with the actual visible-week envelope. */
  rangeForWeek=function(){
    const {start,end}=roundedWeekRange();
    return {start,end};
  };

  function occupiedBins(dates,range){
    const occupied=new Set();
    weekTimedItems(dates).forEach(({item})=>{
      const s=Math.max(range.start,Math.floor(item.start/30)*30);
      const e=Math.min(range.end,Math.ceil((item.start+item.duration*60)/30)*30);
      for(let t=s;t<e;t+=30)occupied.add(t);
    });
    return occupied;
  }

  function commonGaps(dates,range){
    const occupied=occupiedBins(dates,range),gaps=[];
    let gapStart=null;
    for(let t=range.start;t<range.end;t+=30){
      if(!occupied.has(t)){
        if(gapStart===null)gapStart=t;
      }else if(gapStart!==null){
        if(t-gapStart>=GAP_MINUTES)gaps.push({start:gapStart,end:t});
        gapStart=null;
      }
    }
    if(gapStart!==null&&range.end-gapStart>=GAP_MINUTES)gaps.push({start:gapStart,end:range.end});
    return gaps.filter(g=>g.start>range.start&&g.end<range.end);
  }

  function makeBreakBand(){
    const band=document.createElement('div');
    band.className='cell time-break-band';
    band.setAttribute('role','separator');
    band.setAttribute('aria-label','Tiempo libre comprimido');
    band.textContent='TIEMPO LIBRE';
    return band;
  }

  function markEdge(cells,className){
    cells.forEach(cell=>cell.classList.add(className));
  }

  function compressRenderedGrid(){
    const dates=visibleDates(),range=rangeForWeek(),children=Array.from(grid.children);
    if(children.length<8)return;

    const headers=children.slice(0,8);
    const rows=[];
    let cursor=8;
    for(let t=range.start;t<range.end;t+=30){
      rows.push({t,cells:children.slice(cursor,cursor+8)});
      cursor+=8;
    }

    if(!weekTimedItems(dates).length){
      const frag=document.createDocumentFragment();
      headers.forEach(h=>frag.appendChild(h));
      const emptyCells=[];
      for(let i=0;i<8;i++){
        const c=document.createElement('div');
        c.className='cell time-empty-cell';
        if(i===0)c.textContent='—';
        if(i===1){c.classList.add('time-empty-message');c.textContent='Sin actividades con hora esta semana';}
        emptyCells.push(c);frag.appendChild(c);
      }
      grid.replaceChildren(frag);
      return;
    }

    const gapByStart=new Map(commonGaps(dates,range).map(g=>[g.start,g]));
    const frag=document.createDocumentFragment();
    headers.forEach(h=>frag.appendChild(h));
    const visibleRows=[];

    for(let i=0;i<rows.length;){
      const row=rows[i],gap=gapByStart.get(row.t);
      if(gap){
        frag.appendChild(makeBreakBand());
        while(i<rows.length&&rows[i].t<gap.end)i++;
        continue;
      }
      row.cells.forEach(c=>frag.appendChild(c));
      visibleRows.push(row);
      i++;
    }

    if(visibleRows.length){
      markEdge(visibleRows[0].cells,'time-edge-start');
      markEdge(visibleRows[visibleRows.length-1].cells,'time-edge-end');
    }
    grid.replaceChildren(frag);
  }

  const baseRender=render;
  render=function(){
    baseRender();
    compressRenderedGrid();
  };

  window.PrometeoCalendarTimeCompression=Object.freeze({
    version:'2-passive-band',
    GAP_MINUTES,
    weekTimedItems,
    commonGaps,
    render:compressRenderedGrid
  });
})();
