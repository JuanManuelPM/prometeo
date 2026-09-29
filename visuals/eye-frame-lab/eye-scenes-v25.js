window.EYE_SCENES_V25 = {
  version: 'V25',
  innerResolution: [32, 20],
  defaults: {
    fps: 10,
    hue: 0,
    steps: 20,
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Horizontal_saccades.webm'
  },
  scenes: [
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
