/* v13.34.0 — presentation only: never calls the draw API. */
(function(){
 'use strict';
 let activeClose=null;
 const icons=[
  '<path d="M8 19l8 8 8-16 8 16 8-8-4 23H12zM12 47h24"/>',
  '<path d="M24 6v8M10 27l14-13 14 13-14 15zM6 27h36M24 42v7"/>',
  '<path d="M29 7l-15 9 5 5-9 7 7 11 17-2 5-13-9 4-6-5 10-3zM29 7l7 2-3 9M17 39l-4 8M21 18h2"/>',
  '<path d="M24 6l5 15 15 5-15 5-5 15-5-15-15-5 15-5z"/>'
 ].map(x=>'<svg viewBox="0 0 48 54" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">'+x+'</svg>');
 function open(detail){
  if(!detail?.drawnAt)return;
  activeClose?.();
  // Snapshot public fields only. Subsequent refreshes cannot alter this replay.
  const winners=(detail.winners||[]).map(w=>({nickname:String(w.nickname||'得獎者'),playerId:String(w.playerId||''),prizeName:String(w.prizeName||'獎品'),imageUrl:String((detail.event?.prizes||[]).find(p=>p.id===w.prizeId)?.imageUrl||'')}));
  const previousFocus=document.activeElement,previousOverflow=document.body.style.overflow;
  const overlay=document.createElement('div');overlay.className='bxh-replay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','抽獎紀錄回放');
  overlay.innerHTML=`<div class="bxh-replay-shell">
   <header class="bxh-replay-toolbar"><span class="bxh-replay-tag">紀錄回放</span><div><button type="button" class="bxh-fullscreen">全螢幕</button><button type="button" class="bxh-close" aria-label="關閉回放">關閉 ✕</button></div></header>
   <h1 class="bxh-event-title"></h1><p class="bxh-replay-caption">SPIN BEYOND LEGENDS</p>
   <section class="bxh-machine" aria-label="BXH 黑金拉霸機">
    <div class="bxh-dragon-art" role="img" aria-label="BXH 金色雙龍"></div>
    <div class="bxh-machine-body"><div class="bxh-prize-label"></div><div class="bxh-reels" aria-hidden="true">${[0,1,2].map(()=>'<div class="bxh-reel"><div class="bxh-reel-track">'+Array.from({length:12},(_,i)=>'<div class="bxh-symbol">'+icons[i%4]+'</div>').join('')+'</div></div>').join('')}</div>
    <div class="bxh-machine-footer"><span class="bxh-progress"></span><button type="button" class="bxh-spin">開始揭曉</button><span class="bxh-brand">BXH<br>ARENA</span></div></div>
   </section>
   <div class="bxh-replay-options"><label><input type="checkbox" class="bxh-auto"> 自動播放下一位</label><span class="bxh-status" role="status" aria-live="polite"></span></div>
   <p class="bxh-replay-note">動畫重現已保存結果，每份獎品一位得獎者。</p>
   <section class="bxh-winner" hidden aria-label="得獎者揭曉"><div class="bxh-confetti" aria-hidden="true">${Array.from({length:18},(_,i)=>'<i style="--i:'+i+'"></i>').join('')}</div><div class="bxh-winner-card"><p class="bxh-winner-eyebrow">✦ CONGRATULATIONS ✦</p><p class="bxh-winner-count"></p><h2 class="bxh-winner-name"></h2><p class="bxh-winner-id"></p><img class="bxh-prize-image" hidden alt="獎品圖片"><div class="bxh-winner-prize"></div><p>恭喜獲獎</p><button type="button" class="bxh-next">下一位</button><button type="button" class="bxh-hold">暫停自動播放</button><button type="button" class="bxh-winner-close">關閉回放</button><small>紀錄回放 · 沿用原開獎結果</small></div></section>
  </div>`;
  const $=s=>overlay.querySelector(s),reels=[...overlay.querySelectorAll('.bxh-reel')],timers=new Set();
  let closed=false,index=0,phase='idle',autoTimer=null;
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(!closed)fn();},ms);timers.add(id);return id;};
  const cancelAuto=()=>{if(autoTimer!==null){clearTimeout(autoTimer);timers.delete(autoTimer);autoTimer=null;}};
  function close(){if(closed)return;closed=true;timers.forEach(clearTimeout);timers.clear();document.removeEventListener('keydown',onKey);document.removeEventListener('fullscreenchange',onFullscreen);if(document.fullscreenElement===overlay)Promise.resolve(document.exitFullscreen?.()).catch(()=>{});overlay.remove();document.body.style.overflow=previousOverflow;if(previousFocus?.isConnected)previousFocus.focus();if(activeClose===close)activeClose=null;}
  function onKey(e){if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key==='Tab'){const focusRoot=phase==='revealed'?$('.bxh-winner'):overlay;const buttons=[...focusRoot.querySelectorAll('button,input')].filter(x=>!x.disabled&&!x.closest('[hidden]'));const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}
  function onFullscreen(){$('.bxh-fullscreen').textContent=document.fullscreenElement===overlay?'離開全螢幕':'全螢幕';}
  async function fullscreen(){try{if(document.fullscreenElement===overlay)await document.exitFullscreen();else if(overlay.requestFullscreen)await overlay.requestFullscreen();else $('.bxh-status').textContent='已使用頁面滿版顯示';}catch{$('.bxh-status').textContent='已使用頁面滿版顯示';}}
  function scheduleNext(){cancelAuto();$('.bxh-hold').hidden=index>=winners.length-1;$('.bxh-hold').textContent=$('.bxh-auto').checked?'暫停自動播放':'自動播放下一位';if($('.bxh-auto').checked&&phase==='revealed'&&index<winners.length-1)autoTimer=later(next,5500);}
  function reveal(){phase='revealed';const w=winners[index];$('.bxh-winner-name').textContent=w.nickname;$('.bxh-winner-id').textContent=w.playerId?'玩家編號 '+w.playerId:'';$('.bxh-winner-prize').textContent=w.prizeName+' × 1';const img=$('.bxh-prize-image');img.hidden=true;img.removeAttribute('src');try{const u=new URL(w.imageUrl);if(u.protocol==='https:'){img.onload=()=>{if(!closed&&phase==='revealed')img.hidden=false;};img.onerror=()=>{img.hidden=true;};img.src=u.href;}}catch{}$('.bxh-winner-count').textContent='第 '+(index+1)+' 位 / 共 '+winners.length+' 位';$('.bxh-next').textContent=index===winners.length-1?'完成回放':'揭曉下一位';$('.bxh-winner').hidden=false;$('.bxh-status').textContent='已揭曉 '+(index+1)+' / '+winners.length;$('.bxh-next').focus();scheduleNext();}
  function spin(){if(closed||phase==='spinning'||!winners.length)return;phase='spinning';$('.bxh-winner').hidden=true;$('.bxh-spin').disabled=true;$('.bxh-spin').textContent='揭曉中';$('.bxh-prize-label').textContent=winners[index].prizeName;$('.bxh-progress').textContent=String(index+1).padStart(2,'0')+' / '+String(winners.length).padStart(2,'0');$('.bxh-status').textContent='拉霸轉動中…';const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   reels.forEach((reel,i)=>{reel.classList.remove('is-stopped','is-slow');reel.classList.add('is-spinning');later(()=>{reel.classList.add('is-slow');},reduced?0:1450+i*650);later(()=>{reel.classList.remove('is-spinning','is-slow');reel.classList.add('is-stopped');},reduced?80+i*80:2200+i*700);});later(reveal,reduced?400:4100);
  }
  function next(){if(phase!=='revealed')return;cancelAuto();if(index>=winners.length-1){close();return;}index++;spin();}
  $('.bxh-event-title').textContent=String(detail.event?.title||'BXH 會員抽獎');$('.bxh-close').onclick=close;$('.bxh-winner-close').onclick=close;$('.bxh-fullscreen').onclick=fullscreen;$('.bxh-spin').onclick=spin;$('.bxh-next').onclick=next;$('.bxh-auto').onchange=scheduleNext;$('.bxh-hold').onclick=()=>{$('.bxh-auto').checked=!$('.bxh-auto').checked;scheduleNext();$('.bxh-next').focus();};
  document.body.appendChild(overlay);document.body.style.overflow='hidden';document.addEventListener('keydown',onKey);document.addEventListener('fullscreenchange',onFullscreen);activeClose=close;
  if(!winners.length){$('.bxh-prize-label').textContent='本次沒有合格得獎者';$('.bxh-spin').disabled=true;$('.bxh-auto').disabled=true;$('.bxh-progress').textContent='0 / 0';$('.bxh-close').focus();}else{$('.bxh-prize-label').textContent=winners[0].prizeName;$('.bxh-progress').textContent='01 / '+String(winners.length).padStart(2,'0');$('.bxh-spin').focus();spin();}
 }
 window.bxhRaffleReplay={open,close:()=>activeClose?.()};
})();
