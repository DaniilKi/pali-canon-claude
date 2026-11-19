# Final publisher-edition Therī Apadāna chapter (D246)

Poems 31–40 add ten first indexed English choices and complete the forty-poem Therī sequence in the reviewed Walters publisher edition. The previous thirty profiles and Pāli sequences remain unchanged. This is **not complete Apadāna English coverage or a line-complete VRI translation**. Publisher wording, original numbering and explicit recension differences are preserved; no missing words, numbers or repetitions are generated.

## Source and rights

The sole retrieval source remains official repository `apadana-translation/apadana-site` at `fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4`, paths `src/_poems/chapter-4/poem-031.md` through `poem-040.md`. Ten raw Git blobs and six rights/routing artifacts were independently verified, alongside the complete original VRI XML and all 10,672 compact book blocks, including notes and pages.

Jonathan S. Walters and Whitman College’s **CC BY-NC-SA 4.0** terms remain mandatory. Attribute the translation, link source and licence, disclose presentation changes, retain share-alike terms and imply no endorsement. Conflicting generic site metadata does not relax these rights. English bodies, notes and paratext remain live-only; only metadata, labels and hashes are bundled.

[Independent source review](../evidence/apadana/FOURTH_CHAPTER_SOURCE_REVIEW.json), [extraction goldens](../evidence/apadana/FOURTH_CHAPTER_GOLDENS.json), [activation review](../evidence/apadana/FOURTH_CHAPTER_ACTIVATION_REVIEW.json).

## Exact ownership and edition limits

The ten poems contain **230 printed stanza entries in 260 body paragraphs**. There are **224 note definitions**: 218 poem-owned notes, one preface note, three chapter-summary notes and two collection-summary notes. Every note retains its original number, wording and owner. Titles and poem colophons remain body paragraphs but are excluded from stanza quotation evidence.

- **31:** The fourth-chapter publisher heading owns note 1. Poem notes are 2–18. `publisher_paratext` remains the sole preface wording; finite `publisher_preface` metadata binds its hash and owns only the preface notes. Its runtime object has no duplicate text field. Twelve printed entries retain two local labels 11, with different original global labels. The canonical chapter heading at block 9949 remains in the unchanged root.
- **33:** Only the two exact paired HTML displays in notes 2/3 retain the original diacritic spelling and remove its alternate display. Unreviewed HTML is refused. Original brackets and punctuation are unchanged.
- **34:** Twenty-nine physical stanza entries retain the six compound local labels; they are not renumbered into thirty entries.
- **35:** The VRI fifth-recitation colophon at block 10381 belongs to this root but is absent from the publisher artifact. A visible mapping note discloses it; no English division is invented. Original incomplete punctuation and the literal less-than character in editorial note 33 remain plaintext and render as text, not HTML.
- **37–39:** Original combined stanza entries retain their printed labels and wording. Physical publisher-entry counts are distinct from numbered VRI stanzas.
- **40:** Fourteen poem entries and notes 1–7 are separate from the three-paragraph chapter summary/notes 8–10 and four-paragraph collection summary/final colophons/notes 11–12. Both editions’ chapter summaries state 242; the actual numbered VRI chapter has 233 stanzas. The original collection totals 1347/1357 are preserved, not asserted as independently validated coverage counts.

Per-poem `mapping_notes` disclose additional lexical, variant, title and colophon differences. Exact raw, poem, notes, preface and root hashes fail closed on drift. No new paragraph breaks are needed in this chapter. Only substantive printed stanzas enter quotation matching; all titles, prefaces, editorial notes, summaries and colophons remain outside it.

Poem 40’s canonical chapter summary binds blocks 10659–10665 and refs `thi-ap40/18–21`. Its collection summary and final colophons bind blocks 10665–10672 and refs `thi-ap40/22–26`. Separate `chapter_summary` and `collection_summary` descriptors preserve these independent roots and note sets. They never extend poem pagination, prefixes or quotation evidence.

## Atomic index repair and private saved positions

Three original heading boundaries move: 33/34 from 10200 to 10196, 34/35 from 10289 to 10285, and 36/37 from 10461 to 10457. Only the five records 33–37 change their start/end, printed VRI range and `apadana-theri31-40-v1` locator revision. All 61 source books, 8,539 unrelated units, all thirty earlier profiles/Pāli sequences, all commentary and 58 accepted commentary passages in this book remain unchanged.

The migration verifies the exact original XML/book, refuses every partial or foreign migration state before mutation, and is idempotent. Full-source rebuild runs the new helper after the earlier three repairs. Derived parallels are rebuilt. Historical receipts require explicitly reversing this five-unit repair before D245’s two-unit, D244’s seven-unit and D243’s 4/5 pair; old receipts are not rewritten.

Saved 33–37 links and widget cursors refuse their old locator before replacement wording, including vanished tail references. Private drafts, notes and exports remain local, untouched and never silently rebased. Unchanged neighbours retain their source revisions. Widget v21 changes the cached presentation contract for the new preface/collection ownership.

[Repair receipt](../evidence/apadana/FOURTH_CHAPTER_REPAIR.json), [preservation receipt](../evidence/apadana/FOURTH_CHAPTER_PRESERVATION.json).

## Measured gain and remaining scope

Whole publisher-edition links become **2,623**: DT 1,270, ATI 1,160, Ānandajoti 153 and Walters 40. Indexed direct/inherited whole coverage is **1,519/1,942**; grouped member-aware coverage is **1,493/1,916**. Partial links remain 22; shared pages/subjects 12/110, shared-only 22, and daily eligibility 1,288. These are newly indexed existing translations, not newly authored scripture.

The finite forty-poem Therī queue has no remaining activation holds. All other source, rights and coverage holds remain unchanged; wider publisher material is not approved. Physical-device, human assistive-technology and specialist recension review remain outstanding. [Queue closure and limits](../evidence/apadana/FOURTH_HELD_READINESS.json).

## Reproduction and acceptance

Run `node scripts/apadana/build.mjs --source "$APADANA_SOURCE_CHECKOUT" --check` using the exact official checkout; then source-enabled `tests/apadana-fourth.test.mjs`, `tests/apadana-fourth-client.test.mjs` and `tests/apadana-fourth-boundaries.test.mjs`. Run `scripts/web-reader-apadana-fourth-check.py` normal, `--a11y` and isolated-package `--server-dir`, retaining all four older Apadāna suites.

The new harness verifies all ten source pins, owned notes, continuations and every stanza quotation, finite drift refusals, separate preface/chapter/collection display, mobile/desktop in both themes, old saved-position refusal and private drafts/exports with zero upstream requests. Browser emulation and axe are not physical-device or human acceptance.

Require independent review, `npm run check`, smoke/evals, matching isolated package files and exact-commit CI before advancing dev. The separate 20-minute `apadanafourth` group retains all prior gates and brings configured checks to 47; configuration is not evidence of success. Main, deployment, force pushes and outreach are outside this work.
