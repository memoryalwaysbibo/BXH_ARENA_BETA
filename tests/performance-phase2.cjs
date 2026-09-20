'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const raffle=fs.readFileSync('raffle-ui.js','utf8');

// Phase 2A: my registrations may reuse the already-loaded public tournament list.
assert.match(
  html,
  /async queryMyRegistrations\(knownPublicCodes\)/,
  'queryMyRegistrations must accept an optional known public-code list'
);
assert.match(
  html,
  /queryMyRegistrations\(cachedCodes\)/,
  'my schedule loader must pass cached public codes when available'
);

// Cached tournament summaries must not all be re-fetched.
assert.match(
  html,
  /const missingSummaryCodes=\[\]/,
  'my schedule loader must track only missing tournament summaries'
);
assert.match(
  html,
  /Promise\.all\(missingSummaryCodes\.map/,
  'missing tournament summaries must be fetched in parallel'
);

// Tournament detail should render cached public data first, then refresh in parallel.
assert.match(
  html,
  /const cached=Array\.isArray\(publicTournamentsCache\)/,
  'tournament detail should reuse public cache'
);
assert.match(
  html,
  /const \[data,myReg\]=await Promise\.all\(/,
  'tournament detail public data and own registration must load in parallel'
);

// BXH CALL should refresh multiple live-event summaries in parallel.
assert.match(
  html,
  /await Promise\.all\(enabled\.map\(async r=>/,
  'smart-call summary refresh must be parallel'
);


// Phase 2B: short-burst public reads are coalesced and hidden tabs do not poll.
assert.match(
  html,
  /const PUBLIC_TOURNAMENT_DOC_READ_TTL_MS=5000;/,
  'public tournament document reads must have a short de-duplication TTL'
);
assert.match(
  html,
  /async function readPublicTournamentDocCoalesced\(code\)/,
  'public tournament reads must share an in-flight/cache helper'
);
assert.ok(
  (html.match(/await readPublicTournamentDocCoalesced\(code\)/g)||[]).length>=2,
  'summary and full public-event reads must both use the coalesced helper'
);
assert.match(
  html,
  /document\.visibilityState!=="visible" \|\| smartCallRefreshBusy/,
  'BXH CALL polling must pause while the browser tab is hidden'
);
assert.match(
  html,
  /if\(document\.visibilityState!=="visible" \|\| smartCallRefreshBusy\)\{\s*scheduleSmartCallAutoRefresh\(\);/,
  'hidden/busy smart-call refresh must re-arm instead of silently stopping'
);


// Phase 2C: raffle detail polling must not keep refreshing in background tabs.
assert.match(
  raffle,
  /setInterval\(\(\)=>\{\s*if\(document\.hidden\)return;\s*raffleAnnouncementsState\.loaded=false;/,
  'raffle auto-refresh must pause while the browser tab is hidden'
);
assert.match(
  raffle,
  /visibilitychange'[\s\S]*if\(document\.hidden\)return;[\s\S]*loadRaffles\(\);/,
  'raffle view must refresh promptly after returning to the foreground'
);

console.log('PASS Phase 2 read de-duplication and parallel refresh guards');
