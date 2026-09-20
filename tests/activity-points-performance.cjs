'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('activity-points-ui.js','utf8');

assert.match(js,/nextSnapshotAt:0,snapshotFailures:0/,'activity points must track retry backoff state');
assert.match(js,/snapshotFailures=Math\.min\(state\.snapshotFailures\+1,5\)/,'snapshot failures must increase a bounded retry counter');
assert.match(js,/Math\.min\(300000,15000\*\(2\*\*\(state\.snapshotFailures-1\)\)\)/,'snapshot retries must use bounded exponential backoff');
assert.match(js,/function activityTick\(\)\{\s*if\(document\.hidden\|\|!signedIn\(\)\)return;/,'activity polling must stop in hidden tabs');
assert.match(js,/Date\.now\(\)>=state\.nextSnapshotAt\)snapshot\(\)/,'automatic retries must respect the backoff deadline');
assert.match(js,/visibilitychange"[\s\S]*if\(!document\.hidden\)activityTick\(\)/,'activity summary must resume promptly when returning to the foreground');

console.log('PASS activity points hidden-tab pause and snapshot retry backoff');
