const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const join=html.slice(html.indexOf('async function commitJoinedTournamentData('),html.indexOf('async function resolveAndJoinTournamentByCode('));
const drafts=html.slice(html.indexOf('function ensureSettingsFormDraft(){'),html.indexOf('function syncSettingsDraftFromDom(){'));
const context={state:{id:'previous'},settingsFormDraft:{name:'stale',ladderMode:'general'},registrationFormDraft:{registrationEnabled:true},settingsFormDraftDirty:true,registrationFormDraftDirty:true,
 applyRemoteState:()=>{},defaultState:id=>({id}),refereeAssignmentDraftEnabled:null,setCurrentId:async()=>{},saveRecord:async()=>{},loadIndex:async()=>[],cloudUnsub:null,window:{cloudSync:{subscribe:()=>null,subscribePublic:()=>null}},isTester:()=>true};
vm.createContext(context);
vm.runInContext('function resetRegistrationFormDraft(){registrationFormDraft=null;registrationFormDraftDirty=false;}\n'+join+drafts,context);
(async()=>{
 await context.commitJoinedTournamentData('TEST-CODE',{id:'next',testLadderEnabled:true,meta:{name:'correct',ladderMode:'general'}},false);
 assert.equal(context.settingsFormDraft,null);assert.equal(context.registrationFormDraft,null);
 context.ensureSettingsFormDraft();assert.equal(context.settingsFormDraft.name,'correct');assert.equal(context.settingsFormDraft.ladderMode,'ranked');
 console.log('PASS cloud join discards prior settings and registration drafts; TEST ranked choice is restored');
})().catch(e=>{console.error(e);process.exitCode=1;});
