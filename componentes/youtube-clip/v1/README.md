# PROMETEO · YouTubeClip v1

**Reusable screen component: URL + start + end → playback inside any browser app.** Not a presentation, not a montage, not a video file download. Other AIs should read **this file and manifest.json**, not reconstruct earlier chat experiments.

## Minimal integration

```html
<div id="screen" style="width:640px;height:360px"></div>
<button id="go" type="button">VER</button>
<button id="next" type="button">OTRO FRAGMENTO</button>
<script src="./player.js"></script>
<script>
const screen = PrometeoYouTubeClip.create({
  target:'#screen', url:'https://youtu.be/CgIGel3zXEI', start:'02:36', end:'03:16',
  onEnd: () => console.log('clip ended'),
  onError: error => console.error(error)
});
// From a real user click (necessary in some browsers):
document.getElementById("go").onclick = () => screen.play();
// Same YouTube URL, another cut, without recreating the app:
document.getElementById("next").onclick = () => {screen.load({url:'https://youtu.be/CgIGel3zXEI',start:'05:57',end:'06:58'});screen.play()};
// When leaving the 3D room or changing screens:
// screen.stop(); screen.destroy();
</script>
```

The actual public demo imports this file from a path next to the page. `create` returns `{element,ready,startup,load,play,stop,destroy,state,clip}`. URL can be normal watch link, youtu.be, shorts, live, embed URL or bare 11-character ID. Time supports seconds (number) and `mm:ss` / `hh:mm:ss`.

## Three.js (CSS3D)

```js
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
const mount = document.createElement('div');
mount.style.cssText = 'width:960px;height:540px;';
document.body.appendChild(mount); // Connect the DOM before starting the iframe
const player = PrometeoYouTubeClip.create({
  target:mount, url:'https://youtu.be/CgIGel3zXEI', start:156, end:196
});
const screen = new CSS3DObject(mount);
screen.scale.setScalar(0.003); // scales the DOM plane into the 3D world
screen.position.set(0, 2, -3);
scene.add(screen); // and render using CSS3DRenderer
// Call player.play() from an actual button/touch user interaction.
```

**Important:** Do not claim that the iframe can be read as a `THREE.VideoTexture`, because cross-origin protections prevent reading YouTube pixels in WebGL. For in-world flat screens CSS3DRenderer can align the DOM plane to the 3D world; more realistic physical lighting, pixel-based shaders or guaranteed clean UI require an actual media file with suitable access permissions.

## Verified technical boundary

- `YT.Player.cueVideoById` and `YT.Player.loadVideoById({videoId,startSeconds,endSeconds})` are officially documented by YouTube. `onStateChange`, `onAutoplayBlocked`, `getCurrentTime`, `stop/pause`, and `onError` supply control and status.
- `controls:0` hides player controls when supported, but **does not remove platform ads, title, branding or all controls**. `modestbranding` is deprecated. A user gesture may be required to start audio on mobile. This module deliberately does **not** attempt to circumvent platform ad insertion or cross-origin restrictions.
- Start and end are not guaranteed sample-accurate. `endSeconds` applies to the currently loaded clip; the local boundary watcher stops near the requested end as a fallback.
- The component embeds a YouTube player and streams from YouTube. No download, vidIQ, transcript or GitHub Action necessary, no credits.
- HTTP serving is required for a consistent IFrame API origin; do not open by `file://`.

## QA

`python3 -m unittest discover -s tests -p 'test_component.py' -v`

Browser tests use a **stub of the YouTube IFrame API** to validate component integration, 2D/3D DOM geometry, URL/timestamp parsing, callbacks and reuse. They do **not** prove real YouTube streaming, bypass advertising or automatic audio on Android. The live link is a candidate until a real-device check.

Sources: https://developers.google.com/youtube/iframe_api_reference and https://threejs.org/docs/pages/CSS3DRenderer.html.
