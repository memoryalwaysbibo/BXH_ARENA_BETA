'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');

assert.match(
  html,
  /const PLAYER_TABS = \[\["home","賽事大廳"\],\["registered","我的賽程"\],\["host","我的房間"\],\["raffles","會員抽獎"\],\["items","我的道具"\],\["stats","我的戰績"\],\["ladder","天梯排行"\],\["profile","會員資料"\]\];/,
  'player top navigation must keep all eight entries'
);
assert.match(
  html,
  /@media \(min-width:560px\) and \(max-width:900px\)\{[\s\S]*?grid-template-columns:repeat\(8,minmax\(0,1fr\)\)/,
  'narrow desktop/tablet player navigation must fit all eight tabs in one row'
);
assert.match(
  html,
  /\.stickytop \.player-tabs:not\(\.player-tabs-bottom\) \.player-tab-btn\{[\s\S]*?min-width:0!important;/,
  'narrow desktop/tablet tabs must be allowed to shrink below the old 84px minimum'
);
assert.match(
  html,
  /@media \(max-width:559px\)\{[\s\S]*?overflow-x:auto!important;/,
  'small phones must retain horizontal navigation scrolling'
);

console.log('PASS player top navigation stays reachable at narrow desktop/tablet widths');
