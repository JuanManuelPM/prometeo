import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

const checks=[
  ['manifest donor',"fetch(LIVE_BASE+'live-manifest.json"],
  ['session persistence',"sessionStorage.setItem('prometeo.live-tv.session'"],
  ['capability fragment',"location.hash.startsWith('#controller:')"],
  ['invalid join guard',"throw new Error('invalid join capability')"],
  ['presence sync',".on('presence',{event:'sync'},syncPresence)"],
  ['reconnect hello',"if(connected){await channel.track"],
  ['controller resync',"else sendHello()"],
  ['missing-display recovery',"if(role==='controller'&&displayOnline&&!remoteState)sendHello()"],
  ['state request',"makeEnvelope('state.request'"],
  ['surface control',"command('surface.select'"],
  ['runtime URL surface',"command('surface.open'"],
  ['video play',"data-media=\"media.play\""],
  ['video pause',"data-media=\"media.pause\""],
  ['video seek',"data-media=\"media.seek\""],
  ['same Supabase Realtime transport',"sb.channel(topic"],
];
for(const [name,needle] of checks)assert.ok(html.includes(needle),`${name} wiring missing`);
assert.ok(!html.includes('live-manifest.json\",'), 'candidate must not embed a manifest rewrite');
console.log(`live-tv-page: ${checks.length+1} wiring checks passed`);
