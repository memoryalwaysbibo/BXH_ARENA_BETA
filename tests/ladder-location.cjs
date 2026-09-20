'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('index.html','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');

assert.match(html,/let ladderLocationCity="";\s*let ladderLocationRegion="";/,'ladder location filter state must exist');
assert.match(html,/function ladderLocationRows\(players\)/,'ladder location filtering helper must exist');
assert.match(html,/function ladderLocationFilterHtml\(\)/,'ladder location filter UI must exist');
assert.match(html,/id="ladder-city-filter"/,'ladder must expose city selector');
assert.match(html,/id="ladder-region-filter"/,'ladder must expose district selector');
assert.ok((html.match(/rankLadderRows\(ladderLocationRows\(ladderPublicData\.players\|\|\[\]\)\)/g)||[]).length>=2,'player/admin and guest ladders must re-rank filtered rows');
assert.match(html,/city:String\(profile\.city\|\|""\)\.trim\(\)\.replace\(\/\^臺\//,'official ladder settlement must copy city');
assert.match(html,/region:String\(profile\.region\|\|""\)\.trim\(\)/,'official ladder settlement must copy district');
assert.match(html,/fx\.updateDoc\(ladderRef,\{city:payload\.city\|\|"",region:payload\.region\|\|""\}\)/,'profile save must sync ladder location');
assert.match(
  rules,
  /request\.auth\.uid == uid[\s\S]*?affectedKeys\(\)\.hasOnly\(\['city','region'\]\)/,
  'players may update only their own ladder city and region through the self-service branch'
);

const helperStart=html.indexOf('function ladderCompare(');
const helperEnd=html.indexOf('function formatLadderDate',helperStart);
const locationStart=html.indexOf('let ladderLocationCity=""');
const locationEnd=html.indexOf('let ladderAdminLogs=[]',locationStart);
assert(helperStart>=0&&helperEnd>helperStart&&locationStart>=0&&locationEnd>locationStart,'ladder helper blocks missing');

const base=html.slice(helperStart,helperEnd);
const loc=html.slice(locationStart,locationEnd);
const box={
  normalizeTaiwanCityName:v=>String(v||'').trim(),
  profileCityOptionsHtml:()=>'',profileDistrictOptionsHtml:()=>'',esc:String
};
vm.createContext(box);
vm.runInContext(base+'\n'+loc+'\nthis.__rank=rankLadderRows;this.__filter=ladderLocationRows;',box);
const players=[
  {uid:'a',city:'台南市',region:'中西區',seasonPoints:10,careerPoints:10,championCount:0,runnerUpCount:0,thirdPlaceCount:0,fourthPlaceCount:0},
  {uid:'b',city:'高雄市',region:'左營區',seasonPoints:50,careerPoints:50,championCount:0,runnerUpCount:0,thirdPlaceCount:0,fourthPlaceCount:0},
  {uid:'c',city:'台南市',region:'東區',seasonPoints:30,careerPoints:30,championCount:0,runnerUpCount:0,thirdPlaceCount:0,fourthPlaceCount:0}
];
box.__setLocation('台南市','');
let rows=box.__rank(box.__filter(players));
assert.deepEqual(rows.map(x=>x.uid),['c','a'],'city board must include only selected city and re-sort');
assert.deepEqual(rows.map(x=>x.__rank),[1,2],'city board must recalculate local ranks');
box.__setLocation('台南市','中西區');
rows=box.__rank(box.__filter(players));
assert.deepEqual(rows.map(x=>x.uid),['a'],'district board must narrow to selected district');
assert.equal(rows[0].__rank,1,'district board leader must be NO.1 within the district');

console.log('PASS city/district ladder classification, local re-ranking and location-only self sync');
