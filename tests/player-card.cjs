const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.slice(html.indexOf('let playerCardsUI='),html.indexOf('function bindPlayerCardInputs'));
let response;const box={currentAuthUid:()=> 'tester',esc:String,document:{getElementById:()=>null},render:()=>{},showToast:()=>{},managedFeatureError:e=>e.message,window:{engagementService:{playerCard:async()=>{if(response instanceof Error)throw response;return response;}}}};
vm.createContext(box);vm.runInContext(source,box);
(async()=>{
response={ok:true,settings:{cardPublic:true}};await box.handlePlayerCard('card-settings');
assert.equal(box.cardContext().editing,true);box.cardContext().settings.cardPublic=false;
await box.handlePlayerCard('card-cancel');assert.equal(box.cardContext().settings.cardPublic,true);assert.equal(box.cardContext().editing,false);
await box.handlePlayerCard('card-settings');box.cardContext().opened=true;await box.handlePlayerCard('card-save');assert.equal(box.cardContext().opened,false);assert.equal(box.cardContext().editing,false);
await box.handlePlayerCard('card-settings');response=new Error('offline');await box.handlePlayerCard('card-save');assert.equal(box.cardContext().editing,true);assert.equal(box.cardContext().error,'offline');
response={ok:true,card:{name:'Tester'}};await box.handlePlayerCard('card-preview');assert.equal(box.cardContext().card.name,'Tester');
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(!/\bsrc=|application\/ld\+json/.test(m[1]))new vm.Script(m[2]);}
console.log('PASS card save/cancel/failure/preview flows and script syntax');
})().catch(e=>{console.error(e);process.exitCode=1;});
