# Tester ownership regression

Run only against a disposable Firestore Emulator (project `demo-bxh-ownership`).

Dependencies: Node.js, Java 21+ with current Firebase CLI, `firebase`, and
`@firebase/rules-unit-testing`. Local validation used firebase-tools 13.35.1
with the available Java runtime.

From the repository root, with Firestore configured on localhost in a temporary
Firebase config:

```sh
firebase emulators:exec --only firestore --project demo-bxh-ownership --config /path/to/test-firebase.json 'node tests/tester-ownership.cjs'
```

If dependencies are installed outside this repository, set
`BXH_TEST_DEPENDENCIES` to that directory (containing `package.json` and
`node_modules`). The test requires `FIRESTORE_EMULATOR_HOST`, supplied by the CLI.

The suite loads `firestore.rules` into the emulator, then checks 37 cases/groups:
owner-only room/participant/registration writes; official and other-owner denial;
`isTestAccount` restrictions; admin/staff compatibility; atomic room creation;
and the actual `index.html` createRoom/settleTestLadderTournament methods against
the emulator. Eight synthetic players receive 10/7/5/3/1/1/1/1 points. Repeating
the settlement does not add points or events, and official player records remain
absent. It does not claim browser end-to-end coverage or live Firebase verification.
