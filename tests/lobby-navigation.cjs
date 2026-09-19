'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');

function block(startNeedle,endNeedle){
  const s=html.indexOf(startNeedle);
  const e=html.indexOf(endNeedle,s);
  assert(s>=0&&e>s,'missing block: '+startNeedle);
  return html.slice(s,e);
}

const lobby=block('function lobbyRegistrationButtons','function publicEventLifecycleStatus');
assert.match(lobby,/phase==="live"[\s\S]*switch-to-player-watch[\s\S]*觀看比賽/,'live must open spectator view');
assert.match(lobby,/phase==="settling"[\s\S]*查看結算進度/,'settling must expose settlement progress');
assert.match(lobby,/phase==="done"[\s\S]*lobby-view-result[\s\S]*查看最終結果/,'done must open final result');
assert.match(lobby,/查看取消資訊/,'cancelled must remain inspectable');
assert.match(lobby,/查看與報名/,'open official events must review details before registration');
assert.match(lobby,/authority==="community"[\s\S]*查看賽事資訊/,'community waiting events must open info, not registration');

const detail=block('function renderTournamentDetailScreen','const SMART_CALL_PREF_KEY');
assert.match(detail,/isCommunity[\s\S]*不使用官方線上報名流程/,'community detail must not advertise official registration');
assert.match(detail,/lobbyPlayerRosterHtml\(detailLobbySummary\)/,'detail page must retain participant roster');
assert.match(detail,/返回我的賽程/,'detail page must preserve my-schedule return context');

const actions=block('if\(action==="view-public-tournament"\)','if\(action==="lobby-register"\)');
assert.match(actions,/tournamentDetailReturnContext=returnContext/,'detail route must save return context');
assert.match(actions,/action==="lobby-view-result"/,'final-result route must exist');
assert.match(actions,/celebrationData=buildCelebrationData\(state\)/,'final-result route must open final ranking when available');

const live=block('function renderLive\(\)','\/\* ==== tab: bracket ==== \*\/');
assert.match(live,/publicWatchReturnContext\?"":renderArchiveControls\(\)/,'spectators must not see admin settlement controls');
assert.match(live,/return publicWatchReturnContext[\s\S]*liveCourtsPanelHtml \+ liveInfoHtml/,'spectator live view must prioritize live courts');

console.log('PASS lobby card routes match their visible intent and preserve return paths');
