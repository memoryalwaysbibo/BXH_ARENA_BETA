/* v13.31.0 | 我的道具基礎系統 — classic script, shares authenticated app context. */
'use strict';
let inventoryState=null;
function inventoryStorageKey(){return 'bxh.inventory.pending.v1:'+currentAuthUid();}
function inventoryContext(){
 const key=currentAuthUid()+':'+engagementSessionEpoch;
 if(!inventoryState||inventoryState.key!==key){
  let pending=null;
  try{const saved=JSON.parse(sessionStorage.getItem(inventoryStorageKey())||'null');if(saved?.payload?.operationId&&saved.actorUid===currentAuthUid())pending=saved;}catch{}
  inventoryState={key,items:null,nextCursor:null,loading:false,busy:false,error:'',selectedId:'',events:[],historyCursor:null,historyLoaded:false,query:'',results:[],recipient:null,draft:{itemCode:'',name:'',quantity:'1',imageUrl:'',purpose:'',source:'',expiry:''},pending,success:'',serverOffset:0};
 }
 return inventoryState;
}
function inventoryError(e){
 const msg=String(e?.message||e||'');
 const map={'auth-required':'請重新登入。','account-inactive':'帳號目前不可使用。','super-admin-required':'只有最高管理員可以發放道具。','invalid-recipient':'請重新搜尋並選擇玩家。','recipient-not-found':'玩家帳號不存在。','recipient-inactive':'玩家帳號目前不可使用。','invalid-item-code':'道具代碼限 1～48 位小寫英數字、底線或連字號。','invalid-name':'道具名稱請輸入 1～60 字。','invalid-purpose':'用途請輸入 1～300 字。','invalid-source':'來源請輸入 1～120 字。','invalid-quantity':'數量須為 1～10000 的整數。','invalid-image':'圖片請使用完整 HTTPS 網址，或留空。','invalid-expiry':'請填寫有效的到期時間。','expired-grant':'到期時間須晚於現在，請調整後再發放。','operation-conflict':'操作紀錄不一致，請保留本頁識別碼供管理員查核。','storage-unavailable':'瀏覽器無法保存重試紀錄，請允許此網站使用工作階段儲存後再發放。','item-not-found':'找不到這筆道具。','invalid-cursor':'清單游標已失效，請重新整理。'};
 for(const [k,v]of Object.entries(map))if(msg.includes(k))return v;
 return '連線未完成，請重試；待確認的發放會沿用原操作，不重複發放。';
}
function inventoryExpiry(value){
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('invalid-expiry');
 const ms=Date.parse(value+':00+08:00');if(!Number.isFinite(ms)||new Date(ms+28800000).toISOString().slice(0,16)!==value)throw Error('invalid-expiry');return ms;
}
function inventoryImage(url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function inventoryStatus(item,c){return item.expiresAt!=null&&item.expiresAt<=Date.now()+c.serverOffset?'已過期':item.quantity<=0?'已用完':'持有中';}
async function loadInventory(more=false){
 const c=inventoryContext();if(c.loading||c.busy||!currentAuthUid())return;
 c.loading=true;c.error='';render();
 try{
  const r=await window.engagementService.inventory({action:'list',cursor:more?c.nextCursor:null});
  if(c!==inventoryContext())return;if(!r?.ok)throw Error('load-failed');
  c.items=more?[...(c.items||[]),...r.items.filter(i=>!(c.items||[]).some(j=>j.id===i.id))]:r.items;
  c.nextCursor=r.nextCursor;c.serverOffset=r.serverNow-Date.now();
 }catch(e){if(c===inventoryContext())c.error=inventoryError(e);}
 finally{if(c===inventoryContext()){c.loading=false;render();}}
}
function renderInventoryPage(){
 const c=inventoryContext();
 if(c.items===null&&!c.loading&&!c.error&&!c.busy)setTimeout(()=>loadInventory(),0);
 const lock=c.busy||!!c.pending,d=c.pending?.draft||c.draft,recipient=c.pending?.recipient||c.recipient;
 const selected=(c.items||[]).find(i=>i.id===c.selectedId);
 const input=(key,label,extra='')=>`<div class="field"><label for="inventory-${key}">${label}</label><input id="inventory-${key}" data-inventory-field="${key}" value="${esc(d[key]||'')}" ${extra} ${lock?'disabled':''}></div>`;
 return `<section class="panel"><div class="panel-title"><span>🎒 我的道具</span><button class="btn btn-ghost btn-sm" data-action="inventory-refresh" ${c.loading||c.busy?'disabled':''}>重新整理</button></div>
 <p class="hint">道具綁定帳號，不可轉讓。相同道具依發放批次列出，來源與期限各自保存；過期保留紀錄。</p>
 ${c.error?`<p class="auth-error" role="alert">${esc(c.error)}</p>`:''}${c.success?`<p class="hint" role="status">${esc(c.success)}</p>`:''}
 <div class="grid grid-2 inventory-grid">${(c.items||[]).map(i=>`<article class="panel inventory-card">${inventoryImage(i.imageUrl)?`<img class="inventory-image" src="${esc(inventoryImage(i.imageUrl))}" alt="${esc(i.name)}" loading="lazy" referrerpolicy="no-referrer">`:'<div class="inventory-image inventory-placeholder" aria-hidden="true">🎟️</div>'}<div><h3>${esc(i.name)}</h3><p><b>數量 ${Number(i.quantity)||0}</b> · ${inventoryStatus(i,c)}</p><p class="mailbox-body">${esc(i.purpose)}</p><p class="hint">期限：${i.expiresAt==null?'無期限':esc(mailboxDate(i.expiresAt))+'（台灣時間）'}<br>來源：${esc(i.source)}<br>取得：${esc(mailboxDate(i.createdAt))}<br>道具代碼：${esc(i.itemCode)}</p><button class="btn btn-ghost btn-sm" data-action="inventory-history" data-item-id="${esc(i.id)}" ${c.busy||c.loading?'disabled':''}>發放／使用紀錄</button></div></article>`).join('')}</div>
 ${c.loading?'<p role="status">正在載入道具……</p>':c.items&&!c.items.length?'<div class="empty-state">目前沒有道具，收到票券或活動獎勵後會顯示在這裡。</div>':''}
 ${c.nextCursor?`<button class="btn btn-ghost" data-action="inventory-more" ${c.loading||c.busy?'disabled':''}>載入更多道具</button>`:''}
 ${selected?`<section class="panel"><div class="panel-title">${esc(selected.name)}｜發放／使用紀錄</div>${c.events.map(e=>`<p class="mailbox-body">${esc(mailboxDate(e.createdAt))}｜${esc(({grant:'發放',consume:'使用',refund:'退還'})[e.kind]||'異動')} ${e.delta>0?'+':''}${Number(e.delta)}｜剩餘 ${Number(e.balance)}<br>來源：${esc(e.source)}<br><small>紀錄：${esc(e.operationId)}</small></p>`).join('')}${c.historyLoaded&&!c.events.some(e=>e.kind==='consume')?'<p class="hint">目前已載入的紀錄中沒有使用紀錄。</p>':''}${c.historyCursor?`<button class="btn btn-ghost" data-action="inventory-history-more" ${c.busy?'disabled':''}>更多紀錄</button>`:''}</section>`:''}
 ${isSuperAdmin()?`<section class="panel" style="margin-top:16px"><div class="panel-title">最高管理員｜發放道具</div><p class="hint">搜尋並確認玩家後發放；道具與站內信會一起保存。同類票券請沿用相同道具代碼。</p>
 ${c.pending?`<p class="auth-error" role="status">有一筆發放待確認，請按「確認原發放結果」；請勿在其他視窗另發一筆。<br>操作：${esc(c.pending.payload.operationId)}</p>`:''}
 <div class="field"><label for="inventory-query">搜尋玩家</label><input id="inventory-query" data-inventory-field="query" value="${esc(c.query)}" placeholder="姓名、玩家編號或 Email" ${lock?'disabled':''}></div><button class="btn btn-ghost" data-action="inventory-search" ${lock?'disabled':''}>搜尋帳號</button>
 ${c.results.map(u=>`<button class="btn btn-ghost inventory-recipient" data-action="inventory-select" data-uid="${esc(u.uid)}" ${lock?'disabled':''}>${esc(titleRecipientLabel(u))}</button>`).join('')}
 <p role="status" id="inventory-selected">${recipient?'已選擇：'+esc(titleRecipientLabel(recipient)):'尚未選擇玩家'}</p>
 <div class="grid grid-2 inventory-grid">${input('itemCode','道具代碼','maxlength="48" placeholder="例如：member-raffle-ticket"')}${input('name','道具名稱','maxlength="60"')}${input('quantity','數量','type="number" min="1" max="10000" step="1"')}${input('imageUrl','圖片網址（選填）','type="url" maxlength="2048" placeholder="https://…"')}${input('purpose','用途','maxlength="300"')}${input('source','來源／發放原因','maxlength="120"')}${input('expiry','到期時間（台灣時間；留空為無期限）','type="datetime-local"')}</div>
 <button class="btn btn-primary" data-action="inventory-grant" ${c.busy?'disabled':''}>${c.busy?'處理中……':c.pending?'確認原發放結果':'確認發放'}</button></section>`:''}</section>`;
}
async function handleInventory(action,target){
 const c=inventoryContext();if(!currentAuthUid()||c.busy||c.loading)return;
 if(action==='inventory-refresh'){c.selectedId='';await loadInventory();return;}
 if(action==='inventory-more'){if(c.nextCursor)await loadInventory(true);return;}
 if(action==='inventory-history'||action==='inventory-history-more'){
  const more=action==='inventory-history-more';
  if(!more){c.selectedId=target.getAttribute('data-item-id');c.events=[];c.historyCursor=null;c.historyLoaded=false;}
  if(more&&!c.historyCursor)return;
  c.busy=true;c.error='';render();
  try{const r=await window.engagementService.inventory({action:'history',itemId:c.selectedId,cursor:more?c.historyCursor:null});if(c!==inventoryContext())return;if(!r?.ok)throw Error('load-failed');c.events=more?[...c.events,...r.events]:r.events;c.historyCursor=r.nextCursor;c.historyLoaded=true;}
  catch(e){if(c===inventoryContext())c.error=inventoryError(e);}finally{if(c===inventoryContext()){c.busy=false;render();}}return;
 }
 if(!isSuperAdmin())return;
 if(action==='inventory-select'&&!c.pending){c.recipient=c.results.find(u=>u.uid===target.getAttribute('data-uid'))||null;c.results=[];render();return;}
 if(action==='inventory-search'&&!c.pending){
  if(!c.query.trim()){c.error='請輸入玩家姓名、編號或 Email。';render();return;}
  c.busy=true;c.error='';c.recipient=null;c.results=[];render();
  try{const users=await window.cloudAuth.listUsers();if(c!==inventoryContext()||!isSuperAdmin())return;c.results=titleRecipientMatches(users,c.query).filter(u=>u.active===true&&!['frozen','disabled'].includes(u.accountStatus));if(!c.results.length)c.error='找不到可發放的玩家，請確認搜尋條件。';}
  catch(e){if(c===inventoryContext())c.error='搜尋失敗，請稍後重試。';}finally{if(c===inventoryContext()){c.busy=false;render();}}return;
 }
 if(action!=='inventory-grant')return;
 c.error='';c.success='';
 try{
  if(!c.pending){
   if(!c.recipient)throw Error('invalid-recipient');
   const d=c.draft,quantity=Number(d.quantity),expiresAt=inventoryExpiry(d.expiry);
   if(!Number.isInteger(quantity)||quantity<1||quantity>10000)throw Error('invalid-quantity');
   if(!/^[a-z0-9][a-z0-9_-]{0,47}$/.test(d.itemCode.trim()))throw Error('invalid-item-code');
   for(const [key,max]of [['name',60],['purpose',300],['source',120]])if(!d[key].trim()||[...d[key].trim()].length>max)throw Error('invalid-'+key);
   if(d.imageUrl&&!inventoryImage(d.imageUrl))throw Error('invalid-image');
   if(expiresAt!==null&&expiresAt<=Date.now()+c.serverOffset)throw Error('expired-grant');
   if(!confirm(`確認發放給 ${titleRecipientLabel(c.recipient)}？\n${d.name} × ${quantity}\n來源：${d.source}\n期限：${expiresAt===null?'無期限':mailboxDate(expiresAt)+'（台灣時間）'}\n將同步寄送站內信。`))return;
   const pending={actorUid:currentAuthUid(),recipient:c.recipient,draft:{...d},payload:{action:'grant',targetUid:c.recipient.uid,itemCode:d.itemCode.trim(),name:d.name.trim(),quantity,imageUrl:d.imageUrl.trim(),purpose:d.purpose.trim(),source:d.source.trim(),expiresAt,operationId:crypto.randomUUID()}};
   try{sessionStorage.setItem(inventoryStorageKey(),JSON.stringify(pending));if(sessionStorage.getItem(inventoryStorageKey())!==JSON.stringify(pending))throw Error();}catch{throw Error('storage-unavailable');}
   c.pending=pending;
  }
  c.busy=true;render();
  const r=await window.engagementService.inventory(c.pending.payload);if(c!==inventoryContext())return;if(!r?.ok)throw Error('grant-failed');
  c.success=(r.replayed?'已確認先前發放成功':'道具已發放，站內信已建立')+'｜操作：'+c.pending.payload.operationId;
  try{sessionStorage.removeItem(inventoryStorageKey());}catch{}
  c.pending=null;c.draft={itemCode:'',name:'',quantity:'1',imageUrl:'',purpose:'',source:'',expiry:''};c.recipient=null;c.results=[];
  c.busy=false;await loadInventory();await loadMailbox(true);
 }catch(e){
  if(c===inventoryContext()){
   c.error=inventoryError(e);
   // These callable rejections prove the transaction did not commit. Transport failures retain the request.
   if(c.pending&&['functions/invalid-argument','functions/failed-precondition'].includes(e.code)&&!String(e.message).includes('operation-conflict')){c.draft={...c.pending.draft};c.recipient=c.pending.recipient;try{sessionStorage.removeItem(inventoryStorageKey());}catch{}c.pending=null;}
  }
 }finally{if(c===inventoryContext()){c.busy=false;render();}}
}
function inventoryCaptureInput(e){
 const field=e.target.getAttribute?.('data-inventory-field');if(!field||!isSuperAdmin())return;
 const c=inventoryContext();if(c.busy||c.pending)return;
 if(field==='query'){c.query=e.target.value;c.recipient=null;c.results=[];const selected=document.getElementById('inventory-selected');if(selected)selected.textContent='尚未選擇玩家';document.querySelectorAll('.inventory-recipient').forEach(el=>el.remove());}
 else if(Object.hasOwn(c.draft,field))c.draft[field]=e.target.value;
}
document.addEventListener('input',inventoryCaptureInput);
document.addEventListener('change',inventoryCaptureInput);
