'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');

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

console.log('PASS Phase 2 read de-duplication and parallel refresh guards');
