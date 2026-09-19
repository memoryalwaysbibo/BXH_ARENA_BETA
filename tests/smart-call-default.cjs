'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('const SMART_CALL_PREF_KEY');
const end=html.indexOf('function smartCallNorm',start);
assert(start>0&&end>start,'smart call preference block not found');

const store=new Map();
const localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value))
};
const box={localStorage,firebaseUser:{uid:'u1'}};
vm.createContext(box);
vm.runInContext(html.slice(start,end),box);

assert.equal(box.smartCallEnabled('BXH-AAA111'),true,'new events must default ON');
box.setSmartCallEnabled('BXH-AAA111',false);
assert.equal(box.smartCallEnabled('BXH-AAA111'),false,'explicit OFF must persist');
box.setSmartCallEnabled('BXH-AAA111',true);
assert.equal(box.smartCallEnabled('BXH-AAA111'),true,'explicit ON must persist');

box.firebaseUser={uid:'u2'};
assert.equal(box.smartCallEnabled('BXH-AAA111'),true,'preferences must remain user-scoped and default ON');

console.log('PASS BXH CALL defaults ON and preserves explicit per-user opt-out');
