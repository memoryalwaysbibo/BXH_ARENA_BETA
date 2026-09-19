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

console.log('PASS lobby cards are newest-first in every section and undated cards stay last');
