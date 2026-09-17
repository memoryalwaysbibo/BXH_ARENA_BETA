/* v13.32.3 | Independent member raffles. Results are always supplied by the server. */
'use strict';
let raffleState=null,raffleLinkConsumed=false;
function canManageMemberRaffles(){return !!(userProfile&&userProfile.active===true&&!userProfile.deleted&&!['deleted','disabled','frozen'].includes(userProfile.accountStatus)&&(['staff','admin','super_admin','tester'].includes(userProfile.role)||userProfile.isTestAccount===true));}
function isRaffleManagementView(){return appPhase==='app'&&activeTab==='member-raffles'&&hasAdminAccess()&&canManageMemberRaffles();}
function rafflePendingKey(){return 'bxh.raffle.pending:'+currentAuthUid()+(isRaffleManagementView()?'':':player');}
function raffleShareUrl(event){
 if(!event||event.testMode||!['open','freezing','locked','drawn','cancelled','archived'].includes(event.state)||!/^[a-f0-9]{64}$/.test(event.id||''))return '';
 const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('raffle',event.id);return url.href;
}
function raffleShareText(event){
 const url=raffleShareUrl(event);if(!url)return '';
 const lines=['🎁 BXH 抽獎活動｜'+String(event.title||'未命名活動')];
 if(event.prizes?.length)lines.push('獎品：'+event.prizes.map(p=>String(p.name)+' × '+p.quantity).join('、'));
 if(Number.isFinite(event.drawAt)&&event.drawAt>0)lines.push('開獎：'+new Date(event.drawAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false})+'（台灣時間）');
 lines.push('點擊查看活動詳情與參加資格',url);return lines.join('\n');
}
async function copyRaffleShareUrl(input,status,label='活動網址'){
 try{await navigator.clipboard.writeText(input.value);status.textContent='已複製'+label;}
 catch{input.focus();input.select();input.setSelectionRange(0,input.value.length);let ok=false;try{ok=document.execCommand('copy')===true;}catch{}status.textContent=ok?'已複製'+label:'請長按或手動複製上方已選取的'+label;}
}
function raffleQrCard(source,title){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw Error('canvas-unavailable');
 canvas.width=720;ctx.font='bold 30px sans-serif';
 const lines=[];let line='';
 for(const ch of String(title||'抽獎活動')){if(ctx.measureText(line+ch).width>624&&line){lines.push(line);line='';}line+=ch;}if(line)lines.push(line);
 canvas.height=800+lines.length*42;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.textAlign='center';ctx.fillStyle='#111827';ctx.font='bold 26px sans-serif';ctx.fillText('BXH ARENA｜抽獎活動',360,48);
 ctx.font='bold 30px sans-serif';lines.forEach((s,i)=>ctx.fillText(s,360,100+i*42));
 const top=128+lines.length*42;
 ctx.imageSmoothingEnabled=false;ctx.drawImage(source,72,top,576,576);
 ctx.font='24px sans-serif';ctx.fillText('掃碼查看活動詳情與參加資格',360,top+632);
 return canvas;
}
async function shareRaffleQrFile(file,status,fallback){
 try{
  if(!file||typeof navigator.share!=='function'||typeof navigator.canShare!=='function'||!navigator.canShare({files:[file]})){fallback();return;}
  await navigator.share({files:[file]});status.textContent='分享操作已完成；是否存入照片，請到相簿確認。';
 }catch(error){if(error?.name==='AbortError')status.textContent='已取消分享，圖片仍可長按儲存。';else fallback();}
}
function openRaffleShare(event){
 const url=raffleShareUrl(event);if(!url)return;
 document.getElementById('raffle-share-dialog')?.remove();
 const previous=document.activeElement,dialog=document.createElement('dialog');dialog.id='raffle-share-dialog';
 dialog.setAttribute('aria-labelledby','raffle-share-title');dialog.style.cssText='box-sizing:border-box;width:min(460px,calc(100% - 16px));max-height:90dvh;overflow:auto;background:#111827;color:#fff;border:1px solid #64748b;border-radius:16px;padding:16px';
 dialog.innerHTML=`<h2 id="raffle-share-title">分享抽獎活動</h2><p style="overflow-wrap:anywhere">${esc(event.title)}</p><label for="raffle-share-text">活動分享內容</label><textarea id="raffle-share-text" readonly rows="5" style="width:100%;box-sizing:border-box;margin:8px 0">${esc(raffleShareText(event))}</textarea><div class="btn-row"><button class="btn btn-primary" data-raffle-share="copy-text">複製活動資訊</button><a class="btn btn-primary" data-raffle-share="line" target="_blank" rel="noopener noreferrer">分享到 LINE</a><button class="btn btn-ghost" data-raffle-share="native">其他分享</button></div><div id="raffle-share-qr" hidden aria-hidden="true"></div><img data-raffle-share-image hidden alt="${esc(event.title)} 活動 QR 圖片，可長按儲存" style="width:100%;max-width:340px;height:auto;margin:16px auto;-webkit-touch-callout:default;user-select:auto"><p class="hint">儲存到相簿：長按 QR 圖片，選擇儲存影像；也可點「分享 QR 圖片」選擇儲存影像或傳送。</p><div class="btn-row"><button class="btn btn-primary" data-raffle-share="image">分享 QR 圖片</button><button class="btn btn-ghost" data-raffle-share="save">長按儲存 QR</button><button class="btn btn-ghost" data-raffle-share="download">下載 PNG 檔</button><button class="btn btn-ghost" data-raffle-share="retry">重新產生 QR</button></div><details style="margin-top:16px"><summary>只需要活動網址</summary><input id="raffle-share-url" type="text" readonly value="${esc(url)}" style="width:100%;box-sizing:border-box;margin:8px 0"><button class="btn btn-ghost" data-raffle-share="copy">只複製網址</button></details><p class="hint">掃碼可查看活動，登入後再參加；活動結束後仍可查閱結果。</p><p role="status" aria-live="polite" data-raffle-share-status></p><button class="btn btn-ghost" data-raffle-share="close">關閉</button>`;
 document.body.appendChild(dialog);
 const pick=k=>dialog.querySelector('[data-raffle-share="'+k+'"]'),input=dialog.querySelector('#raffle-share-url'),shareText=dialog.querySelector('textarea'),status=dialog.querySelector('[data-raffle-share-status]'),preview=dialog.querySelector('[data-raffle-share-image]');
 let file=null,generation=0;
 const filename='BXH_'+String(event.title||'抽獎活動').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').slice(0,60)+'_QR.png';
 const showSave=()=>{preview.scrollIntoView({block:'center',behavior:'smooth'});status.textContent='請長按 QR 圖片，選擇「儲存影像／加入照片」。若 LINE 沒有此選項，請從瀏覽器選單改用 Safari 開啟本活動後儲存。';};
 const generate=()=>{
  const token=++generation;file=null;preview.hidden=true;preview.removeAttribute('src');['download','image','save'].forEach(k=>pick(k).disabled=true);
  try{
   renderQrCodeInto('raffle-share-qr',url,288);const source=dialog.querySelector('#raffle-share-qr canvas');if(!source)throw Error('qr-unavailable');
   const canvas=raffleQrCard(source,event.title);preview.src=canvas.toDataURL('image/png');preview.hidden=false;
   ['download','save'].forEach(k=>pick(k).disabled=false);status.textContent='QR 圖片已產生，可長按圖片儲存。';
   canvas.toBlob(blob=>{if(token!==generation||!dialog.isConnected)return;try{if(blob&&typeof File==='function')file=new File([blob],filename,{type:'image/png'});}catch{}pick('image').disabled=false;},'image/png');
  }catch{status.textContent='QR 產生失敗，可重新產生；仍可分享活動資訊或網址。';}
 };
 pick('copy').onclick=()=>copyRaffleShareUrl(input,status);
 pick('copy-text').onclick=()=>copyRaffleShareUrl(shareText,status,'活動資訊');
 pick('line').href='https://line.me/R/share?text='+encodeURIComponent(shareText.value);
 pick('native').hidden=typeof navigator.share!=='function';
 pick('native').onclick=async()=>{try{await navigator.share({title:'BXH 抽獎活動｜'+event.title,text:shareText.value});status.textContent='分享操作已完成。';}catch(error){if(error?.name==='AbortError')status.textContent='已取消分享。';else status.textContent='目前無法開啟系統分享，請使用「複製活動資訊」或「分享到 LINE」。';}};
 pick('retry').onclick=generate;pick('save').onclick=showSave;
 pick('image').onclick=()=>shareRaffleQrFile(file,status,showSave);
 pick('download').onclick=()=>{try{const a=document.createElement('a');a.href=preview.src;a.download=filename;dialog.appendChild(a);a.click();a.remove();status.textContent='已提出 PNG 檔下載；這不會自動存入相簿。若沒有下載，請改用長按圖片儲存。';}catch{showSave();}};
 pick('close').onclick=()=>dialog.close();dialog.onclose=()=>{generation++;file=null;dialog.remove();previous?.focus?.();};dialog.showModal();generate();
}
const raffleStateLabels={draft:'草稿',open:'開放報名',freezing:'確認資格中',locked:'名單已鎖定',drawn:'已開獎',cancelled:'已取消',archived:'已封存'};
function raffleDateInput(n){return new Date(n+28800000).toISOString().slice(0,16);}
function raffleNewDraft(){const now=Date.now();return {title:'',description:'',startAt:raffleDateInput(now),endAt:raffleDateInput(now+86400000),drawAt:raffleDateInput(now+86460000),claimUntil:raffleDateInput(now+8*86400000),claimInstructions:'',mode:'manual',checkedInOnly:false,combination:'all',prizes:[{name:'',imageUrl:'',quantity:1}],conditions:[]};}
function raffleContext(){
 const key=currentAuthUid()+':'+engagementSessionEpoch+':'+(isRaffleManagementView()?'manage':'player');
 if(!raffleState||raffleState.key!==key){let pending=null;try{pending=JSON.parse(sessionStorage.getItem(rafflePendingKey())||'null');if(!isRaffleManagementView()&&pending?.action!=='join')pending=null;}catch{}
  raffleState={key,id:'',events:null,nextCursor:null,detail:null,loading:false,busy:false,error:'',view:'list',canCreate:false,editing:false,draft:raffleNewDraft(),draftId:null,revision:null,pending,participants:[],participantCursor:null,participantsLoaded:false};
 }return raffleState;
}
function raffleIntent(){try{const id=sessionStorage.getItem('bxh.raffle.return')||new URLSearchParams(location.search).get('raffle');return /^[a-f0-9]{64}$/.test(id||'')?id:'';}catch{return '';}}
function restoreRaffleIntent(){const id=raffleIntent();if(!id||!userProfile?.realName||raffleLinkConsumed)return false;raffleLinkConsumed=true;try{sessionStorage.removeItem('bxh.raffle.return');}catch{}appPhase='player-center';playerActiveTab='raffles';currentRole='player';raffleContext().id=id;return true;}
function raffleError(e){const msg=String(e?.message||e||'');const messages={'auth-required':'請先登入會員。','creator-required':'此帳號沒有建立抽獎活動的權限。','manager-required':'只有活動主辦或最高管理員可操作。','event-not-found':'找不到活動，或此活動尚未公開。','not-eligible':'目前未符合活動條件，請確認帳號年資、賽事或票券資格。','registration-closed':'報名尚未開始、已截止，或名單已鎖定。','invalid-times':'時間須依序為報名開始、截止、開獎及領獎期限。','invalid-text':'請完整填寫內容，並確認字數未超過限制。','invalid-image':'圖片請使用完整 HTTPS 網址。','invalid-prizes':'請設定至少一項獎品，數量須為正整數。','too-many-prizes':'第一版每活動最多 20 種、合計 100 份獎品。','invalid-conditions':'最多 8 個條件；同一道具代碼請勿重複設定。','invalid-ticket':'請確認票券代碼與數量。','invalid-age':'請確認帳號年資條件。','invalid-event':'請輸入有效賽事代碼。','event-locked':'活動狀態已改變，請重新整理。','invalid-publish':'活動無法公布，請確認截止時間仍在未來。','lock-candidates-first':'請先鎖定並確認合格名單。','draw-not-due':'尚未到自動開獎時間。','version-conflict':'另一視窗已修改草稿，請重新讀取後再編輯。','claims-pending':'仍有獎品待領，領獎期限結束或處理完畢後才能封存。','claim-expired-or-resolved':'領獎期限已過或獎品已處理。','redraw-unavailable':'須先記錄棄領，並在領獎期限內補抽。','no-replacement':'沒有可補抽的合格玩家。','review-rejected':'此報名已被主辦拒絕。','storage-unavailable':'無法保存操作紀錄，請允許工作階段儲存後再試。'};for(const [k,v]of Object.entries(messages))if(msg.includes(k))return v;return '操作尚未確認，請重試原操作或重新整理查看狀態。';}
async function loadRaffles(more=false){const c=raffleContext();if(c.loading||c.busy)return;c.loading=true;c.error='';render();try{const r=await window.engagementService.raffle(c.id?{action:'get',id:c.id}:{action:c.view==='mine'?'mine':'list',cursor:more?c.nextCursor:null});if(c!==raffleContext())return;if(!r?.ok)throw Error('load-failed');c.canCreate=r.canCreate===true;if(c.id)c.detail=r;else{c.events=more?[...(c.events||[]),...r.events]:r.events;c.nextCursor=r.nextCursor;}}catch(e){if(c===raffleContext())c.error=raffleError(e);}finally{if(c===raffleContext()){c.loading=false;render();}}}
function raffleRuleLabel(r){if(r.kind==='age')return '帳號滿 '+r.value+(r.unit==='months'?' 個月':' 天');if(r.kind==='ticket')return (r.mode==='consume'?'報名完成扣除 ':'持有 ')+r.itemCode+' × '+r.quantity;if(r.kind==='event')return '賽事 '+r.code+'：'+({registered:'已報名',checkedIn:'已報到',completed:'完成參賽'})[r.stage];return '人工審核：'+r.note;}
function renderRaffleEditor(c){const d=c.draft,disabled=c.busy||!!c.pending;const input=(key,label,type='text',max=120)=>`<div class="field"><label>${label}</label><input data-raffle-field="${key}" type="${type}" maxlength="${max}" value="${esc(d[key]||'')}" ${disabled?'disabled':''}></div>`;
 if(!isRaffleManagementView())return '';
 return `<section class="panel"><div class="panel-title">${c.draftId?'編輯草稿':'建立會員抽獎'}</div><p class="hint">公布後獎品與資格即鎖定。每人最多中獎一次，每份獎品一位得獎者；候選人不足時保留未抽出的獎品。</p><fieldset ${disabled?'disabled':''} style="border:0;padding:0"><div class="grid grid-2 inventory-grid">${input('title','活動名稱','text',80)}<div class="field"><label>開獎模式</label><select data-raffle-field="mode"><option value="manual" ${d.mode==='manual'?'selected':''}>現場手動開獎</option><option value="auto" ${d.mode==='auto'?'selected':''}>線上自動開獎</option></select></div>${input('startAt','報名開始（台灣時間）','datetime-local')}${input('endAt','報名截止（台灣時間）','datetime-local')}${input('drawAt','開獎時間（台灣時間）','datetime-local')}${input('claimUntil','領獎期限（台灣時間）','datetime-local')}<div class="field" style="grid-column:1/-1"><label>活動說明</label><textarea data-raffle-field="description" maxlength="3000">${esc(d.description)}</textarea></div><div class="field" style="grid-column:1/-1"><label>領獎方式</label><textarea data-raffle-field="claimInstructions" maxlength="1000">${esc(d.claimInstructions)}</textarea></div></div><label><input type="checkbox" data-raffle-field="checkedInOnly" ${d.checkedInOnly?'checked':''}> 現場模式僅限主辦已標記報到者</label>
 <h3>獎品 <button class="btn btn-ghost btn-sm" data-action="raffle-add-prize">＋ 新增品項</button></h3><p class="hint">第一版最多 20 種、合計 100 份獎品；會員報名不設人數上限。</p>${d.prizes.map((p,i)=>`<div class="panel grid grid-2 inventory-grid"><div class="field"><label>名稱</label><input data-raffle-prize="${i}" data-key="name" value="${esc(p.name)}" maxlength="60"></div><div class="field"><label>數量</label><input type="number" min="1" max="100" data-raffle-prize="${i}" data-key="quantity" value="${p.quantity}"></div><div class="field"><label>圖片網址（選填）</label><input type="url" data-raffle-prize="${i}" data-key="imageUrl" value="${esc(p.imageUrl)}"></div><button class="btn btn-ghost" data-action="raffle-remove-prize" data-index="${i}">移除此品項</button></div>`).join('')}
 <h3>玩家條件</h3><p class="hint">不新增條件即開放有效會員參加。選「任一項」時依下列順序採用第一個符合的條件；只在採用扣票條件時扣票。人工審核通過、報名完成時才扣票。活動取消退回原批次，已過期票券仍不可使用。</p><select data-raffle-field="combination"><option value="all" ${d.combination==='all'?'selected':''}>全部符合</option><option value="any" ${d.combination==='any'?'selected':''}>符合任一項</option></select>
 ${d.conditions.map((r,i)=>`<div class="panel"><div class="btn-row"><b>${esc(({age:'帳號年資',event:'指定賽事',ticket:'指定票券',manual:'人工審核'})[r.kind])}</b><button class="btn btn-ghost btn-sm" data-action="raffle-remove-rule" data-index="${i}">移除</button></div>${r.kind==='age'?`<input type="number" min="1" data-raffle-rule="${i}" data-key="value" value="${r.value}"><select data-raffle-rule="${i}" data-key="unit"><option value="months" ${r.unit==='months'?'selected':''}>個月（例如 1／3／6／12）</option><option value="days" ${r.unit==='days'?'selected':''}>自訂天數</option></select>`:r.kind==='ticket'?`<input placeholder="道具代碼" data-raffle-rule="${i}" data-key="itemCode" value="${esc(r.itemCode)}"><input type="number" min="1" max="10000" data-raffle-rule="${i}" data-key="quantity" value="${r.quantity}"><select data-raffle-rule="${i}" data-key="mode"><option value="hold" ${r.mode==='hold'?'selected':''}>持有資格（不扣票）</option><option value="consume" ${r.mode==='consume'?'selected':''}>消耗票券</option></select>`:r.kind==='event'?`<input placeholder="賽事代碼" data-raffle-rule="${i}" data-key="code" value="${esc(r.code)}"><select data-raffle-rule="${i}" data-key="stage">${[['registered','已報名'],['checkedIn','已報到'],['completed','完成參賽']].map(([v,t])=>`<option value="${v}" ${r.stage===v?'selected':''}>${t}</option>`).join('')}</select>`:`<input placeholder="請說明人工審核條件" maxlength="300" data-raffle-rule="${i}" data-key="note" value="${esc(r.note)}">`}</div>`).join('')}
 <div class="btn-row">${[['age','年資'],['event','賽事'],['ticket','票券'],['manual','人工審核']].map(([v,t])=>`<button class="btn btn-ghost btn-sm" data-action="raffle-add-rule" data-kind="${v}">＋ ${t}</button>`).join('')}</div></fieldset><div class="btn-row" style="margin-top:16px"><button class="btn btn-primary" data-action="raffle-save" ${disabled?'disabled':''}>儲存草稿</button><button class="btn btn-ghost" data-action="raffle-editor-close" ${c.busy?'disabled':''}>返回活動</button></div></section>`;
}
function renderRafflePage(){
 const c=raffleContext(),management=isRaffleManagementView();if(!c.editing&&!c.loading&&!c.busy&&!c.error&&(c.id?!c.detail:c.events===null))setTimeout(()=>loadRaffles(),0);
 const d=c.detail,e=d?.event,locked=c.loading||c.busy||!!c.pending;
 return `<section class="panel"><div class="panel-title"><span>🎰 ${management?'會員抽獎管理':'會員抽獎'}</span><div class="btn-row"><button class="btn btn-ghost btn-sm" data-action="raffle-list">全部活動</button>${currentAuthUid()?'<button class="btn btn-ghost btn-sm" data-action="raffle-mine">我的活動</button>':''}<button class="btn btn-ghost btn-sm" data-action="raffle-refresh" ${c.loading||c.busy?'disabled':''}>重新整理</button>${management?'<button class="btn btn-ghost btn-sm" data-action="raffle-claim-scan">掃碼核銷</button>':''}${management&&c.canCreate?'<button class="btn btn-primary btn-sm" data-action="raffle-new">建立活動</button>':''}</div></div>${c.error?`<p class="auth-error" role="alert">${esc(c.error)}</p>`:''}${c.pending?`<p class="hint">有一筆待確認操作。<button class="btn btn-primary" data-action="raffle-retry-pending" ${c.busy?'disabled':''}>重試原操作</button></p>`:''}${c.loading?'<p role="status">載入活動中……</p>':''}
 ${management&&c.editing?renderRaffleEditor(c):e?`<article>${raffleShareUrl(e)?'<button class="btn btn-ghost" data-action="raffle-share">分享活動／QR</button>':''}<h2>${e.testMode?'（TEST）':''}${esc(e.title)}</h2><p class="hint">${esc(raffleStateLabels[e.state])}${e.delayed?'｜處理延遲，系統正在重試':''}｜${e.mode==='auto'?'線上自動開獎':'現場手動開獎'}</p><div class="mailbox-body">${esc(e.description)}</div><p>報名：${esc(mailboxDate(e.startAt))} ～ ${esc(mailboxDate(e.endAt))}<br>開獎：${esc(mailboxDate(e.drawAt))}（台灣時間）<br>領獎期限：${esc(mailboxDate(e.claimUntil))}</p><p class="hint">${e.conditions.length?(e.combination==='all'?'全部符合：':'符合任一項：')+e.conditions.map(raffleRuleLabel).map(esc).join('；'):'有效會員即可參加'}${e.checkedInOnly?'；只抽主辦已標記報到者':''}</p><div class="grid grid-2 inventory-grid">${e.prizes.map(p=>`<div class="panel inventory-card">${inventoryImage(p.imageUrl)?`<img class="inventory-image" src="${esc(p.imageUrl)}" alt="${esc(p.name)}" referrerpolicy="no-referrer">`:''}<span>${esc(p.name)} × ${p.quantity}</span></div>`).join('')}</div>
 <p>我的狀態：${esc(d.myEntry?({joined:'已參加',pending_review:'待主辦審核',rejected:'審核未通過',cancelled:'已取消'})[d.myEntry.status]||d.myEntry.status:currentAuthUid()?'尚未參加':'尚未登入')}${d.myEntry?.award?'｜'+esc(d.myEntry.award.prizeName)+'：'+esc(({pending:'已中獎／待領獎',claimed:'已領獎',forfeited:'已棄領',replaced:'已補抽'})[d.myEntry.award.status]||''):''}${d.myEntry?.refundedAt?'｜退票處理完成':''}</p>
 ${d.myEntry?.award?.status==='pending'?'<button class="btn btn-primary" data-action="raffle-claim-code">出示我的領獎碼</button>':''}
 ${d.myEntry?.award?.claimedAt?'<p>核銷時間：'+esc(mailboxDate(d.myEntry.award.claimedAt))+'（台灣時間）</p>':''}
 ${!management&&e.state==='open'&&d.myEntry?.status!=='joined'?`<button class="btn btn-primary" data-action="${currentAuthUid()?'raffle-join':'raffle-login'}" ${locked?'disabled':''}>${currentAuthUid()?'參加活動':'登入／註冊後參加'}</button>`:''}
 ${d.winners.length||d.drawnAt?`<section class="panel"><div class="panel-title">開獎結果</div><p class="hint">結果由後端保存；回放沿用同一份結果。</p><button class="btn btn-primary" data-action="raffle-play">全螢幕拉霸／紀錄回放</button><details><summary>查看完整結果</summary>${d.winners.map(w=>`<p>${esc(w.prizeName)}：${esc(w.nickname)}（${esc(w.playerId)}）｜${esc(({pending:'待領獎',claimed:'已領獎',forfeited:'已棄領'})[w.status])}${management&&d.isManager?`<span class="btn-row">${w.status==='pending'?`<button class="btn btn-ghost btn-sm" data-action="raffle-claim" data-award="${esc(w.awardId)}" ${locked?'disabled':''}>確認已領獎</button><button class="btn btn-ghost btn-sm" data-action="raffle-forfeit" data-award="${esc(w.awardId)}" ${locked?'disabled':''}>記錄棄領</button>`:w.status==='forfeited'?`<button class="btn btn-ghost btn-sm" data-action="raffle-redraw" data-award="${esc(w.awardId)}" ${locked?'disabled':''}>補抽此份獎品</button>`:''}</span>`:''}</p>`).join('')||'<p>本次沒有合格得獎者。</p>'}</details><p class="mailbox-body">領獎方式：${esc(e.claimInstructions)}</p></section>`:''}
 ${management&&d.isManager?`<section class="panel"><div class="panel-title">主辦管理</div><div class="btn-row"><button class="btn btn-ghost" data-action="raffle-claim-history">核銷紀錄</button><button class="btn btn-ghost" data-action="raffle-claim-staff">核銷人員授權</button></div><p class="hint">報名 ${e.entryCount} 人｜鎖定合格 ${e.candidateCount} 人。鎖定後不能增刪報名或報到；公布後不能修改獎品與資格。</p><div class="btn-row">${e.state==='draft'?'<button class="btn btn-ghost" data-action="raffle-edit">編輯草稿</button><button class="btn btn-primary" data-action="raffle-publish">公布活動</button>':''}${e.state==='open'?'<button class="btn btn-ghost" data-action="raffle-participants">查看報名／審核／報到</button>':''}${e.state==='open'&&e.mode==='manual'?'<button class="btn btn-primary" data-action="raffle-lock">截止報名並鎖定合格名單</button>':''}${e.state==='locked'?'<button class="btn btn-ghost" data-action="raffle-participants">查看鎖定名單</button>':''}${e.state==='locked'&&e.mode==='manual'?'<button class="btn btn-primary" data-action="raffle-draw">確認名單，開始開獎</button>':''}${['freezing','drawn','cancelled','archived'].includes(e.state)?'<button class="btn btn-ghost" data-action="raffle-retry">重試後續處理</button>':''}${['draft','open','locked','freezing'].includes(e.state)?'<button class="btn btn-ghost" data-action="raffle-cancel">取消活動並退票</button>':''}${e.state==='drawn'?'<button class="btn btn-ghost" data-action="raffle-archive">封存活動</button>':''}</div>${c.participants.map(p=>`<div class="panel">${esc(p.nickname)}（${esc(p.playerId)}）｜${p.eligible===true?'合格':p.eligible===false?'未符合資格':esc(p.status||'')}｜${p.checkedIn?'已報到':'未報到'}${e.state==='open'?`<div class="btn-row"><button class="btn btn-ghost btn-sm" data-action="raffle-checkin" data-uid="${esc(p.uid)}">${p.checkedIn?'取消報到':'標記已報到'}</button>${p.status==='pending_review'?`<button class="btn btn-ghost btn-sm" data-action="raffle-approve" data-uid="${esc(p.uid)}">審核通過</button><button class="btn btn-ghost btn-sm" data-action="raffle-reject" data-uid="${esc(p.uid)}">拒絕</button>`:''}</div>`:''}</div>`).join('')}${c.participantCursor?'<button class="btn btn-ghost" data-action="raffle-participants-more">載入更多名單</button>':''}</section>`:''}</article>`:`<div class="grid grid-2 inventory-grid">${(c.events||[]).map(e=>`<button class="panel mailbox-item" data-action="raffle-open" data-id="${esc(e.id)}"><h3>${e.testMode?'（TEST）':''}${esc(e.title)}</h3><p>${esc(raffleStateLabels[e.state])}｜${e.mode==='auto'?'線上自動':'現場手動'}</p><p class="hint">截止：${esc(mailboxDate(e.endAt))}${e.myAward?'｜'+esc(e.myAward.prizeName)+'：'+esc(({pending:'已中獎／待領獎',claimed:'已領獎',forfeited:'已棄領',replaced:'已補抽'})[e.myAward.status]||''):e.myStatus?'｜已留下報名紀錄':''}</p></button>`).join('')||(!c.loading?'<p class="empty-state">目前沒有活動。</p>':'')}</div>${c.nextCursor?'<button class="btn btn-ghost" data-action="raffle-more">載入更多</button>':''}`}</section>`;
}
async function raffleMutate(payload){
 const c=raffleContext();if(c.busy)return;if((c.pending||payload)?.action!=='join'&&!isRaffleManagementView())return;const storageKey=rafflePendingKey();c.error='';
 try{if(!c.pending){try{sessionStorage.setItem(storageKey,JSON.stringify(payload));}catch{throw Error('storage-unavailable');}c.pending=payload;}c.busy=true;render();const r=await window.engagementService.raffle(c.pending);if(c!==raffleContext())return;if(!r?.ok)throw Error('operation-failed');const action=c.pending.action;if(r.id)c.id=r.id;c.pending=null;try{sessionStorage.removeItem(storageKey);}catch{}c.busy=false;c.editing=false;c.detail=null;c.events=null;c.participants=[];c.participantCursor=null;await loadRaffles();if(['join','approve','cancel'].includes(action)){inventoryState=null;}if(action==='draw'||action==='retry')await loadMailbox(true);}
 catch(e){if(c===raffleContext()){c.error=raffleError(e);if(e.code==='functions/failed-precondition'&&!String(e.message).includes('operation-conflict')){c.pending=null;try{sessionStorage.removeItem(storageKey);}catch{}}}}
 finally{if(c===raffleContext()){c.busy=false;render();}}
}
async function handleRaffle(action,target){
 const c=raffleContext();if(c.busy)return;
 const memberActions=['raffle-claim-code','raffle-share','raffle-play','raffle-login','raffle-public','raffle-home','raffle-list','raffle-mine','raffle-open','raffle-refresh','raffle-more','raffle-join','raffle-retry-pending'];
 if(!isRaffleManagementView()&&!memberActions.includes(action))return;
 if(c.loading&&!['raffle-home','raffle-login','raffle-play'].includes(action))return;
 if(action==='raffle-claim-code'){window.bxhRaffleClaims.showCode(c.detail);return;}
 if(action==='raffle-claim-scan'){window.bxhRaffleClaims.scanner();return;}
 if(action==='raffle-claim-history'){if(c.detail?.isManager)window.bxhRaffleClaims.history(c.detail);return;}
 if(action==='raffle-claim-staff'){if(c.detail?.isManager)window.bxhRaffleClaims.staff(c.detail);return;}
 if(action==='raffle-play'){playRaffleReplay(c.detail);return;}
 if(action==='raffle-share'){openRaffleShare(c.detail?.event);return;}
 if(action==='raffle-login'){try{sessionStorage.setItem('bxh.raffle.return',c.id);}catch{}pendingLoginIntent='player';appPhase='player-login';render();return;}
 if(action==='raffle-public'){appPhase='raffle-public';c.id='';render();return;}
 if(action==='raffle-home'){appPhase=currentAuthUid()?'player-center':'landing';if(currentAuthUid())playerActiveTab='home';raffleLinkConsumed=true;render();return;}
 if(action==='raffle-list'||action==='raffle-mine'){c.id='';c.detail=null;c.editing=false;c.view=action==='raffle-mine'?'mine':'list';c.events=null;await loadRaffles();return;}
 if(action==='raffle-open'){c.id=target.getAttribute('data-id');c.detail=null;c.editing=false;c.participants=[];c.participantCursor=null;await loadRaffles();return;}
 if(action==='raffle-refresh'){if(c.id)c.detail=null;else c.events=null;await loadRaffles();return;}
 if(action==='raffle-more'){await loadRaffles(true);return;}
 if(action==='raffle-new'){if(!c.canCreate)return;c.draft=raffleNewDraft();c.draftId=null;c.revision=null;c.editing=true;render();return;}
 if(action==='raffle-edit'){if(!c.detail?.isManager)return;const e=c.detail.event;c.draft=JSON.parse(JSON.stringify(e));for(const k of ['startAt','endAt','drawAt','claimUntil'])c.draft[k]=raffleDateInput(e[k]);c.draftId=e.id;c.revision=e.revision;c.editing=true;render();return;}
 if(action==='raffle-editor-close'){c.editing=false;render();return;}
 if(action==='raffle-retry-pending'){if(c.pending)await raffleMutate(c.pending);return;}
 if(c.pending||c.loading)return;
 if(action==='raffle-add-prize'){if(c.draft.prizes.length<20)c.draft.prizes.push({name:'',imageUrl:'',quantity:1});render();return;}
 if(action==='raffle-remove-prize'){c.draft.prizes.splice(Number(target.getAttribute('data-index')),1);render();return;}
 if(action==='raffle-add-rule'){const kind=target.getAttribute('data-kind'),defaults={age:{unit:'months',value:1},ticket:{itemCode:'',quantity:1,mode:'hold'},event:{code:'',stage:'registered'},manual:{note:''}};if(c.draft.conditions.length<8&&defaults[kind])c.draft.conditions.push({kind,...defaults[kind]});render();return;}
 if(action==='raffle-remove-rule'){c.draft.conditions.splice(Number(target.getAttribute('data-index')),1);render();return;}
 if(action==='raffle-save'){try{const config=JSON.parse(JSON.stringify(c.draft));for(const key of ['startAt','endAt','drawAt','claimUntil'])config[key]=inventoryExpiry(config[key]);await raffleMutate({action:'save',id:c.draftId||undefined,revision:c.revision,config,operationId:crypto.randomUUID()});}catch(e){c.error=raffleError(e);render();}return;}
 if(action==='raffle-participants'||action==='raffle-participants-more'){c.busy=true;render();try{const more=action.endsWith('-more'),r=await window.engagementService.raffle({action:'participants',id:c.id,cursor:more?c.participantCursor:null});if(c!==raffleContext())return;if(!r?.ok)throw Error('load-failed');c.participants=more?[...c.participants,...r.participants]:r.participants;c.participantCursor=r.nextCursor;}catch(e){if(c===raffleContext())c.error=raffleError(e);}finally{if(c===raffleContext()){c.busy=false;render();}}return;}
 const apiAction=action.slice(7);if(!['join','publish','lock','draw','checkin','approve','reject','cancel','retry','claim','forfeit','redraw','archive'].includes(apiAction))return;
 const text={join:'確認參加？如採用消耗票券條件，報名完成時會扣票；活動取消才退還。',publish:'公布後不能修改獎品、時間及資格，確定公布？',lock:'確定截止報名、鎖定資格與報到名單？',draw:'確定依鎖定合格名單開獎？結果保存後不會重抽。',cancel:'確定取消活動？系統將退回原先扣除的票券。',claim:'確定此份獎品已交付？',redraw:'確定補抽此份棄領獎品？原紀錄會保留。',archive:'確定封存活動？結果仍可查閱。'};
 if(text[apiAction]&&!confirm(text[apiAction]))return;let reason='';if(['cancel','reject','forfeit'].includes(apiAction)){reason=prompt('請填寫原因（會保存紀錄）')||'';if(!reason.trim())return;}
 await raffleMutate({action:apiAction,id:c.id,targetUid:target?.getAttribute('data-uid')||undefined,awardId:target?.getAttribute('data-award')||undefined,reason,operationId:crypto.randomUUID()});
}
function captureRaffleDraft(e){const el=e.target,c=raffleContext();if(!c.editing||c.busy||c.pending)return;const field=el.getAttribute?.('data-raffle-field'),prize=el.getAttribute?.('data-raffle-prize'),rule=el.getAttribute?.('data-raffle-rule'),key=el.getAttribute?.('data-key');if(field&&Object.hasOwn(c.draft,field))c.draft[field]=el.type==='checkbox'?el.checked:el.value;if(prize!==null&&prize!==undefined&&c.draft.prizes[Number(prize)]&&['name','quantity','imageUrl'].includes(key))c.draft.prizes[Number(prize)][key]=key==='quantity'?Number(el.value):el.value;if(rule!==null&&rule!==undefined&&c.draft.conditions[Number(rule)]&&['unit','value','itemCode','quantity','mode','code','stage','note'].includes(key))c.draft.conditions[Number(rule)][key]=['value','quantity'].includes(key)?Number(el.value):el.value;}
document.addEventListener('input',captureRaffleDraft);document.addEventListener('change',captureRaffleDraft);
setInterval(()=>{
 raffleAnnouncementsState.loaded=false;
 const c=raffleContext();
 if(!c.loading&&!c.busy&&!c.editing&&!c.pending&&c.id&&['open','freezing','locked'].includes(c.detail?.event?.state)&&(appPhase==='raffle-public'||appPhase==='player-center'&&playerActiveTab==='raffles'))loadRaffles();
},60000);
function playRaffleReplay(detail){
 if(!detail?.drawnAt)return;
 window.bxhRaffleReplay?.open(detail);
}
let raffleAnnouncementsState={loaded:false,loading:false,rows:[]};
function renderRaffleAnnouncements(){const a=raffleAnnouncementsState;if(!a.loaded&&!a.loading){a.loading=true;setTimeout(async()=>{try{const r=await window.engagementService.raffle({action:'announcements'});a.rows=r.announcements||[];}catch{}finally{a.loaded=true;a.loading=false;render();}},0);}const visible=a.rows.filter(x=>x.expiresAt>Date.now());return visible.length?`<div class="raffle-announcement-window" aria-label="系統開獎公告"><div class="mood-track"><div class="mood-group">${visible.map(x=>`<span class="mood-item"><b>系統公告</b> ${esc(x.text)}</span>`).join('')}</div></div></div>`:'';}



