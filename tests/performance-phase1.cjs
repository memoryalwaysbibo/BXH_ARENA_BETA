'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('const REMOTE_RENDER_COALESCE_MS=');
const end=html.indexOf('// Phase 1: tournaments connect to the cloud automatically',start);
assert(start>0&&end>start,'Phase 1 performance block not found in index.html');
const block=html.slice(start,end);

function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

function makeBaseState(){
  return {
    id:'stress-room',
    cloudCode:'BXH-STRESS',
    updatedAt:1,
    callRevision:0,
    entrySelectionRevision:0,
    bracketSize:64,
    meta:{stations:4},
    matches:Array.from({length:32},(_,i)=>({
      id:'M'+(i+1),station:(i%4)+1,completed:false,status:'pending',
      winnerId:null,a:{playerId:'A'+i},b:{playerId:'B'+i},
      skippedAt:0,resumeQueuedAt:0,dispatchRevision:0
    }))
  };
}

async function runClient(snapshotCount){
  let renderCount=0,persistCount=0,rebuildCount=0;
  const listeners={};
  const ctx={
    state:makeBaseState(),
    remoteAppliedRoomId:null,
    remoteAppliedAt:0,
    cloudLastSyncAt:0,
    refereeAssignmentDraftEnabled:null,
    defaultState:id=>({id,cloudCode:null,updatedAt:0,callRevision:0,entrySelectionRevision:0,bracketSize:0,meta:{stations:1},matches:[]}),
    rebuildCourtAssignments:()=>{rebuildCount++;},
    saveRecord:async()=>{persistCount++;return true;},
    render:()=>{renderCount++;},
    cloneStateForSave:st=>JSON.parse(JSON.stringify(st)),
    window:{scrollY:0,scrollTo:()=>{}},
    document:{
      visibilityState:'visible',
      addEventListener:(name,fn)=>{listeners[name]=fn;}
    },
    setTimeout,clearTimeout,
    console
  };
  vm.createContext(ctx);
  vm.runInContext(block,ctx);

  for(let i=1;i<=snapshotCount;i++){
    const remote=JSON.parse(JSON.stringify(ctx.state));
    remote.updatedAt=1000+i;
    // Score-only mutation: should not force Court reassignment rebuild.
    remote.matches[0].scoreA=i%5;
    ctx.applyRemoteState(remote,false);
  }
  await wait(900);
  return {renderCount,persistCount,rebuildCount,stateUpdatedAt:ctx.state.updatedAt};
}

(async()=>{
  const scenarios=[16,32,64];
  const snapshotsPerClient=40;
  for(const clients of scenarios){
    const results=await Promise.all(Array.from({length:clients},()=>runClient(snapshotsPerClient)));
    const renders=results.reduce((n,r)=>n+r.renderCount,0);
    const persists=results.reduce((n,r)=>n+r.persistCount,0);
    const rebuilds=results.reduce((n,r)=>n+r.rebuildCount,0);
    const raw=clients*snapshotsPerClient;

    // A burst of 40 remote snapshots should collapse to ~1 render per client
    // and only a handful of local persistence writes.
    assert(renders<=clients*2,`too many renders: ${renders} for ${clients} clients`);
    assert(persists<=clients*3,`too many persists: ${persists} for ${clients} clients`);
    assert.equal(rebuilds,0,'score-only snapshot burst should not rebuild court assignments');
    assert(results.every(r=>r.stateUpdatedAt===1040),'latest snapshot must win');

    const renderReduction=(1-renders/raw)*100;
    const persistReduction=(1-persists/raw)*100;
    console.log(JSON.stringify({
      clients,
      snapshotsPerClient,
      rawSnapshots:raw,
      renders,
      persists,
      courtRebuilds:rebuilds,
      renderReductionPct:Number(renderReduction.toFixed(1)),
      persistReductionPct:Number(persistReduction.toFixed(1))
    }));
  }
  console.log('PASS Phase 1 synthetic 16/32/64-client snapshot coalescing');
})().catch(error=>{console.error(error);process.exit(1);});
