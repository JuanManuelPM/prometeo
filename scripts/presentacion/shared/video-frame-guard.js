/* PROMETEO · VideoFrameGuard v1: reusable, no platform API, no tracker, no video UI.
   Contract: a clip is NOT visible until an actual frame reaches the compositor.
   Do not hide a playing <video> or any ancestor with display:none / visibility:hidden. */
(function (scope) {
  'use strict';
  const VERSION='prometeo.video-frame-guard/v1';
  function create(video) {
    if (!(video instanceof HTMLVideoElement)) throw new TypeError('Expected a video element');
    let generation=0, handle=null, interval=null, confirmed=false, method='NONE', mediaTime=null;
    let evidence={version:VERSION,confirmed:false,method:'NONE',reason:'NOT_ARMED'};
    function cancel() {
      generation++;
      if(handle!==null && typeof video.cancelVideoFrameCallback==='function'){
        try{video.cancelVideoFrameCallback(handle)}catch(e){}
      }
      if(interval!==null)clearInterval(interval);
      handle=interval=null;
      confirmed=false;method='NONE';mediaTime=null;
    }
    function composited() {
      if(!video.isConnected)return false;
      const rect=video.getBoundingClientRect();
      if(rect.width<2||rect.height<2)return false;
      for(let el=video;el;el=el.parentElement){
        const s=getComputedStyle(el);
        if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse'||Number(s.opacity)<.01)return false;
      }
      return true;
    }
    function arm(start,end,onReady) {
      cancel();
      const mine=generation,begin=Number(start),finish=Number(end);
      if(!Number.isFinite(begin)||!Number.isFinite(finish)||finish<=begin)throw new TypeError('Invalid clip bounds');
      const base=video.getVideoPlaybackQuality?.().totalVideoFrames??video.webkitDecodedFrameCount??0;
      const accept=(stamp,kind)=>{
        if(mine!==generation||confirmed)return false;
        const ok=video.videoWidth>=16&&video.videoHeight>=16&&!video.seeking&&composited() &&
          Number.isFinite(stamp)&&stamp>=begin-.25&&stamp<finish+.2&&
          video.currentTime>=begin-.4&&video.currentTime<finish+.4;
        evidence={version:VERSION,confirmed:ok,method:ok?kind:'NONE',
          reason:ok?'PRESENTED_VIDEO_FRAME':(!composited()?'VIDEO_HIDDEN_OR_ZERO_SIZE':'WAITING_FOR_FRAME'),
          mediaTime:stamp,width:video.videoWidth,height:video.videoHeight};
        if(ok){confirmed=true;method=kind;mediaTime=stamp;
          if(interval!==null){clearInterval(interval);interval=null}
          onReady({...evidence});
        }
        return ok;
      };
      if(typeof video.requestVideoFrameCallback==='function'){
        const frame=(timestamp,metadata)=>{
          if(mine!==generation||confirmed)return;
          if(!accept(metadata.mediaTime,'REQUEST_VIDEO_FRAME_CALLBACK'))handle=video.requestVideoFrameCallback(frame);
        };
        handle=video.requestVideoFrameCallback(frame);
        evidence={...evidence,reason:'WAITING_FOR_COMPOSITED_FRAME'};
      }else{
        // Older engines: count actual decoded frames. This is weaker than compositor evidence.
        interval=setInterval(()=>{
          if(mine!==generation||confirmed)return;
          const total=video.getVideoPlaybackQuality?.().totalVideoFrames??video.webkitDecodedFrameCount;
          if(typeof total==='number'&&total>base)accept(video.currentTime,'DECODED_FRAMES_FALLBACK');
          else evidence={...evidence,reason:'NO_FRAME_COUNTER_AVAILABLE'};
        },90);
      }
    }
    return {version:VERSION,arm,cancel,composited,evidence:()=>({...evidence}),ready:()=>confirmed};
  }
  scope.PrometeoVideoFrameGuard={VERSION,create};
})(window);
