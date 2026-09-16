/* v13.35.0 Claim credentials stay in memory; every confirmation is checked by the backend. */
(function(){
 'use strict';
 let closeActive=null;
 const date=n=>n?new Date(n).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false})+'（台灣時間）':'未提供';
 const messages={'invalid-claim-code':'領獎碼格式不正確或不存在。','claim-code-replaced':'這份獎品已補抽，原領獎碼失效。','manager-required':'你沒有這場活動的核銷或管理權限。','staff-required':'請選擇有效的正式工作人員或管理員帳號。','test-staff-disabled':'TEST 活動僅限建立者操作，不能另外授權。','too-many-staff':'每場最多授權 20 位核銷人員。'};
 function error(e){for(const [k,v]of Object.entries(messages))if(String(e?.message||e).includes(k))return v;return raffleError(e);}
 function modal(title){
  closeActive?.();const uid=currentAuthUid(),epoch=engagementSessionEpoch,previous=document.activeElement,d=document.createElement('dialog');d.className='raffle-claim-dialog';d.setAttribute('aria-label',title);
  d.innerHTML='<header><h2></h2><button type="button" class="btn btn-ghost claim-close">關閉</button></header><div class="claim-content"></div><p class="claim-status" role="status" aria-live="polite"></p>';
  d.querySelector('h2').textContent=title;document.body.appendChild(d);const body=d.querySelector('.claim-content'),status=d.querySelector('.claim-status');let disposed=false,onDispose=()=>{};
  const valid=()=>!disposed&&uid===currentAuthUid()&&epoch===engagementSessionEpoch;
  const close=()=>{if(disposed)return;disposed=true;clearInterval(watch);onDispose();d.close();d.remove();previous?.focus?.();if(closeActive===close)closeActive=null;};
  const watch=setInterval(()=>{if(!valid())close();},500);d.querySelector('.claim-close').onclick=close;d.oncancel=e=>{e.preventDefault();close();};d.onclose=close;closeActive=close;d.showModal();
  return {d,body,status,valid,close,setDispose:fn=>onDispose=fn,async api(data){if(!valid())throw Error('auth-required');const r=await window.engagementService.raffle(data);if(!valid())throw Error('auth-required');if(!r?.ok)throw Error('load-failed');return r;}};
 }
 async function showCode(detail){
  if(!detail?.myEntry?.award)return;const m=modal('我的領獎碼');m.status.textContent='正在取得領獎碼…';
  try{const r=await m.api({action:'claimCode',id:detail.event.id,awardId:detail.myEntry.award.awardId});if(!m.valid())return;
   m.body.innerHTML='<p class="claim-person"></p><h3 class="claim-prize"></h3><div id="raffle-personal-claim-qr" class="claim-qr"></div><label>領獎碼<input class="claim-code" readonly></label><p class="claim-until"></p><p class="hint">請向核銷人員出示。這是你的領獎憑證，請勿公開分享。</p><button type="button" class="btn btn-primary claim-refresh">更新領獎狀態</button>';
   m.body.querySelector('.claim-person').textContent=r.nickname+'（'+r.playerId+'）';m.body.querySelector('.claim-prize').textContent=r.prizeName+' × 1';m.body.querySelector('.claim-code').value=r.code.match(/.{1,4}/g).join('-');m.body.querySelector('.claim-until').textContent='領獎期限：'+date(r.claimUntil);
   try{if(!window.QRCode)throw Error('qr');new window.QRCode(m.body.querySelector('.claim-qr'),{text:r.qr,width:240,height:240,correctLevel:window.QRCode.CorrectLevel.M});m.status.textContent='等待主辦掃描並確認交付。';}catch{m.status.textContent='QR 暫時無法顯示，核銷人員仍可輸入上方領獎碼。';}
   m.body.querySelector('.claim-refresh').onclick=async()=>{try{const latest=await m.api({action:'get',id:detail.event.id});if(latest.myEntry?.award?.status!=='pending'){m.close();await loadRaffles();}else m.status.textContent='尚待核銷，請完成獎品交付。';}catch(e){if(m.valid())m.status.textContent=error(e);}};
  }catch(e){if(m.valid())m.status.textContent=error(e);}
 }
 function scanner(){
  const m=modal('掃描領獎碼／核銷');m.body.innerHTML='<p class="hint">掃描後先核對玩家與獎品，再確認交付。</p><video class="claim-video" playsinline muted hidden></video><div class="btn-row"><button type="button" class="btn btn-primary claim-camera">開啟相機掃描</button><button type="button" class="btn btn-ghost claim-stop" hidden>停止相機</button></div><label>或輸入領獎碼<input class="claim-input" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="100" placeholder="貼上或輸入領獎碼"></label><button type="button" class="btn btn-ghost claim-lookup">查詢領獎資料</button><div class="claim-preview"></div>';
  const input=m.body.querySelector('.claim-input'),preview=m.body.querySelector('.claim-preview'),video=m.body.querySelector('video'),camera=m.body.querySelector('.claim-camera'),stopButton=m.body.querySelector('.claim-stop'),lookup=m.body.querySelector('.claim-lookup');
  let stream=null,scanTimer=null,scanEpoch=0,busy=false,selectedCode='',operationId='',cameraStarting=false;
  function stop(){scanEpoch++;clearTimeout(scanTimer);scanTimer=null;stream?.getTracks().forEach(t=>t.stop());stream=null;video.pause();video.srcObject=null;video.hidden=true;camera.disabled=false;cameraStarting=false;stopButton.hidden=true;}
  const onVisibility=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',onVisibility);m.setDispose(()=>{stop();document.removeEventListener('visibilitychange',onVisibility);});stopButton.onclick=stop;
  function show(r){
   preview.innerHTML='<h3 class="claim-event"></h3><p class="claim-winner"></p><p class="claim-item"></p><p class="claim-deadline"></p><p class="claim-result"></p><button type="button" class="btn btn-primary claim-confirm" hidden>確認已交付，完成核銷</button>';
   preview.querySelector('.claim-event').textContent=r.eventTitle;preview.querySelector('.claim-winner').textContent=r.nickname+'（'+r.playerId+'）';preview.querySelector('.claim-item').textContent=r.prizeName+' × 1';preview.querySelector('.claim-deadline').textContent='領獎期限：'+date(r.claimUntil);
   const result=preview.querySelector('.claim-result'),confirmButton=preview.querySelector('.claim-confirm');
   if(r.status==='claimed')result.textContent='已領獎｜'+date(r.receipt?.at)+'｜核銷人：'+(r.receipt?.actorName||'歷史紀錄未提供')+(r.receipt?.actorUid?'（'+r.receipt.actorUid+'）':'');
   else if(r.status!=='pending')result.textContent='此獎品已棄領或處理，不能核銷。';else if(r.expired)result.textContent='領獎期限已過，不能核銷。';else{result.textContent='待領獎：請核對玩家編號並交付獎品。';confirmButton.hidden=false;}
   confirmButton.onclick=async()=>{
    if(busy||!selectedCode)return;if(!confirm('確認已核對 '+r.nickname+'（'+r.playerId+'），並交付「'+r.prizeName+'」？'))return;
    busy=true;confirmButton.disabled=true;lookup.disabled=true;camera.disabled=true;input.disabled=true;m.status.textContent='正在核銷，請稍候…';
    try{const response=await m.api({action:'claimRedeem',code:selectedCode,operationId});if(!m.valid())return;show(response);m.status.textContent=response.alreadyClaimed?'此份獎品先前已完成核銷，沒有重複核銷。':'核銷完成。';}
    catch(e){if(m.valid()){m.status.textContent=error(e)+' 若連線中斷，可再次按確認查核原操作。';confirmButton.disabled=false;}}
    finally{busy=false;if(m.valid()){lookup.disabled=false;camera.disabled=false;input.disabled=false;}}
   };
  }
  async function find(raw){if(busy||!m.valid())return;stop();busy=true;lookup.disabled=true;camera.disabled=true;input.disabled=true;preview.replaceChildren();selectedCode='';m.status.textContent='查詢中…';try{const r=await m.api({action:'claimLookup',code:raw});if(!m.valid())return;selectedCode=raw;operationId=crypto.randomUUID();show(r);m.status.textContent='已取得最新領獎狀態。';}catch(e){if(m.valid())m.status.textContent=error(e);}finally{busy=false;if(m.valid()){lookup.disabled=false;camera.disabled=false;input.disabled=false;}}}
  lookup.onclick=()=>find(input.value);input.oninput=()=>{if(!busy){selectedCode='';preview.replaceChildren();}};
  camera.onclick=async()=>{
   if(cameraStarting||busy)return;stop();const epoch=scanEpoch;cameraStarting=true;camera.disabled=true;stopButton.hidden=false;preview.replaceChildren();selectedCode='';m.status.textContent='請允許使用相機。';
   try{
    if(!navigator.mediaDevices?.getUserMedia)throw Error('camera-unavailable');
    const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});if(!m.valid()||epoch!==scanEpoch){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;video.srcObject=stream;video.hidden=false;await video.play();if(!m.valid()||epoch!==scanEpoch)return;
    let detector=null;try{if(window.BarcodeDetector)detector=new window.BarcodeDetector({formats:['qr_code']});}catch{}
    if(!detector&&!(await ensureJsQr()))throw Error('decoder-unavailable');if(!m.valid()||epoch!==scanEpoch)return;
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});m.status.textContent='將領獎 QR 對準鏡頭。';
    const frame=async()=>{if(!m.valid()||epoch!==scanEpoch)return;let raw='';try{if(video.readyState>=2){if(detector)raw=(await detector.detect(video))[0]?.rawValue||'';else if(ctx){const scale=Math.min(1,640/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);ctx.drawImage(video,0,0,canvas.width,canvas.height);const data=ctx.getImageData(0,0,canvas.width,canvas.height);raw=window.jsQR(data.data,data.width,data.height,{inversionAttempts:'dontInvert'})?.data||'';}}}catch{if(detector){detector=null;await ensureJsQr();}}
     if(!m.valid()||epoch!==scanEpoch)return;if(/^BXHCLAIM:[A-F0-9]{24}$/i.test(raw)){input.value=raw;await find(raw);return;}if(raw)m.status.textContent='這不是領獎 QR，請出示「我的領獎碼」。';scanTimer=setTimeout(frame,180);
    };frame();
   }catch(e){if(m.valid()&&epoch===scanEpoch){stop();m.status.textContent='相機或掃碼功能無法使用，請改用 Safari／Chrome 開啟，或輸入領獎碼查詢。';}}
   finally{if(epoch===scanEpoch)cameraStarting=false;}
  };
 }
 async function history(detail){const m=modal('核銷紀錄');m.status.textContent='載入中…';try{const r=await m.api({action:'claimHistory',id:detail.event.id});if(!m.valid())return;for(const w of r.rows){const row=document.createElement('article');row.className='claim-history-row';const title=document.createElement('strong');title.textContent=w.nickname+'（'+w.playerId+'）｜'+w.prizeName;const info=document.createElement('p');info.textContent=({pending:'待領獎',claimed:'已領獎',forfeited:'已棄領'})[w.status]||w.status;row.append(title,info);if(w.status==='claimed'){const receipt=document.createElement('p');receipt.textContent=w.receipt?date(w.receipt.at)+'｜'+w.receipt.actorName+'（'+w.receipt.actorUid+'）｜'+(w.receipt.method==='code'?'領獎碼核銷':'手動核銷'):'此筆為舊紀錄，未保存核銷時間與人員。';row.append(receipt);}m.body.append(row);}m.status.textContent=r.rows.length?'核銷時間由後端記錄。':'尚無得獎紀錄。';}catch(e){if(m.valid())m.status.textContent=error(e);}}
 async function staff(detail){const m=modal('活動核銷人員');m.body.innerHTML='<p class="hint">主辦與最高管理員已有核銷權限。另授權的人員只能掃碼核銷，不能修改活動或抽獎結果。</p><label>工作人員 UID<input class="claim-staff-uid" autocomplete="off" maxlength="128"></label><button type="button" class="btn btn-primary claim-staff-add">確認人員並授權</button><div class="claim-staff-list"></div>';let busy=false;
  async function load(extra={}){if(busy)return;busy=true;m.status.textContent='處理中…';const add=m.body.querySelector('.claim-staff-add');add.disabled=true;try{const r=await m.api({action:'claimStaff',id:detail.event.id,...extra});if(!m.valid())return;const list=m.body.querySelector('.claim-staff-list');list.replaceChildren();for(const u of r.staff){const row=document.createElement('p'),label=document.createElement('span'),remove=document.createElement('button');label.textContent=u.name+'（'+u.uid+'）'+(u.active?'':'｜帳號不可操作');remove.type='button';remove.className='btn btn-ghost';remove.textContent='移除授權';remove.onclick=()=>{if(confirm('移除 '+u.name+' 的核銷權限？'))load({targetUid:u.uid,remove:true,operationId:crypto.randomUUID()});};row.append(label,remove);list.append(row);}m.status.textContent='已授權 '+r.staff.length+' 位人員。';}catch(e){if(m.valid())m.status.textContent=error(e);}finally{busy=false;if(m.valid())add.disabled=false;}}
  m.body.querySelector('.claim-staff-add').onclick=async()=>{if(busy)return;const uid=m.body.querySelector('input').value.trim();if(!uid)return;busy=true;try{const r=await m.api({action:'claimStaff',id:detail.event.id,lookupUid:uid});if(!m.valid())return;busy=false;if(confirm('授權 '+r.target.name+'（'+r.target.uid+'）核銷此活動？'))await load({targetUid:uid,remove:false,operationId:crypto.randomUUID()});}catch(e){if(m.valid())m.status.textContent=error(e);}finally{busy=false;}};await load();
 }
 window.bxhRaffleClaims={showCode,scanner,history,staff,close:()=>closeActive?.()};
})();
