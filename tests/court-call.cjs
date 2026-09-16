const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),script=fs.readFileSync(path.join(__dirname,'../court-call-ui.js'),'utf8');
const s={matches:['A','B','C','D'].map((id,i)=>({id,seq:i+1,station:1,round:0,bracket:'WB',a:{playerId:'p'+i},b:{playerId:'q'+i},status:'pending',completed:false})),meta:{stations:1},courtAssignments:{court1:{currentMatchId:'B'}}};
const a=s.matches[0];Object.assign(a,{skippedAt:100,skipWaitFor:['B','C'],callPass:{waitFor:['B','C']}});
const box={Map,setTimeout:()=>1,sessionStorage:{getItem:()=>null},currentAuthUid:()=> 'u',engagementSessionEpoch:1,state:s,refereeMatches:()=>s.matches,getMatch:id=>s.matches.find(x=>x.id===id),esc:String};vm.createContext(box);vm.runInContext(script,box);
vm.runInContext(html.slice(html.indexOf('function stationExecutionQueue('),html.indexOf('// Regenerates state.courtAssignments')),box);
const ids=q=>Array.from(q,x=>x.id);assert.deepEqual(ids(box.stationExecutionQueue(1)),['B','C','A','D']);assert.deepEqual(ids(box.courtCallPublicQueue(s,1)),['B','C','A','D']);
s.matches[1].completed=true;assert.deepEqual(ids(box.stationExecutionQueue(1)),['C','A','D']);s.matches[2].status='paused';assert.deepEqual(ids(box.stationExecutionQueue(1)),['D'],'PASS cannot return while dependency is paused');s.matches[2].completed=true;assert.deepEqual(ids(box.stationExecutionQueue(1)),['A','D']);assert(box.callPassProtected(s,a));
const before=box.courtCallContext('BXH-TEST');box.engagementSessionEpoch=2;assert.notEqual(box.courtCallContext('BXH-TEST'),before,'session changes clear stale responses');
const out=box.courtCallRow({code:'BXH-TEST',busy:false,pending:null},{matchId:'A',station:1,round:0,sequence:2,players:[{name:'<玩家>',response:'coming'}],pass:{status:'approved',requester:true},waitingFor:[],canPass:false},false);assert(out.includes('我已準備好'));assert(!out.includes('data-action="court-call-pass"'));
assert(html.includes('callPassProtected(remote,m)'));assert(html.includes('call-state-stale'));
console.log('PASS B-C-A-D, one/two completion ordering, paused dependency protection, public ETA order, identity isolation, used PASS UI and stale-write guard');

box.appPhase="community-room";box.communityRoomActiveTab="referee";box.activeTab="live";box.state.cloudCode="BXH-TEST";box.canOperateCurrentTournament=()=>true;assert.deepEqual(Array.from(box.courtCallVisibleCodes()),["BXH-TEST"]);box.communityRoomActiveTab="live";assert.equal(box.courtCallVisibleCodes().length,0);console.log("PASS community referee uses its own navigation tab for live replies");
