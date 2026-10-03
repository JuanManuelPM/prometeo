from pathlib import Path
p = Path('current-tree/control-v11/chat-canary/tests/correlation-retention-v1.test.cjs')
text = p.read_text(encoding='utf-8')
old = """  ctx.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = {submit:async()=>queued('page-change:other', returnPath)};
  const mismatch = await ctx.PROMETEO_INGRESS_V1.submit({text:'mismatch',page:{page_id:'control-v11-chat-canary'}});
  assert.equal(mismatch.queued,false);
  assert.ok(String(mismatch.error||'').includes('PRIVATE_CORRELATION'));
  assert.equal(shared.getItem(helper.storage_key),rawStored);
"""
new = """  ctx.PROMETEO_GITHUB_INGRESS_TRANSPORT_V1 = {submit:async()=>queued('page-change:other', returnPath)};
  const mismatch = await ctx.PROMETEO_CHAT_CANARY_INPUT_V1.submitText({text:'mismatch',ingress:ctx.PROMETEO_INGRESS_V1});
  assert.equal(mismatch.queued,false);
  assert.equal(mismatch.error,'CORRELATION_CONFLICT');
  assert.equal(shared.getItem(helper.storage_key),rawStored);
"""
if text.count(old) != 1:
    raise SystemExit(f'mismatch anchor count={text.count(old)}')
p.write_text(text.replace(old,new,1), encoding='utf-8')
print('TESTFIX_G3_PASS')
