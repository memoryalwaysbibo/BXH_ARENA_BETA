'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');

assert.match(
  html,
  /authMod\.initializeAuth\(app,\s*\{\s*persistence:\s*\[authMod\.browserLocalPersistence,\s*authMod\.browserSessionPersistence\]/,
  'Firebase Auth must keep durable local persistence with session fallback'
);
assert.match(
  html,
  /initPromise = null;\s*return false;/,
  'failed Firebase boot must remain retryable without a page reload'
);
assert.match(
  html,
  /function startFastAuthRecovery\(\)[\s\S]*?\},1200\);/,
  'successful Auth sign-in must retain the fast currentUser recovery path'
);
assert.match(
  html,
  /Promise\.race\(\[[\s\S]*?cloudAuth\.getUserProfile\(fbUser\.uid\)[\s\S]*?4500/,
  'profile lookup must remain bounded so verifying cannot hang indefinitely'
);

// Reconnect must preserve the user's typed password. Re-rendering the login
// form before the retry would recreate the password input empty.
const playerStart=html.indexOf('if(action==="player-email-signin")');
const playerEnd=html.indexOf('if(action==="player-forgot-password")',playerStart);
assert(playerStart>=0&&playerEnd>playerStart,'player email login block missing');
const player=html.slice(playerStart,playerEnd);
assert.match(player,/if\(!\(window\.cloudAuth && window\.cloudAuth\.isReady\(\)\)\)\{[\s\S]*?cloudSync\.connect[\s\S]*?handleAction\("player-email-signin",target\)/,'player login must retry after reconnect');
assert.doesNotMatch(
  player,
  /if\(!\(window\.cloudAuth && window\.cloudAuth\.isReady\(\)\)\)\{[\s\S]*?render\(\);[\s\S]*?cloudSync\.connect/,
  'player reconnect must not rebuild the form before the password is retried'
);

const adminStart=html.indexOf('if(action==="admin-login-submit")');
const adminEnd=html.indexOf('if(action==="admin-forgot-password")',adminStart);
assert(adminStart>=0&&adminEnd>adminStart,'admin email login block missing');
const admin=html.slice(adminStart,adminEnd);
assert.match(admin,/if\(!authAvailable\(\)\)\{[\s\S]*?cloudSync\.connect[\s\S]*?handleAction\("admin-login-submit",target\)/,'admin login must retry after reconnect');
assert.doesNotMatch(
  admin,
  /if\(!authAvailable\(\)\)\{[\s\S]*?render\(\);[\s\S]*?cloudSync\.connect/,
  'admin reconnect must preserve the live login form while reconnecting'
);

console.log('PASS iOS/mobile auth reconnect preserves credentials and keeps bounded recovery');
