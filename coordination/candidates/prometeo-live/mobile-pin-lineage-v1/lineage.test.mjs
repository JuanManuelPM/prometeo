import test from 'node:test';
import assert from 'node:assert/strict';
import { compactOwner, formatLineage, indexFeed } from './lineage.mjs';

test('formats winner generation, owner and collisions compactly', () => {
  const text = formatLineage({pin_generation:1, owner:'wc-20260917T191645Z-gpt56sol-7c91', collision_count:2, authority_mode:'pin'});
  assert.match(text, /PIN G000001/);
  assert.match(text, /dueño wc-20260…l-7c91/);
  assert.match(text, /2 colisiones/);
  assert.doesNotMatch(text, /recuperación/);
});

test('marks recovery lineage from generation or authority mode', () => {
  const text = formatLineage({pin_generation:2, owner:'worker-b', collision_count:1, authority_mode:'recovery-pin'});
  assert.equal(text, 'PIN G000002 · dueño worker-b · 1 colisión · recuperación');
});

test('indexes published static feed by worker and job id', () => {
  const indexed = indexFeed({workers:[{worker_id:'w1',job_id:'j1'}],projects:[{jobs:[{job_id:'j1',pin_generation:3}]}]});
  assert.equal(indexed.workers.get('w1').job_id, 'j1');
  assert.equal(indexed.jobs.get('j1').pin_generation, 3);
});

test('compactOwner does not expose long worker ids in full', () => {
  assert.equal(compactOwner('short-worker'), 'short-worker');
  assert.equal(compactOwner('abcdefghijklmnopqrstuvwxyz'), 'abcdefgh…uvwxyz');
});
