'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const family=fs.readFileSync('family-ui.js','utf8');
const claims=fs.readFileSync('raffle-claims-ui.js','utf8');

assert.ok((family.match(/setInterval\(\(\)=>\{if\(document\.hidden\)return;/g)||[]).length>=2,'family modal watchdogs must pause in hidden tabs');
assert.ok((family.match(/\},1000\)/g)||[]).length>=2,'family modal watchdogs should use the lower 1s frequency');
assert.match(claims,/const watch=setInterval\(\(\)=>\{if\(document\.hidden\)return;if\(!valid\(\)\)close\(\);\},1000\);/,'claim modal watchdog must pause in hidden tabs and use 1s cadence');

console.log('PASS modal watchdogs pause in background tabs');
