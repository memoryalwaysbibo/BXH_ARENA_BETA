const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const s=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');let uid='admin';
const box={currentAuthUid:()=>uid,engagementSessionEpoch:1,document:{addEventListener(){}},isSuperAdmin:()=>true};vm.createContext(box);
vm.runInContext(s.slice(s.indexOf('let titleRecipientState='),s.indexOf('let accountBatch=')),box);
const users=[{uid:'A',realName:'同名',playerId:'P001'},{uid:'B',realName:'同名',playerId:'P002'},{uid:'C',realName:'同名',deleted:true}];
assert.equal(box.titleRecipientMatches(users,'同名').length,2);assert.equal(box.titleRecipientMatches(users,'p002')[0].uid,'B');assert.equal(box.titleRecipientMatches(users,'Ｐ００１')[0].uid,'A');assert.equal(box.titleRecipientMatches(users,'').length,0);
box.titleRecipientContext().selected=users[0];uid='other';assert.equal(box.titleRecipientContext().selected,null);
box.titleRecipientContext().selected=users[1];box.engagementSessionEpoch++;assert.equal(box.titleRecipientContext().selected,null);
console.log('PASS duplicate names, ID matching, deleted exclusion and session isolation');
