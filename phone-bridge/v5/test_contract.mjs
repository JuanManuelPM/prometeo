import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {composeWorkPacket, prepareReturn, verifyReturn, snapshotProject, compareSnapshots, SHA256} from './contract.mjs';

const id = 'JOB-CI-20261021';
const privateRepo = {full_name:'JuanManuelPM/pruebas',private:true,permissions:{push:true}};

test('Work handoff requires a private writable repository', () => {
  const x=composeWorkPacket({job_id:id,project_id:'riel',prompt:'Change one file'},privateRepo);
  assert.equal(x.apply,'CANDIDATE_ONLY');
  assert.match(x.prompt_path,/work\/jobs\/JOB-CI-20261021\/prompt.md/);
  assert.throws(()=>composeWorkPacket({job_id:id,project_id:'riel',prompt:'x'}, {...privateRepo,private:false}));
});

test('small and multipart delivery roundtrip; tampering refused', () => {
  for(const bytes of [Buffer.from('ABC'),Buffer.alloc(1_500_012,19)]){
    const box=prepareReturn({job_id:id,filename:'entrega.zip',bytes});
    const got=verifyReturn(box.manifest, name=>box.objects[name]);
    assert.deepEqual(got.bytes,bytes);
    assert.equal(got.acceptance,'CANDIDATE_ONLY');
    assert.throws(()=>verifyReturn({...box.manifest,sha256:'0'.repeat(64)},name=>box.objects[name]));
  }
});

test('rejects path traversal and malformed returned files', () => {
  assert.throws(()=>prepareReturn({job_id:id,filename:'../secret.zip',bytes:Buffer.from('x')}));
  assert.throws(()=>prepareReturn({job_id:id,filename:'entrega.zip',bytes:Buffer.alloc(0)}));
});

test('project inventory excludes dotfiles, tokens and symlinks', t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-fixture-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  fs.writeFileSync(path.join(dir,'index.html'),'safe');
  fs.writeFileSync(path.join(dir,'.env'),'password');
  fs.writeFileSync(path.join(dir,'api-token.txt'),'do not share');
  fs.symlinkSync('/etc/passwd',path.join(dir,'external'));
  const snap=snapshotProject(dir,{project_id:'riel'});
  assert.deepEqual(snap.files.map(x=>x.path),['index.html']);
  assert.equal(snap.contains_file_content,false);
});

test('three-way conflict is surfaced, never silently merged', () => {
  const mk=(value)=>({schema:'prometeo.project-snapshot/v1',project_id:'riel',files:[{path:'main.html',sha256:SHA256(value)}]});
  const changes=compareSnapshots(mk('base'),mk('phone'),mk('pc'));
  assert.equal(changes[0].decision,'CONFLICT');
});
