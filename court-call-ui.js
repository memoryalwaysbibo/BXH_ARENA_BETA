/* v13.33.0 — BXH CALL. Page-open notifications; no background push. */
'use strict';
let courtCallCache=new Map(),courtCallTimer=null,courtCallIdentity='';
function callPassProtected(s,m){return !!(m&&(m.callPass&&!m.completed||(s.matches||[]).some(x=>!x.completed&&x.skippedAt&&x.callPass?.waitFor.includes(m.id))));}
function courtCallContext(code){
 const key=currentAuthUid()+':'+engagementSessionEpoch;if(key!==courtCallIdentity){courtCallCache=new Map();courtCallIdentity=key;}
 if(!courtCallCache.has(code)){let pending=null;try{pending=JSON.parse(sessionStorage.getItem('bxh.call:'+currentAuthUid()+':'+code)||'null');}catch{}courtCallCache.set(code,{code,identity:key,storageKey:'bxh.call:'+currentAuthUid()+':'+code,rows:[],used:false,error:'',pending,busy:false,loading:false,next:0,seen:{}});}
 return courtCallCache.get(code);
}
function courtCallError(e){const text=String(e?.message||e),messages={'players-not-linked':'雙方需以會員報名資料綁定帳號，不能只靠姓名叫號。','insufficient-same-round':'同台同輪不足兩場可遞延，請裁判現場處理；不會跨輪。','pass-used':'本場賽事的 PASS 額度已使用。','pass-unavailable':'此場已計分、已暫緩或無法申請 PASS。','not-current-match':'叫號場次已變更，請重新整理。','stale-call':'裁判已再次叫號，請依最新通知重新回覆。','resolve-pass-first':'請先由裁判處理待審核的 PASS。','referee-required':'沒有此戰鬥台的操作權限。','permission-denied':'沒有此賽事的叫號權限。','account-inactive':'帳號目前無法使用。','notify-cooldown':'請稍候 10 秒再叫號。','pass-pending':'已有一筆 PASS 等待裁判處理。','pass-not-pending':'申請已處理，請重新整理。','event-not-live':'賽事尚未開始或已結束。'};for(const [k,v]of Object.entries(messages))if(text.includes(k))return v;return '操作尚未確認，請重試原操作或重新整理。';}
function courtCallCommon(c){return `${c.error?`<p class="auth-error" role="alert">${esc(c.error)}</p>`:''}${c.pending?`<button class="btn btn-ghost" data-action="court-call-retry" data-code="${esc(c.code)}" ${c.busy?'disabled':''}>重試待確認操作</button>`:''}`;}
function courtCallRow(c,r,ref){
 const attrs=`data-code="${esc(c.code)}" data-match="${esc(r.matchId)}" data-sequence="${r.sequence}"`,disabled=c.busy||c.pending?'disabled':'';
 const names={unanswered:'未回覆',coming:'正在過去',pass:'申請稍候',ready:'已準備好'};
 return `<div class="panel" style="margin-top:8px"><strong>第 ${r.station} 台｜第 ${Number(r.round)+1} 輪</strong><p class="hint">叫號：${esc(new Date(r.calledAt).toLocaleTimeString("zh-TW",{hour12:false}))}${r.pass?.status==='pending'?'｜申請已等候 '+Math.max(0,Math.floor((Date.now()-r.pass.requestedAt)/60000))+' 分鐘':''}</p><p>${r.players.map(p=>`${esc(p.name)}：${esc(names[p.response]||p.response)}`).join(' ／ ')}</p>${r.pass?`<p class="hint">PASS：${esc(({pending:'待裁判核准',approved:'已核准，同台延後兩場',rejected:'未核准，請依原叫號到場'})[r.pass.status])}${r.pass.status==='pending'?'｜'+esc(r.pass.reason):''}${r.waitingFor.length?'｜前置場次尚餘 '+r.waitingFor.length+' 場':''}</p>`:''}<div class="btn-row">${ref?r.canApprove?`<button class="btn btn-primary" data-action="court-call-approve" ${attrs} ${disabled}>同意 PASS</button><button class="btn btn-ghost" data-action="court-call-reject" ${attrs} ${disabled}>拒絕 PASS</button>`:'':`<button class="btn btn-primary" data-action="court-call-coming" ${attrs} ${disabled}>正在過去</button>${r.pass?.status==='approved'&&r.pass.requester?`<button class="btn btn-ghost" data-action="court-call-ready" ${attrs} ${disabled}>我已準備好</button>`:''}${r.canPass&&r.pass?.status!=='pending'?`<button class="btn btn-ghost" data-action="court-call-pass" ${attrs} ${disabled}>PASS／申請稍候</button>`:''}`}</div></div>`;
}
function renderCourtCallReferee(m){
 if(!m||!m.a||!m.b||m.completed||!state.startedAt||!state.cloudCode||!canOperateStation(m.station))return '';
 const c=courtCallContext(state.cloudCode);
 return `<section class="panel"><div class="panel-title">BXH CALL｜裁判叫號</div><button class="btn btn-primary" data-action="court-call-notify" data-code="${esc(c.code)}" data-match="${esc(m.id)}" ${c.busy||c.pending?'disabled':''}>通知雙方選手</button><p class="hint">選手需停留在我的賽程並開啟智慧叫號。PASS 核准後同台同輪延後兩場，每人每賽事限一次；未回覆不自動判棄權。</p>${courtCallCommon(c)}${c.rows.filter(r=>r.isReferee&&r.station===m.station).map(r=>courtCallRow(c,r,true)).join('')}</section>`;
}
function renderCourtCallPlayer(code){
 if(!smartCallEnabled(code))return '';
 const c=courtCallContext(code);return `<section><p class="hint">裁判叫號每 5 秒更新｜PASS：${c.used?'本賽事已使用':'裁判核准後才扣一次額度'}</p>${courtCallCommon(c)}${c.rows.filter(r=>r.players.some(p=>p.me)).map(r=>courtCallRow(c,r,false)).join('')||'<p class="hint">等待裁判通知。</p>'}</section>`;
}
function courtCallVisibleCodes(){
 if(!currentAuthUid())return [];
 if(appPhase==='player-center'&&playerActiveTab==='registered')return (myRegistrationsCache||[]).filter(r=>r.status==='confirmed'&&smartCallEnabled(r.tournamentCode)&&schedulePhase(myRegistrationsTournamentInfo[r.tournamentCode]||{})==='live').map(r=>r.tournamentCode);
 if((appPhase==='app'&&activeTab==='referee'||appPhase==='community-room'&&communityRoomActiveTab==='referee')&&state.cloudCode&&canOperateCurrentTournament())return [state.cloudCode];
 return [];
}
function scheduleCourtCallPoll(){
 if(courtCallTimer)return;const codes=courtCallVisibleCodes();if(!codes.length)return;
 courtCallTimer=setTimeout(async()=>{courtCallTimer=null;const list=courtCallVisibleCodes();for(const code of list){const c=courtCallContext(code);if(!c.loading&&!c.busy&&Date.now()>=c.next)await loadCourtCalls(code);}if(courtCallVisibleCodes().length)scheduleCourtCallPoll();},1000);
}
async function loadCourtCalls(code){
 const c=courtCallContext(code);if(c.loading)return;c.loading=true;
 try{const result=await window.engagementService.courtCall({action:'list',code});if(c!==courtCallContext(code))return;if(!result.ok)throw Error('load-failed');c.rows=result.rows;c.used=result.passUsed;c.error='';
  for(const r of c.rows){const me=r.players.some(p=>p.me),stamp=r.sequence+':'+(r.pass?.status||'');if(me&&smartCallEnabled(code)&&c.seen[r.matchId]!==stamp){showToast(`BXH CALL｜第 ${r.station} 台${r.pass?.status==='approved'&&r.waitingFor.length?'：PASS 已核准，等待回補':r.pass?.status==='rejected'?'：PASS 未核准，請到場':'：請查看最新叫號通知'}`);c.seen[r.matchId]=stamp;}}
 }catch(e){if(c===courtCallContext(code))c.error=courtCallError(e);}finally{if(c===courtCallContext(code)){c.loading=false;c.next=Date.now()+5000;renderPreservingScroll();}}
}
async function handleCourtCall(action,target){
 const code=target.getAttribute('data-code'),c=courtCallContext(code);if(c.busy)return;
 let payload=c.pending;
 if(!payload){let api=action.slice(11),response,reason;
  if(['coming','pass','ready'].includes(api)){response=api;api='respond';}
  if(response==='pass'){reason=prompt('暫緩原因：請輸入「上廁所」、「裝備處理」或「其他」');if(!reason)return;reason=reason.trim();if(!['上廁所','裝備處理','其他'].includes(reason)){showToast('請選擇上廁所、裝備處理或其他',true);return;}}
  if(api==='approve'&&!confirm('同意後扣除申請人本賽事唯一一次 PASS，固定同台同輪延後兩場，是否核准？'))return;
  if(!['notify','respond','approve','reject'].includes(api))return;
  payload={action:api,code,matchId:target.getAttribute('data-match'),sequence:Number(target.getAttribute('data-sequence')),operationId:crypto.randomUUID()};if(response)payload.response=response;if(reason)payload.reason=reason;
 }
 const storageKey=c.storageKey;
 try{sessionStorage.setItem(storageKey,JSON.stringify(payload));c.pending=payload;c.busy=true;c.error='';renderPreservingScroll();
  if(payload.action==='approve'){await flushStationMatchMutations();if(!await flushCloudStateWrites())throw Error('sync-pending');}
  const r=await window.engagementService.courtCall(payload);if(c!==courtCallContext(code))return;if(!r.ok)throw Error('operation-failed');c.pending=null;sessionStorage.removeItem(storageKey);if(r.state&&state.cloudCode===code)applyRemoteState(r.state,true);c.busy=false;await loadCourtCalls(code);showToast('叫號操作已確認');
 }catch(e){if(c===courtCallContext(code)){c.error=courtCallError(e);if(['functions/failed-precondition','functions/permission-denied'].includes(e.code)){c.pending=null;sessionStorage.removeItem(storageKey);}}}
 finally{if(c===courtCallContext(code)){c.busy=false;renderPreservingScroll();}}
}
function courtCallPublicQueue(s,station){
 const all=(s.matches||[]).filter(m=>!m.isBye&&!m.completed&&m.station===station&&m.a&&m.b&&m.status!=='paused').sort((a,b)=>Number(a.seq)-Number(b.seq));
 const result=all.filter(m=>!m.skippedAt);
 const skipped=all.filter(m=>m.skippedAt&&!m.resumeQueuedAt&&!m.skipManualOnly).sort((a,b)=>a.skippedAt-b.skippedAt||String(a.id).localeCompare(String(b.id)));
 for(const m of skipped.slice().reverse()){
  const ids=m.skipWaitFor||[];if(m.callPass&&ids.some(id=>!s.matches.find(x=>x.id===id)?.completed&&!result.some(x=>x.id===id)))continue;
  const at=result.reduce((last,x,i)=>ids.includes(x.id)?i+1:last,0);result.splice(at,0,m);
 }
 return all.filter(m=>m.skippedAt&&m.resumeQueuedAt).concat(result);
}
