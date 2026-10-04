import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = new URL('../../../current-tree/control-v11/work-score/index.html', import.meta.url);
const html = fs.readFileSync(path, 'utf8');

assert.match(html, /id="chatOpen"[^>]*type="button"/);
assert.match(html, /id="chatDock"[^>]*aria-hidden="true"/);
assert.match(html, /id="chatClose"[^>]*type="button"/);
assert.match(html, /<iframe[^>]*id="chatFrame"[^>]*src="\.\.\/chat-canary\/\?embed=1"[^>]*><\/iframe>/);

const open = html.match(/\$\('chatOpen'\)\.onclick=\(\)=>\{([^}]*)\}/)?.[1] || '';
const close = html.match(/\$\('chatClose'\)\.onclick=\(\)=>\{([^}]*)\}/)?.[1] || '';
assert.match(open, /classList\.add\('open'\)/);
assert.match(open, /setAttribute\('aria-hidden','false'\)/);
assert.match(close, /classList\.remove\('open'\)/);
assert.match(close, /setAttribute\('aria-hidden','true'\)/);

assert.match(html, /e\.key==='Escape'&&chatDock\.classList\.contains\('open'\)/);
assert.doesNotMatch(open + close, /location\s*\.|location\s*=|reload\s*\(|replace\s*\(|assign\s*\(/);
assert.doesNotMatch(html, /<a[^>]+href="\.\.\/chat-canary\//);
assert.equal((html.match(/id="chatFrame"/g) || []).length, 1);
assert.equal((html.match(/src="\.\.\/chat-canary\/\?embed=1"/g) || []).length, 1);

console.log('PRIMARY_CHAT_WORK_SCORE_EMBED_PASS');
