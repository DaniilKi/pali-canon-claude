# Manual reader checks on real devices and assistive technology

**Status: NOT RUN.** Plan a 10–15 minute smoke on one recorded combination, then relevant follow-ups. Chromium DOM/viewport checks, automated accessibility scans, simulated widget bridges and Firefox/WebKit CI are separate evidence; they do not establish physical-device or human AT acceptance. A smoke pass covers only observed actions on that build.

Use the actual study app at an **already authorized, reachable test origin**, `/` or `/reader`; start from Library. See [the reader guide](../web-app.md). Phone localhost is not the serving computer's localhost. An unavailable origin or unverifiable build is BLOCKED. This checklist authorizes no setup, deployment, tunnels, network changes, sign-in or outside testing.

Use a dedicated test profile with synthetic notes only: saved `DEVICE-QA-A`, draft `DEVICE-QA-B`. Data belongs to that browser/origin; there is no account/device sync. Keep recovery exports local. Do not save source bodies, private text, screenshots, HTML, audio/video, HARs or storage dumps as evidence.

## Session card — NOT RUN

Record date/session/tester alias; exact commit/package SHA and origin; physical device model/OS; browser/version; input method; AT/version and tester familiarity; orientation, zoom/system text/display scale, reader script/theme. Record public references/offsets and Pāli/English source IDs/revisions. No account names or serial numbers.

Choose one available pairing: iPhone/iPad Safari + VoiceOver, Android Chrome + TalkBack, or desktop Firefox/Chrome + NVDA. Unavailable/unfamiliar AT assistance is BLOCKED. Desktop/NVDA leaves physical phone/tablet checks open. Additional combinations need separate session cards.

## 15-minute smoke

For each row record **PASS / FAIL / BLOCKED / NOT RUN**, with one concrete observation. Leave unfinished branches NOT RUN.

| Time / ID | Ordinary user actions | Pass observation |
| --- | --- | --- |
| 0–1 / S1 | Record the session; open Library → a canonical collection → Pāli passage. | Correct collection/reference, usable entry, identifiable Pāli attribution/revision; no automatic English. |
| 1–3 / S2 | Follow a paragraph citation; **Copy reading link**, open in a fresh tab, return. | Same exact ref/source revision, no nearby-text substitution. If clipboard denial occurs, use **Exact reading link · open or long-press to copy**; otherwise leave the fallback branch NOT RUN. Record locator metadata only. |
| 3–5 / S3 | **Study & sources → English sources**: choose a listed version, e.g. `tha-ap314`/publisher312 if present. Read notes/notices; record translator, translation ID/URL, revision, licence and scope. | English appears only after explicit **Read source**. Partial/shared choices require visible review and initially unchecked consent; whole poems need no invented consent category. Poem, notes and labelled apparatus remain distinct; publisher-edition completeness does not imply line-complete VRI English. Unavailable sources are not substituted. |
| 5–7 / S4 | Physical phone/tablet: rotate both ways, try browser200% text/page zoom, touch and on-screen keyboard. If available, Tab/Shift+Tab/Enter through a disclosure/action. | Text/diacritics reflow without clipping or page-wide sideways scrolling; focused controls stay visible/reachable above the keyboard. No focus trap or lost source/position. Record actual settings and unavailable inputs; OS enlargement alone is not browser200% zoom. |
| 7–10 / S5 | **Save passage**; in **Saved**, **Save note** A. Edit to unsaved B; follow a reader link away, return and reload the same tab. **Discard draft → Cancel discard**, then confirm discard. | Unchanged-base draft remains recoverable; saved A changes only through explicit Save. Cancel retains B; confirmed discard keeps saved A and exact ref/source pins. Record separate **Unsaved draft recovery** if shown. Tab closure is not a backup guarantee. |
| 10–13 / S6 | A person uses the selected AT: headings/landmarks, source disclosure/notes, personal-note editor, then back to Pāli. | Meaningful names/state, logical reading order and useful focus; scripture/editorial/private notes distinguishable. Status/errors are understandable without repeating the whole passage. Record label/order issues, not scripture audio. This is a limited human smoke. |
| 13–15 / S7 | Save the synthetic note; briefly disconnect the device, request another passage, reconnect and reopen its saved exact link. | Understandable failure/retry; old visible text is not proof of new retrieval. Server disconnection may prevent even Pāli/page loading: no offline browser library/service-worker promise. Saved notes/pins survive reconnect. Do not clear storage. |

## Targeted follow-ups — all NOT RUN

| ID / time | Action and pass observation |
| --- | --- |
| F1 / 3–5 min | **Long notes/continuation/focus:** choose a version with **Next English page**; record offsets. Reach long notes/continuation with touch, keyboard and AT. Source, notes, notices and scope persist. With an already prepared delay, move to another input before completion: late rendering must not steal newer focus. No real delay/continuation means NOT RUN. |
| F2 / 4–5 min | **Two tabs:** leave unsaved B in tab1; open fresh tab2 at the same origin (not Duplicate), save a different synthetic note for that passage; attempt tab1's stale save. No silent overwrite/reassignment; review/recovery preserves both versions. Cancel reload keeps changes. Duplicated sessions can copy drafts; this is not sync or an atomic tab lock. |
| F3 / 4–5 min | **Restore:** export synthetic **Study backup** with a draft. In an empty test profile, preview/cancel, then preview/restore; also preview against a conflicting synthetic note. Cancel changes nothing; pins remain exact and existing notes stay unless explicit supported same-source replacement is chosen. File reading stays local. Transfer/restore is manual. |
| F4 / 3 min | **Provider failure:** use an already prepared provider-blocked setup while the server remains reachable. Explicitly select/retry the same source. Pāli stays available; English fails honestly without a different version. This differs from S7. No setup means BLOCKED; do not alter/contact publishers. |
| F5 / 5 min | **Another physical size:** record a new phone/tablet session; repeat S2–S5 and one AT notes/disclosure action. Record actual orientation/text/zoom/input results; emulated width or a phone pass cannot establish tablet usability. |
| F6 / 3–5 min | **Privacy:** with an approved observer/devtools already available, inspect synthetic note edit/save/export and source retrieval in memory. Canary must not enter URL, headers, body or document title. Record destination classes and canary absent/present only; no payload/HAR. Unobservable traffic is BLOCKED; UI alone proves no network privacy claim. |
| F7 / fixture | **Prior compatibility:** use prepared synthetic old versioned/unversioned `tha-ap107`/`tha-ap108` bookmarks or ambiguous duplicate-key drafts. Old positions refuse before replacement wording; current-text review leaves old references/notes intact. Ambiguous drafts remain separately readable/exportable, never automatically attached. |

## Stop, recover and record

Stop the affected journey for wrong source/wording pins, lost/overwritten notes, trapped focus or an outbound canary. Keep the tab; use local recovery download if available. Do not repeat writes/restore, clear storage, overwrite backups or close a draft-only tab. Restore connectivity and retry the same explicit source; another source requires fresh selection/review.

Result card: **status; session/build/device/AT/settings; S/F ID; public ref and Pāli/English revisions/scope; steps; expected versus actual; repeatability; private local evidence ID**. A pass needs an observed result, not “no issues noticed.” Separate product defects, setup limits and source/numbering concerns. No body/private screenshots or logs are required. Source-rights/scholarly review, broader accessibility, signed-in hosts and project/corpus completion remain separate.
