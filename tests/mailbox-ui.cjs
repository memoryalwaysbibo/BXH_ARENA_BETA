'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('index.html','utf8');
for(const token of ['function mailboxContext()','function renderMailboxPage()','async function handleMailbox(','data-action="mailbox-open"','callEngagementFunction("mailboxService"'])assert.ok(source.includes(token),`missing ${token}`);
assert.ok(source.indexOf('if(action.startsWith("mailbox-"))')<source.indexOf('if(action.startsWith("mood-"))'),'mailbox actions must route before general actions');
assert.ok(source.includes("if(mailboxContext().open) content = renderMailboxPage();"),'mailbox must render as independent player view');
console.log('PASS v13.30.0 mailbox UI integration checks');
