import fs from 'node:fs';

const ingressPath = 'current-tree/control-v11/ingress-v1.js';
const changeLoopPath = 'supabase/functions/prometeo-change-loop-v1/index.ts';
const chatPath = 'current-tree/control-v11/chat-canary/index.html';

function replaceOnce(source, needle, replacement, label) {
  if (source.includes(replacement)) return source;
  const first = source.indexOf(needle);
  if (first < 0) throw new Error(`PATCH_NEEDLE_MISSING:${label}`);
  if (source.indexOf(needle, first + needle.length) >= 0) throw new Error(`PATCH_NEEDLE_AMBIGUOUS:${label}`);
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

let ingress = fs.readFileSync(ingressPath, 'utf8');
ingress = replaceOnce(
  ingress,
  "          }, secret);\n\n          const workItemId = cleanString(prepared.work_item_id, 160);",
  "          }, secret);\n\n          if (prepared && (prepared.replayed === true || prepared.status === 'QUEUED_REPLAY')) {\n            const replayRef = cleanString(prepared.return_path, 360);\n            if (!replayRef || !validDurableRef(replayRef)) {\n              throw Object.assign(new Error('APPROVAL_REPLAY_RECEIPT_INVALID'), { code: 'APPROVAL_REPLAY_RECEIPT_INVALID' });\n            }\n            return Object.freeze({ schema: RESULT_SCHEMA, status: 'QUEUED_REPLAY', ref: replayRef, queued: true, error: null });\n          }\n\n          const workItemId = cleanString(prepared.work_item_id, 160);",
  'ingress-server-replay-short-circuit'
);
ingress = replaceOnce(
  ingress,
  "            status: 'BOUNDARY_PRIVATE_STORAGE_UNAVAILABLE',\n            ref: null,\n            queued: false,\n            error: cleanString(error && (error.code || error.message || error.name), 180) || 'PRIVATE_TRANSPORT_FAILED'",
  "            status: error && error.code === 'APPROVAL_REPLAY_CONFLICT' ? 'BOUNDARY_APPROVAL_REPLAY_CONFLICT' : 'BOUNDARY_PRIVATE_STORAGE_UNAVAILABLE',\n            ref: null,\n            queued: false,\n            error: cleanString(error && (error.code || error.message || error.name), 180) || 'PRIVATE_TRANSPORT_FAILED'",
  'ingress-conflict-disposition'
);
fs.writeFileSync(ingressPath, ingress);

let changeLoop = fs.readFileSync(changeLoopPath, 'utf8');
const helperNeedle = "async function prepareExecution(req:Request,ws:any,body:any){";
const helper = `function executionApproval(value:any){
  if(value===undefined||value===null)return null;
  if(!value||typeof value!=='object'||Array.isArray(value))fail('APPROVAL_ENVELOPE_INVALID',400);
  if(String(value.decision||'').trim().toUpperCase()!=='APPROVED')fail('APPROVAL_NOT_EXPLICIT',403);
  const approvalId=String(value.approval_id||'').trim(),proposalId=String(value.proposal_id||'').trim(),proposalDigest=String(value.proposal_digest||'').trim().toLowerCase();
  if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(approvalId)||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(proposalId)||!/^[a-f0-9]{64}$/.test(proposalDigest))fail('APPROVAL_ENVELOPE_INVALID',400);
  return{approval_id:approvalId,proposal_id:proposalId,proposal_digest:proposalDigest};
}
async function existingApprovalExecution(wsId:string,pageId:string,approval:any){
  const q=await db.from('prometeo_execution_packets').select('work_item_id,status,return_path,snapshot').eq('workspace_id',wsId).eq('page_id',pageId).order('created_at',{ascending:false}).limit(200);
  if(q.error)throw q.error;
  const prefix='primary-chat-approval:'+approval.approval_id+':';
  for(const row of q.data||[]){
    const anchor=String(row?.snapshot?.context?.semantic_context?.semantic_anchor||'');
    if(!anchor.startsWith(prefix))continue;
    const digest=anchor.slice(prefix.length).toLowerCase();
    if(digest!==approval.proposal_digest)fail('APPROVAL_REPLAY_CONFLICT',409,{approval_id:approval.approval_id});
    return row;
  }
  return null;
}

`;
if (!changeLoop.includes('async function existingApprovalExecution(')) {
  changeLoop = replaceOnce(changeLoop, helperNeedle, helper + helperNeedle, 'change-loop-approval-helper');
}
const beginNeedle = "async function prepareExecution(req:Request,ws:any,body:any){if(body.human_approved!==true||body.intent!=='WORK_PAGE')fail('HUMAN_ACTION_REQUIRED',403);const deliveryMode=String(body.delivery_mode||'MANUAL_CHAT').toUpperCase();if(!['MANUAL_CHAT','WORKER_POOL'].includes(deliveryMode))fail('DELIVERY_MODE_INVALID',400);const pageId=String(body.page_id||'');const thread=await syncPage(ws.id,pageId,body.page_title||null,body.baseline||{});";
const beginReplacement = "async function prepareExecution(req:Request,ws:any,body:any){if(body.human_approved!==true||body.intent!=='WORK_PAGE')fail('HUMAN_ACTION_REQUIRED',403);const deliveryMode=String(body.delivery_mode||'MANUAL_CHAT').toUpperCase();if(!['MANUAL_CHAT','WORKER_POOL'].includes(deliveryMode))fail('DELIVERY_MODE_INVALID',400);const pageId=String(body.page_id||'');const approval=executionApproval(body.approval);if(approval){const replay=await existingApprovalExecution(ws.id,pageId,approval);if(replay)return json(req,{ok:true,status:'QUEUED_REPLAY',replayed:true,approval_receipt:true,work_item_id:replay.work_item_id,delivery_mode:deliveryMode,queued_to_worker_pool:deliveryMode==='WORKER_POOL',return_path:replay.return_path});}const thread=await syncPage(ws.id,pageId,body.page_title||null,body.baseline||{});";
changeLoop = replaceOnce(changeLoop, beginNeedle, beginReplacement, 'change-loop-replay-before-materialize');
fs.writeFileSync(changeLoopPath, changeLoop);

let chat = fs.readFileSync(chatPath, 'utf8');
const renderNeedle = "    function renderUiBlocks(message, host) {";
const renderApproval = `    function renderApproval(block) {
      const wrap = node('div', null, 'copy-widget');
      const head = node('div', null, 'copy-widget-head');
      const title = node('div', block.label || 'Aprobación', 'copy-widget-title');
      const approve = node('button', 'Aprobar', 'copy-button');
      const reject = node('button', 'No aprobar', 'copy-button');
      const feedback = node('div', null, 'copy-feedback');
      head.append(title, approve, reject);
      wrap.append(head, feedback);
      const approvalId = String(block.approval_id || '').trim();
      const proposalId = String(block.proposal_id || '').trim();
      const proposalDigest = String(block.proposal_digest || '').trim().toLowerCase();
      const valid = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(approvalId) && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(proposalId) && /^[a-f0-9]{64}$/.test(proposalDigest);
      if (!valid) {
        approve.disabled = true;
        reject.disabled = true;
        feedback.textContent = 'approval envelope inválido';
        return wrap;
      }
      reject.addEventListener('click', () => {
        approve.disabled = true;
        reject.disabled = true;
        feedback.textContent = 'no aprobado · no se envió nada';
      }, { once: true });
      approve.addEventListener('click', async () => {
        const api = window.PROMETEO_INGRESS_V1;
        if (!api || typeof api.submitApprovedPlan !== 'function') {
          feedback.textContent = 'ingress no disponible';
          return;
        }
        approve.disabled = true;
        reject.disabled = true;
        feedback.textContent = 'enviando aprobación…';
        const marker = 'APPROVED PLAN · ' + proposalId + ' · ' + proposalDigest;
        try {
          const out = await api.submitApprovedPlan({
            text: marker,
            page: {
              id: 'chat-canary',
              page_id: 'control-v11-chat-canary',
              title: 'Prometeo',
              surface_id: 'current-tree-control-v11-chat-canary',
              project_id: 'prometeo-autonomous-growth',
              target_path: 'current-tree/control-v11/chat-canary/'
            },
            approval: {
              schema: 'prometeo.primary-chat-approval/v1',
              decision: 'APPROVED',
              approval_id: approvalId,
              proposal_id: proposalId,
              proposal_digest: proposalDigest,
              approved_at: new Date().toISOString()
            }
          });
          const status = String(out && out.status || 'UNKNOWN');
          feedback.textContent = out && out.queued === true ? (status === 'QUEUED_REPLAY' ? 'ya aprobado · receipt reutilizado' : 'aprobado · enviado') : ('no enviado · ' + status);
          if (!(out && out.queued === true)) {
            approve.disabled = false;
            reject.disabled = false;
          }
        } catch (error) {
          feedback.textContent = 'no enviado · ' + String(error && (error.code || error.message) || 'ERROR');
          approve.disabled = false;
          reject.disabled = false;
        }
      });
      return wrap;
    }

`;
if (!chat.includes('function renderApproval(block)')) {
  chat = replaceOnce(chat, renderNeedle, renderApproval + renderNeedle, 'chat-approval-renderer');
}
const branchNeedle = "        } else if (block.type === 'copy_group') {\n          box.append(renderCopyGroup(block));";
const branchReplacement = "        } else if (block.type === 'approval') {\n          box.append(renderApproval(block));\n        } else if (block.type === 'copy_group') {\n          box.append(renderCopyGroup(block));";
chat = replaceOnce(chat, branchNeedle, branchReplacement, 'chat-approval-block');
fs.writeFileSync(chatPath, chat);

console.log('PATCHED primary-chat approval replay + UI wiring v1');
