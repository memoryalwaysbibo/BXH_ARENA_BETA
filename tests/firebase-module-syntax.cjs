'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const html=fs.readFileSync('index.html','utf8');
const moduleOpen='<script type="module">';
const start=html.indexOf(moduleOpen);
assert(start>=0,'Firebase module script not found');
const bodyStart=start+moduleOpen.length;
const end=html.indexOf('</script>',bodyStart);
assert(end>bodyStart,'Firebase module closing tag not found');

const source=html.slice(bodyStart,end);
assert(source.includes('const FIREBASE_CONFIG'),'Firebase config not found in module');

const tmp=path.join(os.tmpdir(),'bxh-firebase-module-syntax.mjs');
fs.writeFileSync(tmp,source,'utf8');
const check=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
try{fs.unlinkSync(tmp);}catch(e){}

if(check.status!==0){
  process.stderr.write(check.stderr||check.stdout||'Firebase module syntax check failed\n');
  process.exit(check.status||1);
}
console.log('PASS Firebase module JavaScript syntax');
