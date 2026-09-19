'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');

assert.match(html,/data-action="mailbox-close">← 返回上一頁<\/button>/,'mailbox must return to previous player view');
assert.match(html,/data-action="event-entry-close">關閉活動入口<\/button>/,'event entry modal must close, not claim to return home');
assert.match(html,/data-action="close-qr-scanner">改用手動輸入<\/button>/,'QR scanner must describe its actual fallback destination');
assert.doesNotMatch(html,/data-action="close-qr-scanner">改用手動輸入／返回<\/button>/,'QR scanner must not mix two navigation meanings');
assert.doesNotMatch(html,/data-action="event-entry-close">返回首頁<\/button>/,'modal close must not be labelled as home navigation');
assert.doesNotMatch(html,/data-action="mailbox-close">返回賽事大廳<\/button>/,'mailbox close must not falsely promise lobby');

const currentTournamentReturns=[...html.matchAll(/data-action="account-goto-home">([^<]+)<\/button>/g)].map(m=>m[1].trim());
assert(currentTournamentReturns.includes('取消'),'change-password cancel may return to current tournament');
assert(currentTournamentReturns.filter(x=>x==='返回賽事總覽').length>=4,'admin management surfaces must call current tournament destination 賽事總覽');
assert(!currentTournamentReturns.includes('返回系統首頁'),'account-goto-home does not navigate to landing');

assert.match(html,/data-action="account-back-to-role">返回系統首頁<\/button>/,'authenticated mode exit must identify landing as system home');
assert.match(html,/guest-lobby-topbar[\s\S]{0,400}data-action="account-back-to-role">← 返回系統首頁<\/button>/,'guest lobby outer exit must use system-home wording');
assert.match(html,/data-action="card-close"[^>]*>關閉<\/button>/,'player card overlay must use close semantics');
assert.doesNotMatch(html,/data-action="card-close"[^>]*>關閉並返回<\/button>/,'player card overlay must not claim an extra navigation step');

console.log('PASS global navigation labels match their actual destination semantics');
