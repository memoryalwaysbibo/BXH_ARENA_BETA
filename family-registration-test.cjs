const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');for(const x of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){if(x[1].trim())new vm.Script(x[1]);}
const context=vm.createContext({userProfile:{realName:'家長'},smartCallNorm:s=>String(s||'').trim()});
vm.runInContext(fs.readFileSync(__dirname+'/family-ui.js','utf8'),context);
const extract=(name,next)=>html.slice(html.indexOf('function '+name+'('),html.indexOf('\nfunction '+next+'(',html.indexOf('function '+name+'(')));
vm.runInContext(extract('smartCallFindPlayerId','smartCallPlayerName'),context);vm.runInContext(extract('buildLadderSettlementPayload','playerDerivedId'),context);
const child={uid:'guardian',familyPlayerId:'C001',status:'confirmed',displayName:'孩子'},self={uid:'self',status:'confirmed',displayName:'本人'};
const players=context.mergeFamilyOnlineRoster([{id:'cancelled',source:'online',registrationUid:'cancelled'},{id:'onsite',name:'現場',source:'onsite'}],[child,self],true,()=> 'selfid');
assert.equal(players.length,3);assert.equal(players[1].id,'family_C001');assert.equal(players[1].registrationUid,'guardian');assert.equal(players[1].checkedIn,false);assert.equal(players[1].birthDate,undefined);
players[1].checkedIn=true;assert.equal(context.mergeFamilyOnlineRoster(players,[child,self],true,()=> 'new')[1].checkedIn,true);
assert.equal(context.smartCallFindPlayerId({players},child),'family_C001');assert.equal(context.smartCallFindPlayerId({players:[{id:'parent',name:'家長'},{id:'duplicate',name:'孩子'}]},child),null);
const st={cloudCode:'BXH-TEST',meta:{},players,matches:[{a:{playerId:'family_C001'},b:{playerId:'selfid'},completed:true,winnerId:'family_C001'}]};
const result=context.buildLadderSettlementPayload(st).participants.find(x=>x.localPlayerId==='family_C001');assert.equal(result.playerUid,'C001');assert.equal(result.source,'family');assert.equal(result.wins,1);assert.ok(!JSON.stringify(result).includes('guardian'));
assert.ok(html.includes('if(item.source==="family"||item.source==="test"'));
console.log('PASS inline syntax, roster sync/cancellation/checkin identity, exact child call lookup, separate settlement identity');
