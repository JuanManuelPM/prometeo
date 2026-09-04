/* Prometeo Calendar · adaptive time-axis compression
   The time axis is truthful where activity exists and explicitly marks skipped empty spans.
   Top/bottom are cropped to the first/last timed activity of the visible week.
   Internal gaps are compressed only when the whole week is empty for >= 90 minutes. */
(function(){
  const GAP_MINUTES=90;
  const expandedGaps=new Set();

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
    /* Range already crops top/bottom, so only true internal gaps should survive. */
    return gaps.filter(g=>g.start>range.start&&g.end<range.end);
  }

  function gapKey(gap){
    return `${isoDate(weekStart)}|${gap.start}-${gap.end}`;
  }

  function durationLabel(minutes){
    const h=Math.floor(minutes/60),m=minutes%60;
    if(h&&m)return `${h} h ${m}`;
    if(h)return `${h} h`;
    return `${m} min`;
  }

  function makeBreakCells(gap){
    const cells=[];
    const key=gapKey(gap);
    for(let i=0;i<8;i++){
      const cell=document.createElement("button");
      cell.type="button";
      cell.className="cell time-break-cell"+(i===0?" time-break-label-cell":"");
      cell.setAttribute("aria-label",`Tramo comprimido: ${minutesLabel(gap.start)} a ${minutesLabel(gap.end)}. Tocar para mostrar.`);
      if(i===0){
        const label=document.createElement("span");
        label.className="time-break-label";
        label.textContent=`↕ ${durationLabel(gap.end-gap.start)}`;
        cell.appendChild(label);
      }
      cell.onclick=()=>{
        expandedGaps.add(key);
        render();
      };
      cells.push(cell);
    }
    return cells;
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

    const hasTimed=weekTimedItems(dates).length>0;
    if(!hasTimed){
      const frag=document.createDocumentFragment();
      headers.forEach(h=>frag.appendChild(h));
      const emptyCells=[];
      for(let i=0;i<8;i++){
        const c=document.createElement("div");
        c.className="cell time-empty-cell";
        if(i===0)c.textContent="—";
        if(i===1){c.classList.add("time-empty-message");c.textContent="Sin actividades con hora esta semana";}
        emptyCells.push(c);frag.appendChild(c);
      }
      grid.replaceChildren(frag);
      return;
    }

    const gaps=commonGaps(dates,range).filter(g=>!expandedGaps.has(gapKey(g)));
    const gapByStart=new Map(gaps.map(g=>[g.start,g]));
    const frag=document.createDocumentFragment();
    headers.forEach(h=>frag.appendChild(h));
    const visibleRows=[];

    for(let i=0;i<rows.length;){
      const row=rows[i],gap=gapByStart.get(row.t);
      if(gap){
        makeBreakCells(gap).forEach(c=>frag.appendChild(c));
        while(i<rows.length&&rows[i].t<gap.end)i++;
        continue;
      }
      row.cells.forEach(c=>frag.appendChild(c));
      visibleRows.push(row);
      i++;
    }

    if(visibleRows.length){
      markEdge(visibleRows[0].cells,"time-edge-start");
      markEdge(visibleRows[visibleRows.length-1].cells,"time-edge-end");
    }
    grid.replaceChildren(frag);
  }

  const baseRender=render;
  render=function(){
    baseRender();
    compressRenderedGrid();
  };

  window.PrometeoCalendarTimeCompression={
    GAP_MINUTES,
    weekTimedItems,
    commonGaps,
    expandAll(){commonGaps(visibleDates(),rangeForWeek()).forEach(g=>expandedGaps.add(gapKey(g)));render();},
    reset(){expandedGaps.clear();render();}
  };
})();
