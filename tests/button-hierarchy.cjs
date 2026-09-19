'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');

assert.match(html,/class="btn btn-danger btn-sm" data-action="admin-cancel-registration"/,'admin registration cancellation must be danger-styled');
assert.match(html,/class="btn btn-danger btn-sm" data-action="cancel-my-registration"/,'player cancellation in schedule must be danger-styled');
assert.match(html,/class="btn btn-danger btn-sm" data-action="ops-forfeit"/,'raffle forfeiture must be danger-styled');
assert.match(html,/class="btn btn-primary" data-action="share-copy-url"/,'share copy URL remains the primary share action');
assert.match(html,/class="btn btn-ghost" data-action="share-native"/,'native share is a secondary alternate action');
assert.match(html,/class="btn btn-ghost btn-block" data-action="cloud-close-test-result"/,'closing a diagnostic result must not be primary');
assert.doesNotMatch(html,/class="btn btn-ghost btn-sm" data-action="admin-cancel-registration"/,'dangerous admin cancellation must not look neutral');
assert.doesNotMatch(html,/class="btn btn-ghost btn-sm" data-action="ops-forfeit"/,'raffle forfeiture must not look neutral');

console.log('PASS button hierarchy distinguishes primary, secondary, and dangerous actions');
