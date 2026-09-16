/* v13.37.0 Family profiles, ordinary-event registration and private history. */
function openFamilyPlayers(){
 document.getElementById('bxh-family-dialog')?.close();
 const uid=currentAuthUid(),epoch=engagementSessionEpoch,previous=document.activeElement,dialog=document.createElement('dialog');dialog.id='bxh-family-dialog';dialog.className='raffle-claim-dialog';
 dialog.innerHTML='<header><h2>家庭選手</h2><button class="btn btn-ghost" data-family="close">關閉</button></header><p class="hint">孩子不需另外申請帳號，可由家長替多位孩子報名一般賽事。每位參賽者各占一個名額；C1、C2 依建立順序固定，不會因封存或取消而重排。</p><div data-family="list"></div><button class="btn btn-primary" data-family="new">新增孩子</button><form hidden><h3 data-family="heading"></h3><label>孩子姓名<input name="name" maxlength="40" required autocomplete="off"></label><label>暱稱（選填）<input name="nickname" maxlength="40" autocomplete="off"></label><label>出生日期<input name="birthDate" type="date" required></label><label data-family="guardian"><input name="guardianConfirmed" type="checkbox" style="width:auto"> 我是孩子的家長或監護人，確認資料正確。</label><p class="hint">生日僅供家庭資料管理；代報名後，孩子姓名依主辦設定顯示於賽事。孩子戰績不會算入家長積分。</p><button class="btn btn-primary" type="submit">儲存資料</button> <button class="btn btn-ghost" type="button" data-family="cancel">取消編輯</button></form><p data-family="status" role="status" aria-live="polite"></p><button class="btn btn-ghost" data-family="refresh">重新讀取</button>';
 const q=k=>dialog.querySelector('[data-family="'+k+'"]'),form=dialog.querySelector('form'),status=q('status');let profiles=[],revision=0,editing=null,busy=false,pending=null,closed=false;
 const valid=()=>!closed&&currentAuthUid()===uid&&engagementSessionEpoch===epoch;
 const errors={'duplicate-child':'這位孩子已存在，請查看現有或已封存資料。','invalid-name':'請填寫姓名，姓名及暱稱限40字。','invalid-birth-date':'請填寫正確的出生日期，不能晚於今天。','guardian-confirmation-required':'請確認你是孩子的家長或監護人。','version-conflict':'其他視窗已更新，請重新讀取後再編輯。','profile-limit':'最多保留20位使用中的家庭選手。','profile-transferred':'此選手已移交，不能再由原家長修改。','auth-required':'請重新登入。'};
 const close=()=>{if(closed)return;closed=true;clearInterval(timer);dialog.close();dialog.remove();previous?.focus?.();};const timer=setInterval(()=>{if(!valid())close();},500);
 function lock(v){busy=v;dialog.querySelectorAll('button,input').forEach(x=>{if(x!==q('close'))x.disabled=v;});}
 function list(){q('list').innerHTML=profiles.map(p=>`<article class="claim-history-row"><strong>${esc(p.name)}${p.nickname?'（'+esc(p.nickname)+'）':''}</strong><p>選手編號：${esc(p.playerId)}</p><p>生日：${esc(p.birthDate)}${p.archived?'｜已封存':''}</p><button class="btn btn-ghost" data-history="${esc(p.id)}">賽事紀錄</button> <button class="btn btn-ghost" data-edit="${esc(p.id)}">編輯</button> <button class="btn btn-ghost" data-state="${esc(p.id)}">${p.archived?'恢復使用':'封存'}</button></article>`).join('')||'<p>尚未建立孩子的選手資料。</p>';q('list').querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>history(b.dataset.history));q('list').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(profiles.find(p=>p.id===b.dataset.edit)));q('list').querySelectorAll('[data-state]').forEach(b=>b.onclick=()=>{const p=profiles.find(x=>x.id===b.dataset.state);if(confirm((p.archived?'恢復':'封存')+'「'+p.name+'」？選手編號與紀錄會保留。'))mutate({action:p.archived?'restore':'archive',id:p.id});});}
 async function history(childId){if(busy)return;lock(true);status.textContent='讀取賽事紀錄…';try{const r=await window.engagementService.familyRegistration({action:'history',childId});if(!valid())return;if(!r?.ok)throw Error('unavailable');status.innerHTML='<strong>孩子的賽事紀錄</strong>'+((r.rows||[]).map(x=>'<p>'+esc(x.title)+'｜'+esc(({confirmed:'正取',waitlist:'備取',cancelled:'已取消'})[x.status]||x.status)+'｜'+(x.completed?'已結束':x.checkedIn?'已報到':'未報到')+'｜'+Number(x.wins||0)+' 勝 '+Number(x.losses||0)+' 敗</p>').join('')||'<p>尚無代報名紀錄。</p>');}catch(e){if(valid())status.textContent='讀取失敗，請稍後再試。';}finally{if(valid())lock(false);}}
 async function request(data){const r=await window.engagementService.family(data);if(!valid())throw Error('auth-required');if(!r?.ok)throw Error('unavailable');return r;}
 function message(e){const s=String(e?.message||e);return Object.entries(errors).find(([k])=>s.includes(k))?.[1]||'連線結果尚未確認，請按「重試原操作」。';}
 async function load(){if(busy)return;lock(true);try{const r=await request({action:'list'});profiles=r.profiles;revision=r.revision;editing=null;form.hidden=true;list();status.textContent='資料已讀取。';}catch(e){if(valid())status.textContent=message(e);}finally{if(valid())lock(false);}}
 function edit(p){if(busy||pending)return;editing=p||null;form.hidden=false;q('heading').textContent=p?'編輯家庭選手':'新增孩子';for(const k of ['name','nickname','birthDate'])form.elements[k].value=p?.[k]||'';form.elements.guardianConfirmed.checked=false;q('guardian').hidden=!!p;form.elements.guardianConfirmed.required=!p;form.elements.name.focus();}
 async function mutate(data){if(busy)return;if(pending&&data)return;pending=pending||{...data,revision,operationId:crypto.randomUUID()};lock(true);status.textContent='儲存中…';try{const r=await request(pending);profiles=r.profiles;revision=r.revision;pending=null;form.hidden=true;list();status.textContent='已儲存；一般賽事報名時可選擇這位孩子。';q('refresh').textContent='重新讀取';}catch(e){if(valid()){status.textContent=message(e);const s=String(e?.message||e);if(Object.keys(errors).some(k=>s.includes(k))||s.includes('invalid-operation'))pending=null;q('refresh').textContent=pending?'重試原操作':'重新讀取';}}finally{if(valid()){lock(false);if(pending){q('new').disabled=true;form.querySelectorAll('button,input').forEach(x=>x.disabled=true);q('list').querySelectorAll('button').forEach(x=>x.disabled=true);}}}}
 form.onsubmit=e=>{e.preventDefault();mutate({action:editing?'update':'create',id:editing?.id,name:form.elements.name.value,nickname:form.elements.nickname.value,birthDate:form.elements.birthDate.value,guardianConfirmed:form.elements.guardianConfirmed.checked});};q('close').onclick=close;dialog.oncancel=e=>{e.preventDefault();close();};dialog.onclose=close;q('new').onclick=()=>edit(null);q('cancel').onclick=()=>{form.hidden=true;};q('refresh').onclick=()=>pending?mutate():load();document.body.appendChild(dialog);dialog.showModal();load();
}

