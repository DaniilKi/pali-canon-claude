# Expanded text spacing and local study controls

`scripts/web-reader-text-spacing-check.py` exercises actual bundled Pāli, source-choice metadata and a synthetic private note at 320, 390 and 1280 CSS-pixel widths in light and dark themes. It applies a 30px passage font plus line height 1.5, paragraph spacing 2em, letter spacing 0.12em and word spacing 0.16em, using the [WCAG text-spacing values](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html) as an audit condition.

The checked states are passage reading with a focused unsaved draft across a responsive change; keyboard Save and confirmed Discard without overwriting the saved note; expanded root-book tools and source-position form with logical keyboard order; and visible source-boundary warnings plus unchecked, keyboard-operable shared-source consent. Assertions retain exact Pāli and local-only drafts; no English body or publisher request is needed.

Local receipts under `/tmp/pali-an-ten-reader-acceptance` report:

| Run | Workflow assertions | Layout snapshots | Accessibility result |
|---|---:|---:|---|
| Checkout | 24 passed | 24, no horizontal overflow or clipped controls | Not scanned |
| Checkout with axe | 24 passed | 24, no horizontal overflow or clipped controls | 24 scans, zero violations; color contrast still flagged for manual review |
| Extracted package outside the source tree | 24 passed | 24, no horizontal overflow or clipped controls | Not scanned |

These runs found no material runtime defect in those bounded workflows. Reports retain source identities and bundle hashes, not private note wording. The test-only browser context bypasses CSP to inject the audit stylesheet and optional axe script; production CSP is unchanged. This does not imply permissive production styling or a CSP relaxation.

The test covers user spacing overrides in emulated viewports. It does **not** test actual browser zoom, OS text scaling, physical devices, native glyph shaping, printed or tagged PDF output, or human screen-reader use. Automated axe success does not establish WCAG conformance. Continue the existing device and assistive-user tasks in [HANDOFF](../../../HANDOFF.md). Independent review and exact-commit CI remain separate gates.
