# Localised guidance (machine-drafted)

> **Machine-drafted, awaiting native review.** Nothing in this folder has been checked by a native speaker yet. The English originals stay authoritative until a reviewer signs a language off.

Most Theravāda Buddhists do not read English. This folder holds drafts of the project's **guidance** (not scripture) in eight languages, so an assistant can answer in the user's language while keeping the Pāli and every citation exact. Tracking issue: [#19](https://github.com/DaniilKi/pali-canon-claude/issues/19).

Each language folder has four files:

| File | English source |
|---|---|
| `study.md` | [`skills/study/SKILL.md`](../../skills/study/SKILL.md) |
| `compare.md` | [`skills/compare/SKILL.md`](../../skills/compare/SKILL.md) |
| `pali-word.md` | [`skills/pali-word/SKILL.md`](../../skills/pali-word/SKILL.md) |
| `server-instructions.md` | the `instructions` string in [`src/server.mjs`](../../src/server.mjs) |

## Languages

| Code | Language | Status | Native reviewer |
|---|---|---|---|
| [`si`](si/) | Sinhala (සිංහල) | Machine-drafted, awaiting native review | wanted |
| [`th`](th/) | Thai (ไทย) | Machine-drafted, awaiting native review | wanted |
| [`my`](my/) | Burmese (မြန်မာ) | Machine-drafted, awaiting native review | wanted |
| [`km`](km/) | Khmer (ខ្មែរ) | Machine-drafted, awaiting native review | wanted |
| [`lo`](lo/) | Lao (ລາວ) | Machine-drafted, awaiting native review | wanted |
| [`vi`](vi/) | Vietnamese (Tiếng Việt) | Machine-drafted, awaiting native review | wanted |
| [`zh-Hans`](zh-Hans/) | Chinese, Simplified (简体中文) | Machine-drafted, awaiting native review | wanted |
| [`es`](es/) | Spanish (Español) | Machine-drafted, awaiting native review | wanted |

Issue #19 is done when at least Sinhala, Thai and Burmese have been reviewed by native speakers.

## What is never translated

- **Scripture.** No Pāli passage appears in these files, and none may be added. Passages always come from the bundled VRI text through the tools.
- **Citations** (MN 10, SN 56:11, AN 7.64 = AN 7.68, M i 55 and so on). They stay exactly as in English so they still resolve. A test ([`tests/i18n.test.mjs`](../../tests/i18n.test.mjs)) checks that every citation is present in each draft and resolves against the bundled canon.
- **Tool and parameter names** (`resolve_reference`, `translation_id`, `next_offset` and the rest), URLs, `$ARGUMENTS`, licence names (CC BY-NC-SA 4.0), source names and translator names (Ṭhānissaro Bhikkhu). The same test checks these too.
- **Pāli terms.** Keep the diacritics. A reviewer may add a familiar local spelling in brackets, but the Pāli form stays.

## The language note

Each draft ends with a short **language note** that the English skills do not have. It tells the assistant to answer in the user's language; keep Pāli words, text IDs, citations and names exactly as returned; quote published translations in their original language with attribution; and label any rendering into the user's language as its own rendering, never as a published translation. This follows the rule that translations are never silently substituted.

## How to review a language

1. Read the English source next to the draft. Check the meaning first, then natural wording and the Buddhist terms readers in your tradition expect.
2. Do not change anything listed under "What is never translated".
3. When you are satisfied, add a line under the first line of each file saying `Reviewed by a native speaker: <name or handle>, <date>.`, update the table above, and open a pull request. `npm test` must still pass.
4. Where the English is unclear or does not fit your tradition, say so in issue #19 instead of changing the meaning.

These are drafts of guidance only. They do not change what the server returns, and neither the skills nor the server load them yet.
