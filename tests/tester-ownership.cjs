// Run against a disposable Firestore Emulator only. Never targets a live project.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const deps = process.env.BXH_TEST_DEPENDENCIES;
const depRequire = deps ? createRequire(path.resolve(deps, 'package.json')) : require;
const {initializeTestEnvironment, assertSucceeds, assertFails} = depRequire('@firebase/rules-unit-testing');
const {doc,setDoc,updateDoc,deleteDoc,getDoc,Timestamp,writeBatch} = depRequire('firebase/firestore');
const projectId = 'demo-bxh-ownership';
let count=0;
(async()=>{
  if(!process.env.FIRESTORE_EMULATOR_HOST) throw Error('FIRESTORE_EMULATOR_HOST is required');
  const [host, port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');
  const env=await initializeTestEnvironment({projectId,firestore:{host,port:Number(port),rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});
  try {
    const expiry=Timestamp.fromMillis(Date.now()+86400000);
    const room=(owner='tester-a', extra={})=>({testMode:true,testLabel:'（測試）',eventAuthority:'test',createdBy:owner,ownerUid:owner,createdByRole:'tester',ladderMode:'general',ladderPointsAwarded:false,expiresAt:expiry,testExpiresAt:expiry,testCreatedAt:1,assignedStaffUids:[owner],data:'{}',confirmedCount:0,waitlistCount:0,...extra});
    const mirror=(owner='tester-a')=>({testMode:true,testLabel:'（測試）',eventAuthority:'test',ownerUid:owner,createdByRole:'tester',ladderMode:'general',testCreatedAt:1,testExpiresAt:expiry,expiresAt:expiry,bracketView:'{}',visibility:'public',updatedAt:1,confirmedCount:0,waitlistCount:0});
    await env.withSecurityRulesDisabled(async c=>{
      const db=c.firestore();
      for(const [uid,role,extra] of [['tester-a','tester',{}],['tester-b','tester',{}],['flagged','admin',{isTestAccount:true}],['admin','admin',{}],['staff','staff',{}]]) await setDoc(doc(db,'users',uid),{role,active:true,...extra});
      for(const [code,data] of [['OWN',room()],['OTHER',room('tester-b')],['FLAG',room('flagged')],['OFFICIAL',room('admin',{testMode:false,eventAuthority:'official',createdByRole:'admin',assignedStaffUids:['staff']})]]) {
        await setDoc(doc(db,'tournaments',code),data);
        await setDoc(doc(db,'publicTournaments',code),mirror(data.ownerUid));
        await setDoc(doc(db,'tournaments',code,'participants','p1'),{name:'sample'});
        await setDoc(doc(db,'tournaments',code,'registrations','p1'),{uid:'p1',status:'confirmed'});
      }
    });
    const tester=env.authenticatedContext('tester-a').firestore();
    const flagged=env.authenticatedContext('flagged').firestore();
    const admin=env.authenticatedContext('admin').firestore();
    const staff=env.authenticatedContext('staff').firestore();
    async function check(label,op,allowed){await (allowed?assertSucceeds:assertFails)(op());count++;console.log('PASS '+label);}
    await check('Tester creates own TEST room',()=>setDoc(doc(tester,'tournaments','NEW'),room()),true);
    await check('Tester cannot create another owner room',()=>setDoc(doc(tester,'tournaments','BAD'),room('tester-b')),false);
    await check('Tester cannot create official room',()=>setDoc(doc(tester,'tournaments','BAD-OFFICIAL'),room('tester-a',{testMode:false,eventAuthority:'official'})),false);
    await check('Tester cannot create community room as escape route',()=>setDoc(doc(tester,'tournaments','BAD-COMMUNITY'),room('tester-a',{eventAuthority:'community',createdByRole:'player',registrationEnabled:false})),false);
    for(const code of ['OWN','OTHER','OFFICIAL']){
      const own=code==='OWN';
      await check('room settings '+code,()=>updateDoc(doc(tester,'tournaments',code),{data:'{"testLadderEnabled":true}'}),own);
      await check('public mirror '+code,()=>updateDoc(doc(tester,'publicTournaments',code),{bracketView:'{"changed":true}',updatedAt:2}),own);
      await check('participant edit '+code,()=>updateDoc(doc(tester,'tournaments',code,'participants','p1'),{name:'changed'}),own);
      await check('registration deletion '+code,()=>deleteDoc(doc(tester,'tournaments',code,'registrations','p1')),own);
    }
    await check('cannot change own room owner',()=>updateDoc(doc(tester,'tournaments','OWN'),{ownerUid:'tester-b'}),false);
    await check('cannot enable official ladder in TEST',()=>updateDoc(doc(tester,'tournaments','OWN'),{ladderMode:'ranked'}),false);
    await check('cannot write official ladder',()=>setDoc(doc(tester,'ladderPlayers','x'),{seasonPoints:10}),false);
    await check('flagged admin limited to own TEST room',()=>updateDoc(doc(flagged,'tournaments','FLAG'),{data:'{"ok":true}'}),true);
    await check('flagged admin cannot edit another TEST room',()=>updateDoc(doc(flagged,'tournaments','OWN'),{data:'{}'}),false);
    await check('flagged admin cannot edit official room',()=>updateDoc(doc(flagged,'tournaments','OFFICIAL'),{data:'{}'}),false);
    await check('normal admin retains official management',()=>updateDoc(doc(admin,'tournaments','OFFICIAL'),{data:'{"admin":true}'}),true);
    await check('assigned staff retains official management',()=>updateDoc(doc(staff,'tournaments','OFFICIAL'),{data:'{"staff":true}'}),true);
    await check('own TEST public creation',()=>setDoc(doc(tester,'publicTournaments','NEW'),mirror()),true);
    await check('cannot create forged public mirror over another owner',()=>setDoc(doc(tester,'publicTournaments','OTHER'),mirror()),false);
    const batch=writeBatch(tester);batch.set(doc(tester,'tournaments','ATOMIC'),room());batch.set(doc(tester,'publicTournaments','ATOMIC'),mirror());
    await check('atomic TEST private and public creation',()=>batch.commit(),true);
    const ledger=(eventCode)=>({type:'event',eventAuthority:'test',actorUid:'tester-a',eventCode,testPlayerKey:'T064',seasonId:'TEST-S1',delta:1});
    await check('direct ledger write rejects other owner',()=>setDoc(doc(tester,'testLadderTransactions','OTHER_T064'),ledger('OTHER')),false);
    await check('direct ledger write rejects official event',()=>setDoc(doc(tester,'testLadderTransactions','OFFICIAL_T064'),ledger('OFFICIAL')),false);
    await check('direct ledger write rejects forged transaction ID',()=>setDoc(doc(tester,'testLadderTransactions','FORGED'),ledger('OWN')),false);
    // Execute the actual app cloud methods with the Emulator SDK, not duplicate implementations.
    const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
    const createMethod=html.slice(html.indexOf('    async createRoom(data){'),html.indexOf('    // Admin/staff use only'));
    const settleMethod=html.slice(html.indexOf('    async settleTestLadderTournament(code,payload){'),html.indexOf('    async settleLadderTournament(code,payload){'));
    const context={Date,JSON,Math,Object,Number,String,Array,console,cloudEnabled:true,fx:depRequire('firebase/firestore'),dbHandle:tester,
      authHandle:{currentUser:{uid:'tester-a'}},userProfile:{role:'tester',active:true},
      generateRoomCode:()=> 'SDK-ROOM',docExists:async()=>false,currentUserUidForWrites:()=> 'tester-a',
      currentUserDisplayNameForWrites:()=> 'TESTER',ensureTestName:n=>n+'（測試）',TEST_DATA_TTL_MS:7*86400000,
      computeTournamentPhase:()=> 'waiting',buildPublicMirrorFields:()=>({})};
    const methods=Function(...Object.keys(context),'return ({'+createMethod+settleMethod+'})')(...Object.values(context));
    const draft={createdAt:Date.now(),meta:{name:'SDK regression',ladderMode:'ranked'},testLadderEnabled:true};
    assert.equal(await methods.createRoom(draft),'SDK-ROOM');
    const saved=(await getDoc(doc(tester,'tournaments','SDK-ROOM'))).data();
    assert.equal(saved.ladderMode,'general');assert.equal(saved.eventAuthority,'test');
    assert.equal(JSON.parse(saved.data).testLadderEnabled,true);
    console.log('PASS actual createRoom and saved test-ranked readback');count++;
    const onsite=await methods.settleTestLadderTournament('SDK-ROOM',{participants:[{source:'onsite',playerName:'現場甲',pointsEarned:10}]});
    assert.equal(onsite.ok,true);assert.equal(onsite.skipped,true);assert.equal(onsite.results.length,0);
    console.log('PASS on-site TEST players skip ladder without blocking archive');count++;
    const points=[10,7,5,3,1,1,1,1];
    const payload={eventName:'SDK regression',participants:points.map((pointsEarned,i)=>({source:'test',testPlayerKey:'T'+String(i+1).padStart(3,'0'),playerName:'Lab '+i,placement:i<4?i+1:null,pointsEarned,wins:i===0?3:0,losses:i===0?0:1}))};
    const first=await methods.settleTestLadderTournament('SDK-ROOM',payload);assert.equal(first.ok,true);
    const again=await methods.settleTestLadderTournament('SDK-ROOM',payload);assert.equal(again.alreadyAwarded,true);
    for(let i=0;i<8;i++){
      const key='T'+String(i+1).padStart(3,'0');
      const result=(await getDoc(doc(tester,'testLadderPlayers',key))).data();
      assert.equal(result.seasonPoints,points[i]);assert.equal(result.totalEvents,1);
      assert.equal(result.careerPoints,points[i]);
      assert.equal(result.wins,i===0?3:0);assert.equal(result.losses,i===0?0:1);
      const ledger=(await getDoc(doc(tester,'testLadderTransactions','SDK-ROOM_'+key))).data();assert.equal(ledger.delta,points[i]);
      assert.equal((await getDoc(doc(admin,'ladderPlayers',key))).exists(),false);
    }
    console.log('PASS actual eight-player settlement, repeat idempotency and official isolation');count++;
    assert.equal((await methods.settleTestLadderTournament('OTHER',payload)).ok,false);
    assert.equal((await methods.settleTestLadderTournament('OFFICIAL',payload)).ok,false);
    console.log('PASS actual settlement rejects other-owner and official tournaments');count++;
    for(const code of ['OTHER','OFFICIAL','OWN']) await check('room deletion '+code,()=>deleteDoc(doc(tester,'tournaments',code)),code==='OWN');
    console.log(`PASS ${count} Firestore Emulator cases`);
  } finally {await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
