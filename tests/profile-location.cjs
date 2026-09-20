'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('index.html','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');

const start=html.indexOf('const TAIWAN_CITY_DISTRICTS=');
const end=html.indexOf('function profileCompletionPercent',start);
assert(start>=0&&end>start,'Taiwan city/district helper block missing');
const block=html.slice(start,end);
const listeners={};
const box={
  document:{addEventListener:(name,fn)=>{listeners[name]=fn;},getElementById:()=>null},
  esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')
};
vm.createContext(box);
vm.runInContext(block,box);

assert.equal(Object.keys(box.TAIWAN_CITY_DISTRICTS).length,22,'must provide all 22 Taiwan cities/counties');
assert(box.TAIWAN_CITY_DISTRICTS['台南市'].includes('中西區'),'Tainan must include West Central District');
assert.equal(box.normalizeTaiwanCityName('台南'),'台南市','legacy 台南 must normalize to 台南市');
assert.equal(box.normalizeTaiwanCityName('臺南市'),'台南市','臺/台 spelling must normalize');
assert.deepEqual(JSON.parse(JSON.stringify(box.profileLocationParts({region:'台南'}))),{city:'台南市',region:''});
assert.deepEqual(JSON.parse(JSON.stringify(box.profileLocationParts({city:'台南市',region:'中西區'}))),{city:'台南市',region:'中西區'});

assert.match(html,/id="profile-city"/,'profile editor must expose city dropdown');
assert.match(html,/id="profile-region"/,'profile editor must expose district dropdown');
assert.match(html,/所在都市/,'profile card must display city');
assert.match(html,/所在地區/,'profile card must display district');
assert.match(html,/realName,gameId,phone,birthDate,gender,city,region,preferredNameMode/,'profile save must send city and region');
assert.match(html,/city:String\(data\.city\|\|""\)\.trim\(\)\.replace\(\/\^臺\//,'Firebase module must persist city without cross-script helper dependency');
assert.match(rules,/\['displayName','realName','nickname','gameId','phone','birthDate','gender','city','region','preferredNameMode'/,'self-update rules must allow city');

console.log('PASS linked Taiwan city/district profile selectors and persistence');
