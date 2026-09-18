'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const source=fs.readFileSync('index.html','utf8');
const box={state:{matches:[],meta:{formatType:'single',stations:2}}};
vm.createContext(box);
vm.runInContext(source.slice(source.indexOf('function seedOrder('),source.indexOf('function shuffle(')),box);

function buildOpening(size,players){
  const order=box.seedOrder(size),seedToPos={};
  order.forEach((seed,index)=>{seedToPos[seed]=index;});
  const slots=new Array(size).fill(null);
  for(let seed=1;seed<=size;seed++) slots[seedToPos[seed]]=seed<=players?`P${seed}`:null;
  const matches=[];
  for(let i=0;i<size;i+=2){
    const a=slots[i],b=slots[i+1],isBye=!a||!b;
    matches.push({id:`R0-${i/2}`,bracket:'SE',round:0,indexInRound:i/2,a:a?{playerId:a}:null,b:b?{playerId:b}:null,isBye,completed:isBye,winnerId:isBye?(a||b):null});
  }
  for(let i=0;i<size/4;i++){
    const left=matches[i*2],right=matches[i*2+1];
    matches.push({id:`R1-${i}`,bracket:'SE',round:1,indexInRound:i,a:left.winnerId?{playerId:left.winnerId}:null,b:right.winnerId?{playerId:right.winnerId}:null,isBye:false,completed:false});
  }
  return matches;
}

// Five-player minimum reproduction: preliminary match first, direct-v-direct
// match second, preliminary-winner match last.
{
  const matches=buildOpening(8,5);
  box.applyChallongeSingleElimOrder(matches,1);
  const ordered=matches.filter(m=>!m.isBye).sort((a,b)=>a.seq-b.seq);
  assert.deepEqual(ordered.map(m=>[m.round,m.scheduleTier]),[[0,0],[1,0],[1,1]]);
}

// The supplied Challonge reference has the 41-player shape: 9 preliminary
// matches, then 7 direct-v-direct matches, then 9 matches fed by winners.
{
  const matches=buildOpening(64,41);
  box.applyChallongeSingleElimOrder(matches,4);
  const ordered=matches.filter(m=>!m.isBye).sort((a,b)=>a.seq-b.seq);
  assert.equal(ordered.filter(m=>m.round===0).length,9);
  assert.equal(ordered.filter(m=>m.round===1&&m.scheduleTier===0).length,7);
  assert.equal(ordered.filter(m=>m.round===1&&m.scheduleTier===1).length,9);
  assert.deepEqual(ordered.map(m=>`${m.round}:${m.scheduleTier}`),[
    ...Array(9).fill('0:0'),...Array(7).fill('1:0'),...Array(9).fill('1:1')
  ]);
}

// Global multi-court phase gate: another court cannot pull a later group
// while an earlier group in the same round is unfinished.
{
  const matches=buildOpening(8,5);
  box.applyChallongeSingleElimOrder(matches,2);
  const prelim=matches.find(m=>!m.isBye&&m.round===0);
  prelim.completed=true;
  const direct=matches.find(m=>m.round===1&&m.scheduleTier===0);
  const fed=matches.find(m=>m.round===1&&m.scheduleTier===1);
  direct.completed=false;fed.completed=false;
  let phase=box.activeSingleElimSchedulePhase(matches);
  assert.deepEqual({...phase},{round:1,tier:0});
  assert.equal(box.isInActiveSingleElimPhase(direct,phase,matches),true);
  assert.equal(box.isInActiveSingleElimPhase(fed,phase,matches),false);
  direct.completed=true;
  phase=box.activeSingleElimSchedulePhase(matches);
  assert.deepEqual({...phase},{round:1,tier:1});
  assert.equal(box.isInActiveSingleElimPhase(fed,phase,matches),true);
}

console.log('PASS Challonge-style single-elimination ordering and global phase gate');
