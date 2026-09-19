const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.slice(html.indexOf('let playerCardsUI='),html.indexOf('function bindPlayerCardInputs'));
let response,authUid='tester',lastPayload=null;const box={currentAuthUid:()=>authUid,esc:String,document:{getElementById:()=>null},render:()=>{},showToast:()=>{},managedFeatureError:e=>e.message,window:{engagementService:{playerCard:async data=>{lastPayload=data;if(response instanceof Error)throw response;return response;}}}};
vm.createContext(box);vm.runInContext(source,box);
(async()=>{
response={ok:true,settings:{cardPublic:true}};await box.handlePlayerCard('card-settings');
assert.equal(box.cardContext().editing,true);box.cardContext().settings.cardPublic=false;
await box.handlePlayerCard('card-cancel');assert.equal(box.cardContext().settings.cardPublic,true);assert.equal(box.cardContext().editing,false);
await box.handlePlayerCard('card-settings');box.cardContext().opened=true;await box.handlePlayerCard('card-save');assert.equal(box.cardContext().opened,false);assert.equal(box.cardContext().editing,false);
await box.handlePlayerCard('card-settings');response=new Error('offline');await box.handlePlayerCard('card-save');assert.equal(box.cardContext().editing,true);assert.equal(box.cardContext().error,'offline');
response={ok:true,card:{name:'Tester'}};await box.handlePlayerCard('card-preview');assert.equal(box.cardContext().card.name,'Tester');
authUid=null;response={ok:true,card:{name:'Public Player'}};lastPayload=null;
await box.handlePlayerCard('card-event-open',{getAttribute:name=>name==='data-code'?'BXH-TEST1':name==='data-player-id'?'P1':null});
assert.equal(lastPayload.action,'event-card');assert.equal(lastPayload.code,'BXH-TEST1');assert.equal(lastPayload.playerId,'P1');assert.equal(box.cardContext().card.name,'Public Player');
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(!/\bsrc=|application\/ld\+json/.test(m[1]))new vm.Script(m[2]);}
console.log('PASS card auth flows, guest event cards, and script syntax');
})().catch(e=>{console.error(e);process.exitCode=1;});
