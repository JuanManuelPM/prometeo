window.EYE_SCENES_V27={
 version:'V27',innerResolution:[32,20],
 defaults:{pointerFps:10,angleSteps:24,radialSteps:6,pupilRadius:.34,edgePeek:.58},
 scenes:[
  {id:'follow',label:'MOUSE · FULL FOLLOW',type:'follow',fill:'#fff',pupil:'#000',shape:'circle',radius:.34},
  {id:'dilate',label:'CLICK · DILATE / CONTRACT',type:'dilate',fill:'#fff',pupil:'#000',shape:'circle',radius:.34,steps:26,duration:2400},
  {id:'color',label:'CLICK · COLOR',type:'color',fill:'#fff',pupil:'#000',shape:'circle',radius:.34,colors:['#fff','#b40000','#0057ff','#e7ff00','#ff42c8','#00d7a5','#000']},
  {id:'shape',label:'CLICK · SHAPE',type:'shape',fill:'#fff',pupil:'#000',shape:'circle',radius:.36,shapes:['circle','oval','diamond','slit','cross','star','dot']},
  {id:'combo',label:'CLICK · MUTATE',type:'combo',fill:'#fff',pupil:'#000',shape:'circle',radius:.34,colors:['#fff','#b40000','#111','#75e8ff','#f2dc4b'],shapes:['circle','slit','diamond','star','dot']},
  {id:'audio',label:'PLAY · FULL SPECTRUM',type:'audio'}
 ]
};