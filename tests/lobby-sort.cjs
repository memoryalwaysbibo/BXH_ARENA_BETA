'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('function lobbyNewestFirst');
const end=html.indexOf('function lobbyLists',start);
assert(start>0&&end>start,'lobby newest-first comparator not found');

const box={};
vm.createContext(box);
vm.runInContext(html.slice(start,end),box);

const rows=[
  {code:'OLD',startMs:1000},
  {code:'NEW',startMs:3000},
  {code:'MID',startMs:2000},
  {code:'UNKNOWN',startMs:Infinity}
].sort(box.lobbyNewestFirst);

assert.deepEqual(rows.map(x=>x.code),['NEW','MID','OLD','UNKNOWN'],'lobby cards must sort newest first and keep unknown dates last');

const listStart=html.indexOf('function lobbyLists');
const listEnd=html.indexOf('function lobbyRegistrationButtons',listStart);
const listBlock=html.slice(listStart,listEnd);
for(const section of ['live','settling','registration','waiting','ended']){
  assert.match(listBlock,new RegExp('const '+section+'=.*\\.sort\\(lobbyNewestFirst\\)'),'section '+section+' must use newest-first ordering');
}


const canonicalStart=html.indexOf('function canonicalPublicTournamentPhase');
const canonicalEnd=html.indexOf('function publicTournamentRegistrationLocked',canonicalStart);
const canonicalBlock=html.slice(canonicalStart,canonicalEnd);
assert(canonicalBlock.indexOf('eventCancelled')>=0,'canonical phase must inspect cancellation');
assert(canonicalBlock.indexOf('eventCancelled')<canonicalBlock.indexOf('archiveStatus==="completed"'),'cancellation must win over completed/archive state');

const actionStart=html.indexOf('function lobbyRegistrationButtons');
const actionEnd=html.indexOf('function publicEventLifecycleStatus',actionStart);
const actionBlock=html.slice(actionStart,actionEnd);
assert.match(actionBlock,/phase==="live"[\s\S]*switch-to-player-watch[\s\S]*觀看比賽/,'live cards must open spectator view');
assert.match(actionBlock,/phase==="settling"[\s\S]*查看結算進度/,'settling cards must open settlement progress');
assert.match(actionBlock,/phase==="done"[\s\S]*lobby-view-result[\s\S]*查看最終結果/,'completed cards must open final result');
assert.match(actionBlock,/phase==="cancelled"[\s\S]*查看取消資訊/,'cancelled cards must open cancellation info');

assert.match(html,/function publicWatchReturnLabel\(context=publicWatchReturnContext\)/,'public watch return labels must be centralized');
assert.match(html,/spectatorSettling[\s\S]*暫定選手排名/,'settling view must label ranking as provisional');
assert.match(html,/spectatorSettling[\s\S]*已完成戰鬥台/,'settling view must stop calling courts live');

console.log('PASS lobby ordering, lifecycle routing, settlement hierarchy, and return semantics');
