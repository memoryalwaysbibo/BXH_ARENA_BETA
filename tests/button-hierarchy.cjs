'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const raffle=fs.readFileSync('raffle-ui.js','utf8');
const family=fs.readFileSync('family-ui.js','utf8');

assert.match(html,/class="btn btn-danger btn-sm" data-action="admin-cancel-registration"/,'admin registration cancellation must be danger-styled');
assert.match(html,/class="btn btn-danger btn-sm" data-action="cancel-my-registration"/,'player cancellation in schedule must be danger-styled');
assert.match(html,/class="btn btn-danger btn-sm" data-action="ops-forfeit"/,'raffle forfeiture must be danger-styled');
assert.match(html,/class="btn btn-primary" data-action="share-copy-url"/,'share copy URL remains the primary share action');
assert.match(html,/class="btn btn-ghost" data-action="share-native"/,'native share is a secondary alternate action');
assert.match(html,/class="btn btn-ghost btn-block" data-action="cloud-close-test-result"/,'closing a diagnostic result must not be primary');
assert.match(html,/class="btn \${state\.bracketSize\?'btn-ghost':'btn-primary'\}" data-action="draw-bracket"/,'redraw must become secondary once a bracket already exists');
assert.match(html,/class="btn btn-primary" data-action="start-tournament"/,'starting a prepared tournament remains the primary action');
assert.doesNotMatch(html,/class="btn btn-ghost btn-sm" data-action="admin-cancel-registration"/,'dangerous admin cancellation must not look neutral');
assert.doesNotMatch(html,/class="btn btn-ghost btn-sm" data-action="ops-forfeit"/,'raffle forfeiture must not look neutral');

assert.match(raffle,/class="btn btn-danger" data-action="raffle-cancel"/,'cancelling an entire raffle and refunding tickets must be danger-styled');
assert.match(raffle,/class="btn btn-danger btn-sm" data-action="raffle-reject"/,'rejecting a raffle participant must be danger-styled');
assert.doesNotMatch(raffle,/class="btn btn-ghost" data-action="raffle-cancel"/,'raffle cancellation must not look neutral');
assert.match(raffle,/class="btn btn-danger btn-sm" data-action="raffle-forfeit"/,'recording prize forfeiture must be danger-styled');
assert.match(raffle,/class="btn btn-danger" data-action="raffle-remove-prize"/,'removing a draft prize must be visually destructive');
assert.match(raffle,/class="btn btn-danger btn-sm" data-action="raffle-remove-rule"/,'removing a draft eligibility rule must be visually destructive');
assert.match(raffle,/forfeit:'確定記錄此獎項棄領？棄領紀錄會保留。'/,'forfeiture must require an explicit confirmation before asking for a reason');
assert.match(raffle,/reject:'確定拒絕此參賽者的資格審核？'/,'participant rejection must require an explicit confirmation');
assert.match(family,/data-close>取消<\/button>/,'family registration selection modal must describe dismissal as cancel, not navigation');
assert.match(raffle,/data-action="raffle-editor-close"[\s\S]*\$\{c\.draftId\?'取消編輯':'取消新增'\}/,'raffle editor dismissal must describe unsaved-edit cancellation, not navigation');

console.log('PASS button hierarchy distinguishes primary, secondary, and dangerous actions');
