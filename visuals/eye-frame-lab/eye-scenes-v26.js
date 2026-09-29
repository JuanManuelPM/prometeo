window.EYE_SCENES_V26 = {
  version:'V26',
  innerResolution:[32,20],
  defaults:{fps:9,hue:0,steps:24,mediaUrl:'https://upload.wikimedia.org/wikipedia/commons/e/ef/Horizontal_saccades.webm',pointerFps:9,gazeXSteps:9,gazeYSteps:7},
  scenes:[
    {id:'pointer_follow',label:'MOUSE · FOLLOW',type:'pointer',interaction:'blink',fps:9,fill:'#ffffff',pupil:'#000000',shape:'circle',radius:.24},
    {id:'pointer_dilate',label:'MOUSE · CLICK DILATE',type:'pointerDilate',interaction:'dilateToggle',fps:10,fill:'#ffffff',pupil:'#000000',shape:'circle',radius:.22,steps:22,durationMs:1900,holdMs:420},
    {id:'pointer_color',label:'MOUSE · CLICK COLOR',type:'pointerStyle',interaction:'cycleColor',fps:9,fill:'#ffffff',pupil:'#000000',shape:'circle',radius:.24,colors:['#ffffff','#b40000','#0057ff','#e7ff00','#ff42c8','#00d7a5','#000000']},
    {id:'pointer_shape',label:'MOUSE · CLICK SHAPE',type:'pointerStyle',interaction:'cycleShape',fps:9,fill:'#ffffff',pupil:'#000000',shape:'circle',radius:.26,shapes:['circle','oval','diamond','slit','cross','star','dot']},
    {id:'pointer_combo',label:'MOUSE · CLICK MUTATE',type:'pointerStyle',interaction:'cycleCombo',fps:8,fill:'#ffffff',pupil:'#000000',shape:'circle',radius:.24,colors:['#ffffff','#b40000','#111111','#75e8ff','#f2dc4b'],shapes:['circle','slit','diamond','star','dot']},
    {id:'play_audio', label:'PLAY · AUDIO BENT', type:'audioBent', audio:true, lineCount:9, fps:9},
    {id:'dilate_slow', label:'DILATE · 24 STEPS', type:'dilate', steps:24, fps:10, fill:'#ffffff', pupil:'#000000', from:.10, to:.72, holdMs:360},
    {id:'contract_red', label:'CONTRACT · RED REVEAL', type:'contractReveal', steps:22, fps:10, fill:'#b40000', pupil:'#000000', from:.72, to:.07, holdMs:360},
    {id:'media_reveal', label:'VIDEO · REVEAL', type:'mediaReveal', steps:22, fps:9, pupil:'#000000', from:.72, to:.09, media:true},
    {id:'video_pupil', label:'VIDEO · PUPIL WINDOW', type:'videoPupil', steps:16, fps:8, fill:'#ffffff', media:true},
    {id:'hue_cycle', label:'COLOR · INFINITE', type:'hueCycle', steps:36, fps:9, hueStep:17, pupil:'#000000'},
    {id:'shape_morph', label:'IRIS · MORPH', type:'shapeMorph', fps:8, fill:'#ffffff', pupil:'#000000', shapes:['dot','circle','oval','diamond','slit','cross','star','circle']},
    {id:'scan_8way', label:'GAZE · 8 WAY', type:'scan', fps:8, fill:'#ffffff', pupil:'#000000', path:[[0,0],[-1,0],[-2,0],[-2,-1],[0,-1],[2,-1],[2,0],[2,1],[0,1],[-2,1],[0,0]]},
    {id:'inverse_audio', label:'AUDIO · INVERSE', type:'audioBent', audio:true, inverse:true, lineCount:7, fps:8}
  ]
};