/* BXH lobby fold + raffle store enhancer v1 */
(function(){
 'use strict';
 if(window.__bxhLobbyRaffleEnhancer)return;window.__bxhLobbyRaffleEnhancer=true;
 var queued=false;
 function textOf(el){return String(el&&el.textContent||'').replace(/\s+/g,' ').trim();}
 function keyOf(label){if(label.indexOf('比賽中')>=0)return'live';if(label.indexOf('結算中')>=0)return'settling';if(label.indexOf('報名中')>=0)return'registration';if(label.indexOf('等待開始')>=0)return'waiting';return'ended';}
 function saved(key){try{return sessionStorage.getItem('bxh.ui.lobby-fold.'+key);}catch(e){return null;}}
 function setClosed(section,toggle,key,closed){section.classList.toggle('is-collapsed',closed);toggle.setAttribute('aria-expanded',closed?'false':'true');toggle.firstChild.textContent=closed?'展開':'收合';try{sessionStorage.setItem('bxh.ui.lobby-fold.'+key,closed?'closed':'open');}catch(e){}}
 function enhanceLobby(){
  document.querySelectorAll('.lobby-section').forEach(function(section){
   if(section.dataset.bxhLobbyFoldReady==='1')return;
   var head=section.querySelector(':scope > .panel-title');if(!head)return;
   var label=textOf(head),key=keyOf(label),body=document.createElement('div');body.className='bxh-lobby-fold-content';
   Array.from(section.children).forEach(function(child){if(child!==head)body.appendChild(child);});
   section.appendChild(body);section.dataset.bxhLobbyFoldReady='1';section.classList.add('bxh-lobby-fold');head.classList.add('bxh-lobby-fold-head');
   var toggle=document.createElement('button');toggle.type='button';toggle.className='bxh-lobby-fold-toggle';toggle.setAttribute('aria-label',label+' 展開或收合');toggle.appendChild(document.createTextNode('收合'));head.appendChild(toggle);
   var state=saved(key),closed=state==='closed'?true:state==='open'?false:key==='ended';setClosed(section,toggle,key,closed);
   function flip(event){event.preventDefault();event.stopPropagation();setClosed(section,toggle,key,!section.classList.contains('is-collapsed'));}
   toggle.addEventListener('click',flip);head.addEventListener('click',function(event){if(event.target.closest('button,a,input,select,textarea,label'))return;flip(event);});
  });
 }
 function awardLabel(status){return{pending:'已中獎・待領獎',claimed:'已中獎・已領獎',forfeited:'中獎紀錄・已棄領',replaced:'原中獎獎項已補抽'}[status]||'中獎';}
 function enhanceRaffles(){
  document.querySelectorAll('[data-action="raffle-list"]').forEach(function(listButton){
   var page=listButton.closest('section.panel');if(!page)return;page.classList.add('raffle-page');
   var toolbar=listButton.closest('.btn-row');if(toolbar)toolbar.classList.add('raffle-toolbar');
   var mine=page.querySelector('[data-action="raffle-mine"]'),refresh=page.querySelector('[data-action="raffle-refresh"]');
   listButton.classList.add('raffle-filter');if(mine)mine.classList.add('raffle-filter');if(refresh)refresh.classList.add('raffle-filter','raffle-filter-refresh');
   var view='list',events=[];try{var state=raffleContext();view=state&&state.view||'list';events=state&&state.events||[];}catch(e){}
   listButton.classList.toggle('is-active',view!=='mine');if(mine)mine.classList.toggle('is-active',view==='mine');
   var byId=new Map(events.map(function(event){return[String(event.id),event];}));
   page.querySelectorAll('.panel.mailbox-item[data-action="raffle-open"]').forEach(function(card){
    var event=byId.get(String(card.getAttribute('data-id')||''));if(!event)return;
    var status=event.myAward&&event.myAward.status||'',drawn=['drawn','archived','cancelled'].indexOf(event.state)>=0;
    if(card.parentElement)card.parentElement.classList.add('raffle-card-grid');
    card.classList.add('raffle-game-card',drawn?'is-raffle-drawn':'is-raffle-pending');
    if(!status)return;card.classList.add('is-raffle-winner');if(status==='claimed')card.classList.add('is-raffle-claimed');
    var title=card.querySelector('h3');if(title&&!card.querySelector('.raffle-winner-badge')){var head=document.createElement('span');head.className='raffle-card-head';title.before(head);head.appendChild(title);var badge=document.createElement('span');badge.className='raffle-winner-badge';badge.textContent=awardLabel(status);head.appendChild(badge);}
   });
  });
 }
 function run(){queued=false;enhanceLobby();enhanceRaffles();}function schedule(){if(queued)return;queued=true;requestAnimationFrame(run);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
 new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
})();
