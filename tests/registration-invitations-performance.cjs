'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('registration-invitations-ui.js','utf8');

assert.match(
  js,
  /async function mine\(force=false\)\{if\(document\.hidden&&!force\)return;/,
  'invitation polling must not hit the backend while the tab is hidden'
);
assert.match(
  js,
  /function tick\(\)\{if\(document\.hidden\)return;/,
  'the invitation UI tick must short-circuit in hidden tabs'
);
assert.match(
  js,
  /visibilitychange'[\s\S]*if\(!document\.hidden\)\{nextMineAt=0;tick\(\)\}/,
  'returning to the foreground must immediately resume the invitation UI and polling'
);

console.log('PASS invitation polling pauses in background tabs and resumes on foreground');
