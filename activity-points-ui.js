"use strict";
(function installActivityPointsUI(){
 const state={snapshot:null,rows:[],mode:"records",loading:false,error:"",open:false};
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const labels={daily_checkin:"每日簽到",match_completed:"完成真實對戰",host_completed:"房主完賽",mood_message:"心情小棧留言",ladder_points:"天梯積分",ladder_migration:"既有天梯積分補發",inactivity_penalty:"未簽到扣分",redemption:"商品兌換"};
 function runtime(){try{return Function('return {profile:userProfile}')()}catch(e){return null}}
 let activityCallable=null;
 async function api(payload){
  if(!activityCallable){
   const [apps,functions]=await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js")
   ]);
   const app=apps.getApps()[0];
   if(!app)throw Object.assign(Error("firebase-app-not-ready"),{code:"app-not-ready"});
   activityCallable=functions.httpsCallable(functions.getFunctions(app,"asia-east1"),"activityPoints",{timeout:25000});
  }
  const response=await activityCallable(payload);
  return response?.data||{ok:false};
 }
 function playerId(){const p=runtime()?.profile||{};return p.playerId||p.gameId||"尚未設定玩家 ID"}
 function date(ms){try{return new Date(Number(ms)||Date.now()).toLocaleString("zh-TW",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(e){return "—"}}
 async function snapshot(){if(state.loading)return;state.loading=true;state.error="";paint();try{const r=await api({action:"snapshot"});if(!r?.ok)throw Error();state.snapshot=r;}catch(e){const code=String(e?.code||e?.message||"unknown").replace(/^functions\//,"");state.error="活躍積分載入失敗（"+code+"）";console.error("[activityPoints snapshot]",e)}finally{state.loading=false;paint();summary()}}
 async function board(mode){if(state.loading)return;state.mode=mode;state.loading=true;state.error="";paint();try{const r=await api({action:"leaderboard",mode});state.rows=r?.rows||[]}catch(e){const code=String(e?.code||e?.message||"unknown").replace(/^functions\//,"");state.error="活躍榜載入失敗（"+code+"）";console.error("[activityPoints leaderboard]",e)}finally{state.loading=false;paint()}}
 function task(name,key,max,note){const n=Math.max(0,Number(state.snapshot?.today?.bySource?.[key]||0));return `<div class="ap-task"><div><b>${name}</b><small>${n}／${max} 分</small></div><div class="ap-bar"><i style="width:${Math.min(100,n/max*100)}%"></i></div><span>${note}</span></div>`}
 function paint(){
  let root=document.getElementById("activity-points-overlay");if(!state.open){root?.remove();return}if(!root){root=document.createElement("div");root.id="activity-points-overlay";document.body.appendChild(root)}
  const w=state.snapshot?.wallet||{},records=state.snapshot?.records||[];
  const history=records.map(x=>`<tr><td>${date(x.occurredAt)}</td><td>${esc(x.label||labels[x.source]||x.source)}</td><td class="${Number(x.delta)>=0?'ap-plus':'ap-minus'}">${Number(x.delta)>0?'+':''}${Number(x.delta||0)}</td><td>${Number(x.balanceAfter||0)}</td></tr>`).join("");
  const ranking=state.rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${esc(r.name||"玩家")}</b><small>${esc(r.playerId||"")}</small></td><td>${Number(r.points||0)}</td></tr>`).join("");
  const table=state.mode==="records"?`<table class="ap-table"><thead><tr><th>日期</th><th>來源／原因</th><th>異動</th><th>餘額</th></tr></thead><tbody>${history||'<tr><td colspan="4">目前沒有積分紀錄</td></tr>'}</tbody></table>`:`<table class="ap-table"><thead><tr><th>名次</th><th>玩家</th><th>積分</th></tr></thead><tbody>${ranking||'<tr><td colspan="3">目前沒有排行資料</td></tr>'}</tbody></table>`;
  root.innerHTML=`<section class="ap-shell"><div class="ap-head"><div><div class="hint">玩家 ID｜${esc(playerId())}</div><h2>我的活躍積分</h2></div><button class="btn btn-ghost" data-activity="close">關閉</button></div><div class="ap-balance">${Number(w.balance||0)} <small>分</small></div><p class="hint">累積獲得 ${Number(w.lifetimeEarned||0)}｜累積扣除 ${Number(w.lifetimeDeducted||0)}</p>${w.testAccount?'<p class="hint">封測帳號可完整體驗活躍積分；移轉正式環境時將清除封測積分資料，只保留「開拓者」稱號。</p>':""}${state.error?`<p class="auth-error">${esc(state.error)}</p>`:""}<h3>我的任務</h3>${task("每日簽到","daily_checkin",15,"每日一次 +15")}${task("完成真實對戰","match_completed",30,"每場 +3")}${task("我是房主","host_completed",30,"每場完賽 +10")}${task("心情小棧留言","mood_message",15,"每則 +5")}<div class="ap-tabs"><button class="btn ${state.mode==='records'?'btn-primary':'btn-ghost'}" data-activity="records">我的積分紀錄</button><button class="btn ${state.mode==='daily'?'btn-primary':'btn-ghost'}" data-activity="daily">每日活躍榜</button><button class="btn ${state.mode==='cumulative'?'btn-primary':'btn-ghost'}" data-activity="cumulative">累積活躍榜</button><button class="btn btn-ghost" data-activity="refresh">重新整理</button></div>${state.loading?'<p>讀取中…</p>':table}</section>`;
 }
 function signedIn(){try{return !!Function('return firebaseUser&&firebaseUser.uid&&userProfile&&appPhase==="player-center"')()}catch(e){return false}}
 function summary(){
  if(!signedIn())return;
  const controls=document.querySelector(".player-shell header.topbar");if(!controls)return;
  let box=document.getElementById("activity-points-summary");
  if(!box){
   box=document.createElement("button");
   box.type="button";
   box.id="activity-points-summary";
   box.dataset.activity="open";
   box.setAttribute("aria-label","查看我的活躍積分");
   controls.appendChild(box);
  }else if(box.parentElement!==controls){controls.appendChild(box)}
  const key=playerId()+"|"+(state.snapshot?Number(state.snapshot.wallet?.balance||0):"—");
  if(box.dataset.renderKey===key)return;
  box.dataset.renderKey=key;
  box.innerHTML=`<span>活躍積分</span><strong>${state.snapshot?Number(state.snapshot.wallet?.balance||0):"—"} 分</strong>`;
 }
 document.addEventListener("click",e=>{const t=e.target.closest?.("[data-activity]");if(!t)return;const a=t.dataset.activity;if(a==="open"){state.open=true;state.mode="records";state.rows=[];paint();snapshot()}else if(a==="close"){state.open=false;paint()}else if(a==="refresh"){state.rows=[];snapshot()}else if(a==="records"){state.mode="records";state.rows=[];paint()}else if(a==="daily"||a==="cumulative")board(a)});
 const style=document.createElement("style");style.textContent=`.player-shell header.topbar{position:relative}.player-shell header.topbar #activity-points-summary{position:absolute;z-index:5;right:14px;top:14px;width:164px;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:42px;padding:7px 13px;border:1px solid #879500;border-radius:999px;background:#171a12;color:#d7d9d0;font:inherit;cursor:pointer;box-sizing:border-box}.player-shell header.topbar #activity-points-summary span{font-size:12px;white-space:nowrap}.player-shell header.topbar #activity-points-summary strong,.ap-balance{color:#eaff16;font-weight:900}.player-shell header.topbar #activity-points-summary strong{font-size:18px;white-space:nowrap}@media(max-width:640px){.player-shell header.topbar #activity-points-summary{right:12px;top:12px;width:154px;min-height:40px;padding:6px 11px}}@media(max-width:360px){.player-shell header.topbar #activity-points-summary{width:142px;right:10px}.player-shell header.topbar #activity-points-summary span{font-size:11px}.player-shell header.topbar #activity-points-summary strong{font-size:17px}}#activity-points-overlay{position:fixed;inset:0;z-index:2600;background:#000d;padding:14px;overflow:auto;color:#f4f4f4}#activity-points-overlay .ap-shell{max-width:760px;margin:auto;background:#15171a;border:1px solid #5c6678;border-radius:20px;padding:18px}.ap-head,.ap-task>div:first-child{display:flex;justify-content:space-between;gap:12px;align-items:center}.ap-balance{font-size:42px}.ap-task{background:#202329;border-radius:14px;padding:12px;margin:10px 0}.ap-task small,.ap-task span{color:#9ca3af}.ap-bar{height:8px;background:#343942;border-radius:9px;margin:8px 0}.ap-bar i{display:block;height:100%;background:#eaff16;border-radius:9px}.ap-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.ap-table{width:100%;border-collapse:collapse}.ap-table th,.ap-table td{padding:10px 6px;border-bottom:1px solid #30343b;text-align:left}.ap-table td small{display:block;color:#999}.ap-plus{color:#78df9b}.ap-minus{color:#ff7474}`;document.head.appendChild(style);
 // Do not observe the whole application DOM: that can compete with the login renderer.
 // A low-frequency, post-authentication check is sufficient because the player shell is persistent.
 setInterval(()=>{
  if(!signedIn())return;
  if(!document.querySelector(".player-main"))return;
  summary();
  if(!state.snapshot&&!state.loading)snapshot();
 },5000);
})();