// v13.38.0: one guardian may register self and multiple children; each keeps its own slot.
function mergeFamilyOnlineRoster(players,registrations,checkinRequired,newId){
 const confirmed=registrations.filter(r=>r.status==='confirmed'),ids=new Set(confirmed.map(r=>String(r.uid||'')));
 const result=players.filter(p=>p.source!=='online'||!p.registrationUid||ids.has(p.registrationUid));
 for(const r of confirmed){
  const name=String(r.displayName||r.publicName||r.realName||'').trim(),guardian=String(r.uid||'');if(!name||!guardian)continue;
  const participant=r.registrationId||r.uid||guardian,i=result.findIndex(p=>p.registrationUid===guardian&&String(p.registrationId||p.participantId||p.uid||'')===String(participant)),old=i<0?null:result[i],same=(old?.familyPlayerId||null)===(r.familyPlayerId||null);
  const p={id:r.familyPlayerId?'family_'+r.familyPlayerId:(same&&old?.id||newId()),name,source:'online',registrationUid:guardian,registrationId:participant,checkedIn:same&&old?old.checkedIn:!checkinRequired};
  if(r.familyPlayerId)Object.assign(p,{familyPlayerId:r.familyPlayerId,participantId:r.familyPlayerId,guardianUid:guardian});
  if(i<0)result.push(p);else result[i]=p;
 }
 return result;
}
async function chooseFamilyRegistrationToCancel(rows){
 const list=(rows||[]).filter(x=>x&&x.registrationId&&['confirmed','waitlist'].includes(x.status));
 if(!list.length)throw Error('not-registered');
 if(list.length===1)return list[0].registrationId;
 return new Promise((resolve,reject)=>{
  const dialog=document.createElement('dialog'),focus=document.activeElement;dialog.className='raffle-claim-dialog';
  dialog.innerHTML='<header><h2>選擇要取消的參賽者</h2><button class="btn btn-ghost" data-close>返回</button></header><p>請指定要取消本人或哪一位孩子的報名；其他報名不會受到影響。</p><form><label>參賽者<select name="registration">'+list.map(x=>'<option value="'+esc(x.registrationId)+'">'+esc(x.participantName||x.displayName||x.realName||x.registrationId)+'｜'+(x.status==='confirmed'?'正取':'備取')+'</option>').join('')+'</select></label><button class="btn btn-danger" type="submit">確認取消</button></form>';
  let done=false;const finish=(error,value)=>{if(done)return;done=true;dialog.close();dialog.remove();focus?.focus?.();if(error)reject(Error(error));else resolve(value);};
  dialog.querySelector('[data-close]').onclick=()=>finish('registration-aborted');dialog.oncancel=e=>{e.preventDefault();finish('registration-aborted');};dialog.onclose=()=>finish('registration-aborted');
  dialog.querySelector('form').onsubmit=e=>{e.preventDefault();finish(null,e.target.elements.registration.value);};
  document.body.appendChild(dialog);dialog.showModal();
 });
}

