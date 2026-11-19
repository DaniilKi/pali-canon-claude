# Manual reader checks on real devices and assistive technology

**Status: NOT RUN.** This is a checklist for a person testing a specific build. Chromium viewport emulation, automated axe scans and simulated widget hosts do not complete these checks. No physical-device, signed-in host or human assistive acceptance is claimed here.

Use synthetic bookmarks and notes in a separate test browser profile. Keep exports on the test device; do not attach personal notes, browser storage, scripture bodies or identifying screenshots to public reports. Record references, source revisions, action names and the observed problem instead. Testing this matrix does not authorize deployment or outreach.

## Record the session

- Tester/date: NOT RUN
- Exact commit and test URL or local package SHA: NOT RUN
- Device/model, OS version, browser/version: NOT RUN
- Screen reader/version and input method, if used: NOT RUN
- Text size, browser zoom and display scaling: NOT RUN
- Result/evidence location and issue reference: NOT RUN

Use `Pass`, `Fail`, `Blocked` or `Not run` for each row. A pass needs the actual device/software combination and a short observation; an automated result alone is insufficient.

## Small device and input matrix

| Combination to try | What it adds beyond emulation | Status |
| --- | --- | --- |
| iPhone or iPad, Safari, touch and VoiceOver | Real viewport, text resizing, touch exploration and spoken reading order | NOT RUN |
| Android phone, Chrome, touch and TalkBack | Real touch targets, keyboard/picker behavior and screen-reader navigation | NOT RUN |
| Desktop, keyboard only, ordinary browser zoom and OS text scaling | Visible focus, tab order and actual zoom/scaling | NOT RUN |
| Desktop with NVDA or another available screen reader | Headings, labels, announcements and source/notes separation | NOT RUN |
| Actual supported widget host, if access exists | Real host focus, resizing and tool-result delivery | NOT RUN |

Record unavailable combinations as blocked. Use the actual combinations available to the tester; do not rename a desktop viewport test as a phone test or a simulated bridge as a signed-in host.

## Reader journeys

Run the core journeys below on each available combination. Record the exact passage and translator choice so a failure can be repeated. Use current source choices from the reader rather than assuming that every Apadāna poem has an English translation.

| Journey | Actions | Expected result | Status / evidence |
| --- | --- | --- | --- |
| Open and move through Pāli | Browse to a poem, follow its exact paragraph link, move to the next page and return. Try portrait and landscape on a real phone. | Citation and selected passage stay consistent; controls and text remain reachable without sideways page scrolling. | NOT RUN |
| Source choice and scope | Open English sources, choose one reviewed publisher poem, read its continuation and source notices. Also open a catalogue poem with no approved English source. | English appears after explicit selection; translator, licence, revision and edition limits are available. Unavailable text is not silently substituted. | NOT RUN |
| Poem versus apparatus | Use a reviewed poem with a chapter summary or original notes. Read through the poem, then the separately labelled summary/notes and edition navigation. | Poem, summary, preface and translator notes have distinct headings and reading order; navigation opens the stated owner. Complete publisher-edition scope is not presented as line-complete VRI English. | NOT RUN |
| Touch, keyboard and focus | Expand Study tools, select a source using touch or Enter, then move elsewhere before a delayed response finishes. | Controls have usable names and targets. Focus stays visible and follows the user's action; a late response does not pull focus away from another input. | NOT RUN |
| Spoken structure | Navigate by headings, landmarks, links, form labels and reading order. Open/close Study tools and translator notes. | Pāli, English, dictionary material and personal notes are distinguishable. Expand/collapse state and errors are announced without repeating the entire passage. | NOT RUN |
| Resize and reading preferences | Increase system text size, use browser zoom, switch theme and rotate the phone while reading. | Text is legible; controls are reachable; passage position and note edits remain usable. Record the actual settings tested. | NOT RUN |
| Unsaved local draft | Save a synthetic passage, edit its note without saving, follow links away, return and reload. Open a second tab before saving. | The first tab's draft remains recoverable; the second tab does not silently acquire or overwrite it. Save and discard remain explicit. | NOT RUN |
| Export and restore | Export synthetic bookmarks with an unsaved note, inspect the local preview, then restore in an empty test profile. Reimport into a profile that already has a different saved note. | Export retains the intended references, pins and draft; preview precedes import; existing/conflicting notes are kept unless an explicit supported replacement is chosen. | NOT RUN |
| Repaired citation and private note | Use a synthetic old pinned or unversioned `tha-ap107`/`tha-ap108` paragraph bookmark. Open it, use the explicit whole-current-text review link, then inspect Saved. | Old positions refuse before replacement words. The review link opens the whole current poem. Old notes/references remain in Saved and are not attached to a different current paragraph. | NOT RUN |
| Ambiguous draft recovery | In a dedicated fixture profile only, use duplicate saved records with the same passage key, edit a draft and reload. Download its recovery file. | Ambiguity is explained; the draft remains separately recoverable rather than being attached automatically. No saved record is silently changed. | NOT RUN |
| Failure and retry | Use the approved test setup to delay or fail one source request; cancel or retry with keyboard and touch. | Pāli remains available where appropriate; the source error and retry are understandable; no different translation or stale passage is displayed. | NOT RUN |
| Actual widget host | In an available signed-in supported host, open Pāli, choose English, follow continuation/context, resize and navigate with its screen reader. | Host controls and passage focus work together; source identity and scope survive updates. Record the actual host; simulated-bridge results do not count. | NOT RUN |

## Report a result

For a failure, record the build, device/software/settings, exact reference, short steps, expected result and actual result. Include whether it repeats after a fresh test-profile opening. Redact private content and use synthetic note markers. A source-boundary, translation or numbering concern needs source/specialist review; a device pass does not resolve it.

Do not mark the project or corpus complete from this checklist. Keep physical-device results, human assistive results, automated checks, source review and exact-commit CI as separate evidence.
