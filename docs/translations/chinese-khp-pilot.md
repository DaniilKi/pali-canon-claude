# Chinese Khuddakapāṭha pilot assessment

**Status, 6 November 2026: structural candidates only. No Chinese translation text is imported, linked by a runtime tool, or presented as verified.** A release-specific licence choice and independent bilingual review remain open. [Issue #35](https://github.com/DaniilKi/pali-canon-claude/issues/35) remains open: even an approved four-text Chinese pilot would not meet its requirement for at least three languages.

## Exact source inspected

The official CBETA XML file is [N/N26/N26n0008.xml at commit dbdea410](https://github.com/cbeta-org/xml-p5/blob/dbdea41071e1e260ad84b72faefd4587333cf76d/N/N26/N26n0008.xml), release commit **CBETA 2026.R2** (5 September 2026). Its bytes match the supplied blob, rather than merely the current branch name:

| Property | Observed value |
|---|---|
| Git blob SHA-1 | `2384d11a0a9b88599334870800e2470adde38591` |
| SHA-256 | `0dde91f3f686dbbfc00bce93dd9be28df23bd92e9b776cf2a7ffbfa953262b04` |
| Size | 28,115 UTF-8 bytes |
| TEI document ID | `N26n0008` |
| Work title | 小誦經 |
| Translator as printed | 悟醒譯 |
| Base edition | 漢譯南傳大藏經（元亨寺版）, Yuan Heng Temple edition |
| Header publication date | `2025-01-30 02:14:01 +0800` |

The same file retrieved at the 2025.R1 commit `a43b24e84dd1093af01bcf442285b4db6bf6f92d` is **not** byte-identical, although its publication date is the same. The header date alone therefore cannot identify either the release or its applicable CC version. The header also credits CBETA's electronic version/OCR and text supplied by Ven. Zhiguang and Ven. Xiangyin. Do not infer the translator's biography, direct source language, or a different translation from these credits.

## Rights evidence and unresolved choice

The artifact itself states: “Available for non-commercial use when distributed with this header intact.” It does not name a CC version. This is affirmative conditional non-commercial-use evidence; it is not a finding that the text has no permission.

The [README in the exact release commit](https://github.com/cbeta-org/xml-p5/blob/dbdea41071e1e260ad84b72faefd4587333cf76d/README.md) directs copyright questions to `https://www.cbeta.org/copyright.php`. On inspection that address redirects to [the archived notice](https://archive2.cbeta.org/copyright.php), whose database default is CC BY-NC-SA 3.0 Taiwan. It lists the Yuan Heng Temple volumes among the base texts and acknowledges the publisher's permission. The [current notice](https://cbeta.org/copyright) instead states a CC BY-NC-SA 4.0 International default, explicitly includes the Yuan Heng Temple volumes 1–70 in its jointly open category, and lists separate exclusions. Both notices require non-profit use and preservation of substantive content, notices and version information on redistribution/excerpting.

These findings are retained separately in [the candidate manifest](../../scripts/translations/cbeta-khp-candidate.json). No CC version is assigned to this release by inference. A reviewer must establish and record the applicable release terms before redistribution, including how to carry the original header and required notices with any excerpts and machine-readable responses. Do not silently relabel the translation as MIT or choose the newer licence solely because the current website names it. No rights holder has been contacted.

CBETA's current copyright page and [FAQ](https://cbeta.org/faq) were checked for source-policy evidence. No AI opt-out was found in those inspected pages; that limited observation is not blanket AI-use approval. Its [2026 announcement](https://cbeta.org/post/29961) discusses its own AI research, which also does not approve this project. The project's [five source tests](../sources.md#how-we-choose-sources) still apply.

## Heading-based candidate boundaries

The repository's canonical IDs are **`kp1`–`kp4`**; `Khp 1`–`Khp 4` are accepted citation forms. These are work-section candidates, not word-by-word or line-by-line alignment claims.

| Candidate | VRI title | Explicit Chinese section | Complete source paragraph |
|---|---|---|---|
| `kp1` / Khp 1 | Saraṇattayaṃ | 一　三歸文 | `pN26p0001a0701` |
| `kp2` / Khp 2 | Dasasikkhāpadaṃ | 二　十戒文 | `pN26p0001a1101` |
| `kp3` / Khp 3 | Dvattiṃsākāro | 三　三十二身分 | `pN26p0002a0401` |
| `kp4` / Khp 4 | Kumārapañhā | 四　問沙彌文 | `pN26p0002a0901` |

Each candidate runs through its complete paragraph to the containing `cb:div` end, before the next numbered contents entry. The inspector requires all nine section headings in their observed order and exact candidate paragraph IDs.

- The first division contains the book title and a homage before the actual section heading, `pN26p0001a0601`. Its `lgN26p0001a0301` preface is recorded separately, not silently assigned to Khp 1 or discarded as though absent from the source.
- Khp 2's paragraph crosses the source page break into `0002a01`. A page or line cutoff would omit part of its tenth training rule. The whole paragraph must remain intact.
- Khp 3's Chinese paragraph places the brain item at the end; the bundled VRI list places it earlier. This is an observed ordering difference for a bilingual reviewer, not a correction instruction or a finding that the translation is wrong.
- Khp 4 contains anchor `nkr_note_orig_0002001`, linked to a back-of-file original note numbered `0002001`, responsibility `#resp2`. Preserve and separately label that note if redistribution is approved; do not lose it or present editorial annotation as root scripture.
- **`PTS.Khp.3` is a page reference inside section 5 (五　吉祥經), not the third text.** Sections 3 and 4 have no PTS markers of their own. Numerical page matching cannot establish the pilot mapping.

An independent qualified Chinese/Pāli reviewer must check the complete three-refuge repetitions, ten training rules, all 32 body parts, and ten questions/answers against the named Chinese source and the bundled VRI edition. The reviewer must assess brackets, notes, edition differences and complete endpoints. No SuttaCentral content is needed or permitted. No independent bilingual review has been obtained, so these candidates are not verified translations or an approved language addition.

## Repeat the structural inspection

Obtain the exact official artifact above in a local research directory, preserving its bytes. The XML is deliberately not committed or added to `server/data`.

```sh
python3 scripts/translations/inspect_cbeta_khp.py /path/to/N26n0008.xml --report cbeta-khp.report.json
node --test tests/cbeta-khp-assessment.test.mjs
```

The offline inspector checks both content hashes before parsing, requires source identity/header conditions, rejects changed or ambiguous headings/IDs/endpoints, distinguishes the PTS marker, and resolves the linked note. Its output contains metadata only, with `runtime_enabled: false`, no assigned CC licence, and bilingual review still pending. A successful structural assessment cannot approve redistribution or semantic alignment. Synthetic test fixtures contain no Chinese translation body; no external source is fetched by the tests.

Before any runtime pilot, resolve the two outstanding gates, preserve the complete original header and applicable notices, and review a complete extraction with its notes. Any later API must label the language as Traditional Chinese and retain its exact translator, source, licence and release; it must not silently substitute Chinese for English. Current runtime tools, English links, data coverage and network allowlists remain unchanged.