async function chooseFamilyParticipant(event,code,childEligibilityConfirmed){
 const owner=currentAuthUid(),epoch=engagementSessionEpoch;
 const r=await window.engagementService.family({action:'list'});
 if(currentAuthUid()!==owner||engagementSessionEpoch!==epoch)throw Error('auth-required');
 if(!r?.ok)throw Error('unavailable');
 // Official ranked/lottery events still do not allow family registration.
 // A tester's ranked room is represented by testLadderEnabled while its
 // official ladderMode remains general, so it must keep the full sandbox
 // registration experience.
 const children=(r.profiles||[]).filter(p=>!p.archived&&!p.accountUid),blocked=!!event.registrationSelection||(event.ladderMode==='ranked'&&!event.testLadderEnabled);
 return new Promise((resolve,reject)=>{
  const dialog=document.createElement('dialog'),focus=document.activeElement;dialog.className='raffle-claim-dialog';
  dialog.innerHTML='<header><h2>選擇本場參賽者</h2><button class="btn btn-ghost" data-close>取消</button></header><p>可選本人及多位孩子；每位參賽者各占一個名額。孩子順序會固定為 C1、C2，不會重新排列。</p><form><fieldset><legend>參賽者</legend><label><input type="checkbox" name="participant" value="" checked> 本人參賽</label>'+children.map((p,i)=>{const code=p.displayCode||p.playerId||('C'+(i+1));return '<label><input type="checkbox" name="participant" value="'+esc(p.id)+'"'+(blocked?' disabled':'')+'> '+esc(p.name)+(p.nickname?'（'+esc(p.nickname)+'）':'')+' <span class="hint">'+esc(code)+'</span></label>';}).join('')+'</fieldset><p class="hint">'+(blocked?'本場為正式積分賽或超額抽籤，孩子代報名尚未開放。':children.length?'孩子的參賽姓名會依主辦設定顯示於名單及對戰表；生日不公開。叫號由家長帳號接收。':'如需替孩子報名，請先至會員資料 → 家庭選手／孩子資料建立資料。')+'</p><p data-family="allocation" role="status"></p><button class="btn btn-primary" type="submit">預覽名額並確認</button></form>';
  let done=false;const finish=(error,value)=>{if(done)return;done=true;clearInterval(timer);dialog.close();dialog.remove();focus?.focus?.();if(error)reject(Error(error));else resolve(value);};
  const timer=setInterval(()=>{if(currentAuthUid()!==owner||engagementSessionEpoch!==epoch)finish('auth-required');},500);
  dialog.querySelector('[data-close]').onclick=()=>finish('registration-aborted');dialog.oncancel=e=>{e.preventDefault();finish('registration-aborted');};dialog.onclose=()=>finish('registration-aborted');
  dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();if(currentAuthUid()!==owner||engagementSessionEpoch!==epoch){finish('auth-required');return;}const ids=[...e.target.querySelectorAll('input[name="participant"]:checked')].map(x=>x.value||null);if(blocked||!ids.length||ids.some(id=>id!==null&&!children.some(p=>p.id===id)))return;const allocation=dialog.querySelector('[data-family="allocation"]');allocation.textContent='正在檢查名額…';try{const r=await window.engagementService.familyRegistration({action:'preview',code,childIds:ids,childEligibilityConfirmed:childEligibilityConfirmed===true});if(currentAuthUid()!==owner||engagementSessionEpoch!==epoch)throw Error('auth-required');if(!r?.ok)throw Error('preview-failed');allocation.textContent=(r.rows||[]).map(x=>`${x.participantName}：${x.status==='confirmed'?'正取':'備取'}`).join('、');if(!confirm('名額配置：'+allocation.textContent+'。確定送出報名？'))return;finish(null,{childIds:ids,allocation:r.allocation||[]});}catch(err){allocation.textContent='名額檢查失敗，請稍後再試。';}};document.body.appendChild(dialog);dialog.showModal();
 });
}
