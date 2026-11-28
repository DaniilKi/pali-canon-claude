# Hands-on reader acceptance for the eight-source intake

Record the exact commit, device/OS/browser, assistive technology and result.
Use synthetic notes. Automated viewport, keyboard, touch and axe results are
separate evidence; this short checklist is not exhaustive accessibility acceptance.
Start the local reader using [the web-app guide](../../web-app.md), then use an
authorized connection that the actual test device can reach.

## Phone: about eight minutes

1. Open the reader for the first time. Find the collection and an exact canonical
   reference without requiring prior local preferences.
2. Open `tha-ap413`/publisher411. Request the Walters English source explicitly.
   Check the separate chapter heading, note links and the combined local18/19
   paragraph. Source and licensing information must remain available.
3. Open `tha-ap414`/publisher412. Follow its real6000→1546 continuation, copy the
   citation, open the copied link and return to the same edition/source position.
4. Make a synthetic draft, move focus to its input during delayed reading, then
   navigate away/reopen. Confirm intentional focus and recoverable local text.
5. Change orientation and text size. Check long notes, controls, page scrolling
   and source selection without clipped text or an inaccessible close action.

## Tablet and keyboard: about five minutes

1. Open `tha-ap420`/publisher418. The local-only16/17 stanzas must not acquire
   invented global numbering.
2. Read at increased text size and in both themes. Tab through source, next page,
   notes, bookmark and return actions; focus should remain visible and deliberate.
3. Open an earlier saved source/citation. Bookmark/export/preview-restore using
   synthetic data; ambiguous historical positions require review, not silent moves.

## Human screen reader: about five minutes

With VoiceOver, NVDA or an actual equivalent, check title/source announcements,
control names, loading/error feedback, note return, continuation and focus order.
Check real reading order rather than inferring it from an axe scan. Record unclear
pronunciation/language handling and navigation failures for targeted repair.

## Separate host and offline scopes

In an authorized signed-in assistant host, verify the actual v52 widget resource,
explicit English loading, citations and source notices. Standalone browser tests
do not establish host cache, bridge or permission behavior.

The bundled backend supports offline Pāli; the web app does not yet promise
offline browser downloads, first-run disconnected installation, account sync or
a PWA. Distinguish loss of external internet with the local backend still reachable
from loss of the backend connection itself. Do not mark either as tested without
performing it on the stated device and recording retained drafts/errors.
