'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
let checked=0;

for(let i=0;i<scripts.length;i++){
  const attrs=scripts[i][1]||'';
  if(/\bsrc\s*=/.test(attrs)) continue;
  if(/\btype\s*=\s*["']module["']/.test(attrs)) continue;
  const source=scripts[i][2]||'';
  const tmp=path.join(os.tmpdir(),`bxh-classic-script-${i}.js`);
  fs.writeFileSync(tmp,source,'utf8');
  const check=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
  try{fs.unlinkSync(tmp);}catch(e){}
  if(check.status!==0){
    process.stderr.write(`Classic inline script #${i} syntax failed\n`);
    process.stderr.write(check.stderr||check.stdout||'unknown syntax error\n');
    process.exit(check.status||1);
  }
  checked++;
}
assert(checked>0,'No classic inline scripts found');
console.log(`PASS classic inline JavaScript syntax (${checked} scripts)`);
