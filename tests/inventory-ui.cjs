const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../inventory-ui.js'),'utf8');
let uid='admin',epoch=1,reply,grantCalls=[],renders=0,storageBlocked=false;
const saved=new Map(),listeners={};
const box={URL,Date,crypto:require('node:crypto'),setTimeout:()=>{},sessionStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>{if(storageBlocked)throw Error('blocked');saved.set(k,v);},removeItem:k=>saved.delete(k)},document:{addEventListener:(n,fn)=>listeners[n]=fn,getElementById:()=>null,querySelectorAll:()=>[]},currentAuthUid:()=>uid,engagementSessionEpoch:epoch,isSuperAdmin:()=>uid==='admin',esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),mailboxDate:String,render:()=>renders++,confirm:()=>true,titleRecipientLabel:u=>u.nickname||u.uid,titleRecipientMatches:(u,q)=>u.filter(x=>x.nickname.includes(q)),loadMailbox:async()=>{},window:{engagementService:{inventory:async payload=>{if(payload.action==='grant'){grantCalls.push({...payload});if(reply instanceof Error)throw reply;return reply;}return {ok:true,items:[],nextCursor:null,serverNow:Date.now()};}},cloudAuth:{listUsers:async()=>[{uid:'player',nickname:'玩家',active:true}]}}};
vm.createContext(box);vm.runInContext(source,box);
function draft(){const c=box.inventoryContext();c.recipient={uid:'player',nickname:'玩家'};c.draft={itemCode:'ticket',name:'會員票券',quantity:'2',imageUrl:'',purpose:'活動資格',source:'贈票',expiry:''};return c;}
function reload(){vm.runInContext('inventoryState=null',box);return box.inventoryContext();}
(async()=>{
 assert.equal(box.inventoryExpiry('2026-09-21T23:59'),Date.parse('2026-09-21T15:59:00Z'));
 assert.throws(()=>box.inventoryExpiry('2026-02-30T12:00'),/invalid-expiry/);
 assert.equal(box.inventoryImage('javascript:alert(1)'), '');
 let c=draft();reply=Error('network timeout');await box.handleInventory('inventory-grant');assert.equal(grantCalls.length,1);assert(c.pending);assert(saved.size);
 const original=grantCalls[0].operationId;c=reload();assert.equal(c.pending.payload.operationId,original,'refresh retains request');
 reply={ok:true,replayed:true};await box.handleInventory('inventory-grant');assert.equal(grantCalls[1].operationId,original);assert.equal(saved.size,0);assert.equal(c.pending,null);assert.match(c.success,/先前發放成功/);
 c=draft();storageBlocked=true;await box.handleInventory('inventory-grant');assert.equal(grantCalls.length,2,'no mutation without durable retry token');storageBlocked=false;
 c=draft();let resolve;reply=null;box.window.engagementService.inventory=payload=>{if(payload.action==='grant'){grantCalls.push({...payload});return new Promise(r=>resolve=r);}return Promise.resolve({ok:true,items:[],nextCursor:null,serverNow:Date.now()});};
 const first=box.handleInventory('inventory-grant');await box.handleInventory('inventory-grant');assert.equal(grantCalls.length,3,'double click blocked');
 uid='other';box.engagementSessionEpoch=++epoch;const other=box.inventoryContext();resolve({ok:true});await first;assert.equal(other.success,'');assert.equal(other.pending,null,'no pending from other account');
 uid='admin';box.engagementSessionEpoch=++epoch;c=box.inventoryContext();assert(c.pending,'previous account may recover its request');
 c.pending=null;saved.clear();c.draft.name='<img src=x onerror=alert(1)>';c.items=[{id:'a',name:'<script>attack</script>',quantity:1,purpose:'<img onerror=x>',imageUrl:'javascript:alert(1)',source:'<b>source</b>',expiresAt:Date.now()-100,createdAt:1,itemCode:'ticket'}];
 const html=box.renderInventoryPage();assert(!html.includes('<script>attack'));assert(html.includes('&lt;script>attack'));assert(html.includes('已過期'));assert(!html.includes('src="javascript:'));assert(html.includes('value="&lt;img'));
 listeners.input({target:{value:'保留草稿',getAttribute:()=> 'name'}});box.renderInventoryPage();assert.equal(c.draft.name,'保留草稿');
 listeners.change({target:{value:'2026-09-21T23:30',getAttribute:()=> 'expiry'}});assert.equal(c.draft.expiry,'2026-09-21T23:30');
 uid='player';box.engagementSessionEpoch=++epoch;assert(!box.renderInventoryPage().includes('最高管理員｜發放道具'));const n=grantCalls.length;await box.handleInventory('inventory-grant');assert.equal(grantCalls.length,n);
 console.log('PASS inventory UI retry/reload, double click, account isolation, escaping, expiry, draft retention and permissions');
})().catch(e=>{console.error(e);process.exitCode=1;});
