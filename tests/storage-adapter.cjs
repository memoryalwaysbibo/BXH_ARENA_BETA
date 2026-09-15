const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const adapter=html.slice(html.indexOf('// Standalone browsers'),html.indexOf('\n}',html.indexOf('// Standalone browsers'))+2);
(async()=>{
 const map=new Map();const localStorage={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
 const ctx={window:{localStorage}};vm.runInNewContext(adapter,ctx);
 assert.equal(await ctx.window.storage.get('missing'),null);
 await ctx.window.storage.set('record','{"name":"TEST"}');assert.equal((await ctx.window.storage.get('record')).value,'{"name":"TEST"}');
 const reload={window:{localStorage}};vm.runInNewContext(adapter,reload);assert.equal((await reload.window.storage.get('record')).value,'{"name":"TEST"}');
 await reload.window.storage.delete('record');assert.equal(await ctx.window.storage.get('record'),null);
 const existing={get:()=> 'existing'};const preserved={window:{storage:existing}};vm.runInNewContext(adapter,preserved);assert.equal(preserved.window.storage,existing);
 ctx.window.localStorage.setItem=()=>{throw Error('quota')};await assert.rejects(ctx.window.storage.set('x','y'),/quota/);
 console.log('PASS storage roundtrip, reload persistence, deletion, provider preservation and failure propagation');
})().catch(e=>{console.error(e);process.exitCode=1;});
