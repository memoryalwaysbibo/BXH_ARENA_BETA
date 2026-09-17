(()=>{'use strict';
let callable=null,busy=false,lastMine=0,lastCode='',lastSentHtml='',lastSentAt=0,mineRows=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function runtime(){try{return Function('return {user:firebaseUser,profile:userProfile,state:state,phase:appPhase,mailbox:(typeof mailboxContext==="function"?mailboxContext:null),entryUrl:(typeof buildTournamentEntryUrl==="function"?buildTournamentEntryUrl:null),render:(typeof render==="function"?render:null)}')()}catch{return {}}}
async function api(data){if(!callable){const [a,f]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js')]);callable=f.httpsCallable(f.getFunctions(a.getApp(),'asia-east1'),'registrationInvitations',{timeout:25000});}return (await callable(data)).data}
function code(){return String(runtime().state?.cloudCode||'').toUpperCase()}
function managerPanel(){
 const ta=document.getElementById('quick-add-textarea');if(!ta)return false;
 let box=document.getElementById('registration-invite-panel');
 if(box&&box.isConnected)return false;
 box=document.createElement('div');box.id='registration-invite-panel';box.className='panel';
 box.innerHTML='<div class="panel-title">搜尋會員並邀請</div><p class="hint">輸入完整玩家 ID、遊戲 ID 或本名。只有玩家接受後才會成立報名。</p><div class="btn-row"><input id="registration-invite-search" maxlength="60" placeholder="玩家 ID 或完整本名"><button class="btn btn-primary" data-invite="search">搜尋</button></div><div data-invite-results></div><div data-invite-sent></div>';
 const anchor=ta.closest('.field');if(!anchor)return false;anchor.before(box);lastSentHtml='';lastSentAt=0;loadSent(true);return true;
}
async function loadSent(force=false){const c=code(),host=document.querySelector('[data-invite-sent]');if(!c||!host||document.hidden)return;const now=Date.now();if(!force&&now-lastSentAt<30000)return;lastSentAt=now;try{const r=await api({action:'sent',code:c});if(!host.isConnected)return;const html=(r.rows||[]).length?'<h4>邀請狀態</h4>'+r.rows.map(x=>'<p>'+esc(x.targetName)+'｜'+({pending:'待玩家確認',accepted:'已接受',declined:'已拒絕',expired:'已逾期'}[x.status]||esc(x.status))+'</p>').join(''):'';if(html!==lastSentHtml){host.innerHTML=html;lastSentHtml=html}}catch(e){}}
async function search(){if(busy)return;const term=document.getElementById('registration-invite-search')?.value.trim(),c=code(),host=document.querySelector('[data-invite-results]');if(!term||!c||!host)return;busy=true;host.textContent='搜尋中…';try{const r=await api({action:'search',code:c,term});host.innerHTML=(r.rows||[]).map(x=>'<div class="ap-task"><b>'+esc(x.displayName)+'</b><small>'+esc(x.playerId||'尚無玩家編號')+'</small><button class="btn btn-primary btn-sm" data-invite="send" data-uid="'+esc(x.uid)+'">發送邀請</button></div>').join('')||'<p class="hint">找不到完全符合的會員；請確認 ID／本名，或改用現場臨時玩家。</p>'}catch(e){host.textContent='搜尋失敗：'+String(e?.message||e?.code||'unknown')}finally{busy=false}}
async function send(uid){if(busy)return;busy=true;try{await api({action:'invite',code:code(),targetUid:uid});alert('邀請已送出；名單將顯示待玩家確認。');await loadSent(true)}catch(e){alert('邀請失敗：'+String(e?.message||e?.code||'unknown'))}finally{busy=false}}
function inviteOverlay(rows){let el=document.getElementById('registration-invitation-overlay');if(!rows.length){el?.remove();return}if(!el){el=document.createElement('div');el.id='registration-invitation-overlay';document.body.appendChild(el)}el.innerHTML='<section class="panel"><div class="panel-title">賽事參加邀請</div>'+rows.map(x=>'<div class="ap-task"><b>'+esc(x.eventName)+'</b><p>'+esc(x.invitedByName)+' 邀請你參加</p><div class="btn-row"><button class="btn btn-primary" data-invite="accept" data-code="'+esc(x.code)+'">接受</button><button class="btn btn-danger" data-invite="decline" data-code="'+esc(x.code)+'">拒絕</button></div></div>').join('')+'</section>'}
function updateBroadcastMode(){
 const toggle=document.getElementById('mailbox-broadcast-mode'),recipient=document.getElementById('mailbox-recipient')?.closest('.field'),button=document.querySelector('[data-action="mailbox-send-test"]'),warning=document.getElementById('mailbox-broadcast-warning'),on=!!toggle?.checked;
 if(recipient)recipient.hidden=on;if(button)button.textContent=on?'發送全站公告':'發送測試信';if(warning)warning.hidden=!on;
}
function broadcastComposer(){
 const rt=runtime(),profile=rt.profile,subject=document.getElementById('mailbox-subject');
 let box=document.getElementById('mailbox-broadcast-controls');
 if(profile?.role!=='super_admin'||!subject){box?.remove();return}
 if(box?.isConnected)return;
 box=document.createElement('div');box.id='mailbox-broadcast-controls';box.style.margin='12px 0';
 box.innerHTML='<label style="display:flex;align-items:center;gap:10px"><input id="mailbox-broadcast-mode" type="checkbox" style="width:auto"> 公告模式（寄送給全部有效會員）</label><div id="mailbox-broadcast-warning" class="auth-error" hidden style="margin-top:10px">目前為全站公告模式。送出後，每位有效會員都會收到站內信，請再次確認標題與內容。</div>';
 const details=subject.closest('details');const button=details?.querySelector('[data-action="mailbox-send-test"]');button?.before(box);
 box.querySelector('input').addEventListener('change',updateBroadcastMode);updateBroadcastMode();
}
async function sendBroadcast(button){
 if(busy)return;const subject=document.getElementById('mailbox-subject')?.value.trim(),body=document.getElementById('mailbox-body')?.value.trim();
 if(!subject||!body){alert('請完整填寫公告標題與內容。');return}
 if(!confirm('這會將「'+subject+'」寄送給全部有效會員。確定繼續？'))return;
 if(!confirm('最後確認：全站公告送出後無法收回，確定發送？'))return;
 busy=true;button.disabled=true;const old=button.textContent;button.textContent='公告發送中…';
 try{const result=await window.engagementService.mailbox({action:'broadcast',subject,body,type:'announcement',operationId:crypto.randomUUID()});alert('全站公告已送出，共 '+Number(result?.sentCount||0)+' 位會員收到。');document.getElementById('mailbox-broadcast-mode').checked=false;updateBroadcastMode()}
 catch(e){alert('公告發送失敗：'+String(e?.message||e?.code||'unknown'))}
 finally{busy=false;button.disabled=false;button.textContent=old;updateBroadcastMode()}
}
document.addEventListener('click',e=>{const button=e.target.closest?.('[data-action="mailbox-send-test"]');if(!button||!document.getElementById('mailbox-broadcast-mode')?.checked)return;e.preventDefault();e.stopImmediatePropagation();sendBroadcast(button)},true);
function mailboxInvitationPanel(){
 const rt=runtime(),ctx=rt.mailbox?rt.mailbox():null,selected=(ctx?.messages||[]).find(x=>x.id===ctx.selectedId);
 let panel=document.getElementById('mailbox-invitation-actions');
 if(!selected||selected.type!=='tournament_invitation'||!selected.eventCode){panel?.remove();return}
 const article=document.querySelector('.mailbox-layout article.panel');if(!article)return;
 const c=String(selected.eventCode).toUpperCase(),pending=mineRows.find(x=>String(x.code).toUpperCase()===c);
 const raw=pending?'pending':(selected.invitationStatus||'pending');
 const label={pending:'等待你的確認',accepted:'已接受邀請',confirmed:'已接受邀請（正取）',waitlist:'已接受邀請（備取）',declined:'已拒絕邀請',expired:'邀請已逾期'}[raw]||esc(raw);
 const expires=pending?.expiresAt?new Date(pending.expiresAt).toLocaleString('zh-TW'):'';
 const html='<div class="panel-title">賽事邀請操作</div><p><b>'+esc(pending?.eventName||selected.eventName||selected.subject||'賽事')+'</b></p><p class="hint">房間代碼：'+esc(c)+(expires?'｜請於 '+esc(expires)+' 前回覆':'')+'</p><p data-invite-mail-status>狀態：'+label+'</p><div class="btn-row">'+(raw==='pending'?'<button class="btn btn-primary" data-invite="accept" data-code="'+esc(c)+'">接受邀請</button><button class="btn btn-danger" data-invite="decline" data-code="'+esc(c)+'">拒絕邀請</button>':'')+'<button class="btn btn-ghost" data-invite="open-event" data-code="'+esc(c)+'">查看賽事／前往報名處</button></div>';
 if(!panel){panel=document.createElement('div');panel.id='mailbox-invitation-actions';panel.className='panel';panel.style.marginTop='16px';article.appendChild(panel)}
 if(panel.dataset.content!==html){panel.innerHTML=html;panel.dataset.content=html}
}
async function mine(){const r=runtime();if(!r.user?.uid||Date.now()-lastMine<12000)return;lastMine=Date.now();try{const x=await api({action:'mine'});mineRows=x.rows||[];inviteOverlay(mineRows);mailboxInvitationPanel()}catch(e){}}
async function respond(c,decision){if(busy)return;busy=true;try{const r=await api({action:'respond',code:c,decision});const rt=runtime(),ctx=rt.mailbox?rt.mailbox():null,selected=(ctx?.messages||[]).find(x=>x.id===ctx.selectedId);if(selected&&String(selected.eventCode).toUpperCase()===String(c).toUpperCase())selected.invitationStatus=decision==='accept'?(r.status||'accepted'):'declined';alert(decision==='accept'?'已接受邀請，報名狀態：'+(r.status==='confirmed'?'正取':r.status==='waitlist'?'備取':'已確認'):'已拒絕邀請');lastMine=0;mineRows=mineRows.filter(x=>String(x.code).toUpperCase()!==String(c).toUpperCase());mailboxInvitationPanel();await mine()}catch(e){alert('處理邀請失敗：'+String(e?.message||e?.code||'unknown'))}finally{busy=false}}
document.addEventListener('click',e=>{const t=e.target.closest?.('[data-invite]');if(!t)return;const a=t.dataset.invite;if(a==='search')search();if(a==='send')send(t.dataset.uid);if(a==='accept'||a==='decline')respond(t.dataset.code,a);if(a==='open-event'){const rt=runtime(),url=rt.entryUrl?rt.entryUrl(t.dataset.code,'register'):('?code='+encodeURIComponent(t.dataset.code)+'&entry=register');window.location.assign(url)}});
const style=document.createElement('style');style.textContent='#registration-invitation-overlay{position:fixed;inset:0;z-index:2700;background:#000d;padding:18px;display:flex;align-items:center;justify-content:center}#registration-invitation-overlay>section{width:min(560px,100%);max-height:85dvh;overflow:auto}#registration-invite-panel input{min-width:0;flex:1}#registration-invite-panel [data-invite-results] .ap-task{display:flex;align-items:center;gap:10px;margin-top:10px}#registration-invite-panel [data-invite-results] small{color:#999;flex:1}';document.head.appendChild(style);
function tick(){const r=runtime(),c=code();if((r.phase==='tournament'||document.getElementById('quick-add-textarea'))&&c){if(c!==lastCode){lastCode=c;lastSentHtml='';lastSentAt=0}managerPanel();loadSent()}broadcastComposer();mailboxInvitationPanel();mine()}
setInterval(tick,3000);setTimeout(tick,0);
})();