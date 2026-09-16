const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const box={URL,Date,setInterval(){},document:{addEventListener(){}},navigator:{},location:{href:'https://memoryalwaysbibo.github.io/BXH_ARENA_BETA/?code=OLD#old'}};
vm.createContext(box);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../raffle-ui.js'),'utf8'),box);
(async()=>{
 const event={id:'a'.repeat(64),state:'open',title:'測試活動 & <安全>',prizes:[{name:'戰鬥盒',quantity:2}],drawAt:Date.UTC(2026,8,16,12)};
 const text=box.raffleShareText(event);assert(text.includes(event.title));assert(text.includes('戰鬥盒 × 2'));assert(text.includes('20:00:00'));assert(text.endsWith('?raffle='+event.id));assert(!text.includes('OLD'));
 for(const e of [{...event,testMode:true},{...event,state:'draft'},{...event,id:'bad'}])assert.equal(box.raffleShareText(e),'');
 let fallback=0,calls=0,resolve;const status={},file={name:'QR.png'};
 await box.shareRaffleQrFile(file,status,()=>fallback++);assert.equal(fallback,1);
 box.navigator={canShare:()=>false,share:()=>calls++};await box.shareRaffleQrFile(file,status,()=>fallback++);assert.equal(calls,0);assert.equal(fallback,2);
 box.navigator={canShare:()=>true,share:data=>{assert.equal(data.files[0],file);calls++;return new Promise(r=>resolve=r)}};
 const pending=box.shareRaffleQrFile(file,status,()=>fallback++);assert.equal(calls,1,'share called synchronously while user activation is live');assert.equal(status.textContent,undefined);resolve();await pending;assert(status.textContent.includes('請到相簿確認'));assert(!status.textContent.includes('已儲存'));
 box.navigator.share=async()=>{throw Object.assign(Error(),{name:'AbortError'})};await box.shareRaffleQrFile(file,status,()=>fallback++);assert(status.textContent.includes('取消'));assert.equal(fallback,2);
 box.navigator.share=async()=>{throw Error('permission')};await box.shareRaffleQrFile(file,status,()=>fallback++);assert.equal(fallback,3);
 console.log('PASS named share text, public-only links, timezone, missing/unsupported API, synchronous share, cancellation and failure fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
