const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
let uid='admin',response,requests=[],tick,overlay,closed=false;
const saved=new Map(),listeners={},elements={'.raffle-slot':{},'.raffle-replay-progress':{},'.raffle-replay-close':{},'.raffle-fullscreen':{}};
const box={Date,URL,URLSearchParams,Object,crypto:require('node:crypto'),setTimeout:()=>{},setInterval:fn=>(tick=fn,1),clearInterval:()=>{},location:{search:''},sessionStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},document:{addEventListener:(n,f)=>listeners[n]=f,createElement:()=>overlay={innerHTML:'',querySelector:s=>elements[s],requestFullscreen:()=>Promise.resolve(),remove:()=>closed=true},body:{appendChild:()=>{}}},currentAuthUid:()=>uid,engagementSessionEpoch:1,userProfile:{realName:'管理員'},appPhase:'player-center',playerActiveTab:'raffles',currentRole:'player',render:()=>{},esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),mailboxDate:String,inventoryExpiry:s=>Date.parse(s+':00+08:00'),inventoryImage:()=>'',confirm:()=>true,prompt:()=> '原因',loadMailbox:async()=>{},inventoryState:null,window:{engagementService:{raffle:async p=>{requests.push({...p});if(response instanceof Error)throw response;return response||{ok:true,events:[],canCreate:true};}}}};
box.pendingLoginIntent=null;
box.location.href='https://memoryalwaysbibo.github.io/BXH_ARENA_BETA/?entry=watch&code=OLD#old';
box.hasAdminAccess=()=>box.currentRole==='admin';
box.activeTab='member-raffles';box.userProfile.active=true;box.userProfile.role='staff';
vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(__dirname,'../raffle-ui.js'),'utf8'),box);
const target=attrs=>({getAttribute:k=>attrs[k]??null});
(async()=>{
 const id='a'.repeat(64);saved.set('bxh.raffle.return',id);assert.equal(box.restoreRaffleIntent(),true);assert.equal(box.raffleContext().id,id);assert.equal(box.playerActiveTab,'raffles');assert.equal(saved.has('bxh.raffle.return'),false);
 assert.equal(box.raffleShareUrl({id,state:'open'}),'https://memoryalwaysbibo.github.io/BXH_ARENA_BETA/?raffle='+id);
 for(const event of [{id,state:'draft'},{id,state:'open',testMode:true},{id:'invalid',state:'open'}])assert.equal(box.raffleShareUrl(event),'');
 const input={value:'https://example.com/?raffle='+id,focus(){},select(){},setSelectionRange(){}},status={};let copied='';
 box.navigator={clipboard:{writeText:async text=>{copied=text;}}};await box.copyRaffleShareUrl(input,status);assert.equal(copied,input.value);assert.equal(status.textContent,'已複製活動網址');
 box.navigator.clipboard.writeText=async()=>{throw Error('denied');};box.document.execCommand=()=>false;await box.copyRaffleShareUrl(input,status);assert(status.textContent.includes('手動複製'));assert(!status.textContent.includes('已複製'));
 box.document.execCommand=()=>true;await box.copyRaffleShareUrl(input,status);assert.equal(status.textContent,'已複製活動網址');
 let c=box.raffleContext();c.canCreate=true;const before=requests.length;
 await box.handleRaffle('raffle-new',target({}));await box.raffleMutate({action:'save'});
 assert(!c.editing);assert.equal(requests.length,before);assert(!box.renderRafflePage().includes('data-action="raffle-new"'));
 box.appPhase='app';box.currentRole='admin';c=box.raffleContext();c.canCreate=true;
 await box.handleRaffle('raffle-new',target({}));c.draft.title='<img src=x onerror=alert(1)>';assert(box.renderRafflePage().includes('&lt;img'));assert(!box.renderRafflePage().includes('<img src=x'));
 await box.handleRaffle('raffle-add-prize',target({}));assert.equal(c.draft.prizes.length,2);await box.handleRaffle('raffle-remove-prize',target({'data-index':'1'}));assert.equal(c.draft.prizes.length,1);
 await box.handleRaffle('raffle-add-rule',target({'data-kind':'ticket'}));assert.equal(c.draft.conditions[0].mode,'hold');listeners.input({target:{getAttribute:k=>({'data-raffle-field':'title'})[k]??null,type:'text',value:'草稿保留'}});assert.equal(c.draft.title,'草稿保留');
 response=Error('network timeout');await box.raffleMutate({action:'draw',id,operationId:'operation_1'});assert.equal(c.pending.operationId,'operation_1');
 box.appPhase='player-center';assert.equal(box.raffleContext().pending,null,'management retry never leaks into player view');
 box.appPhase='app';vm.runInContext('raffleState=null',box);c=box.raffleContext();assert.equal(c.pending.operationId,'operation_1');response={ok:true,events:[]};await box.handleRaffle('raffle-retry-pending',target({}));assert.equal(requests.filter(r=>r.action==='draw').length,2);assert.equal(c.pending,null);
 for(const role of ['staff','admin','super_admin','tester']){box.userProfile.role=role;assert.equal(box.isRaffleManagementView(),true);box.appPhase='player-center';assert.equal(box.isRaffleManagementView(),false);box.appPhase='app';}
 box.userProfile.role='player';assert.equal(box.isRaffleManagementView(),false);box.userProfile.role='staff';box.userProfile.active=false;assert.equal(box.canManageMemberRaffles(),false);box.userProfile.active=true;
 const detail={event:{id,title:'活動',state:'drawn',mode:'manual',conditions:[],prizes:[]},isManager:true,winners:[{nickname:'甲',prizeName:'獎品',playerId:'P1',status:'pending',awardId:'a'}]};
 c=box.raffleContext();c.editing=false;c.detail=detail;assert(box.renderRafflePage().includes('data-action="raffle-claim"'));assert(box.renderRafflePage().includes('主辦管理'));
 box.appPhase='player-center';c=box.raffleContext();c.canCreate=true;c.detail=detail;
 for(const mode of ['player-center','raffle-public']){box.appPhase=mode;const html=box.renderRafflePage();assert(!html.includes('主辦管理'));assert(!html.includes('data-action="raffle-new"'));assert(!html.includes('data-action="raffle-claim"'));assert(html.includes('查看完整結果'));}
 box.appPhase='app';c=box.raffleContext();c.pending={action:'draw'};uid='other';box.engagementSessionEpoch=2;assert.equal(box.raffleContext().pending,null,'pending requests never cross accounts');
 const calls=requests.length;let replayDetail;box.window.bxhRaffleReplay={open:d=>replayDetail=d};box.playRaffleReplay({drawnAt:123,event:{title:'活動'},winners:[{nickname:'甲',playerId:'P1',prizeName:'A'}]});assert.equal(replayDetail.winners[0].nickname,'甲');assert.equal(requests.length,calls,'replay never calls draw');
 uid='';box.engagementSessionEpoch=3;c=box.raffleContext();c.id=id;await box.handleRaffle('raffle-login',target({}));assert.equal(saved.get('bxh.raffle.return'),id);assert.equal(box.appPhase,'player-login');
 console.log('PASS raffle UI login return, prize/rule editing, draft/escaping, persistent retry, account isolation and sequential fixed-result replay');
})().catch(e=>{console.error(e);process.exitCode=1;});
