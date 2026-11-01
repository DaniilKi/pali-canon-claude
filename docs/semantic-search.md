# Search by meaning: measured, and deferred

Issue: [#33](https://github.com/DaniilKi/pali-canon-claude/issues/33). Status: **deferred** (November 2026). No `search_by_meaning` tool and no embedding data ship.

## In short

"Search by meaning" ([semantic search](glossary.md)) would let you ask "dealing with anger" and get texts about anger, even when they never use those words. It works by turning each text and each question into a list of numbers (an *embedding*) and finding the closest texts.

We may only store embeddings of content whose licence allows us to keep something derived from it. Today that is just the **VRI Pāli text and its Pāli titles**. The English translations (dhammatalks.org, Access to Insight) are fetched live and never stored, so they are not embedded. We have no English summaries of our own yet.

So the search would have to match an **English question to Pāli text**. We tested three small, openly licensed models on that. On 14 English questions the best one found a correct text for 3 (chance alone would give about 0.3), the other two found none, and none of the well-known answers was found. That is barely above chance in practice, so we are not shipping it. A tool that returns confident but unrelated texts would break the project's first promise: cite the real text, not a guess.

## What we measured

Sixteen questions, each with the texts that count as a correct answer, judged only from VRI titles and ids ([scripts/semantic/queries.json](../scripts/semantic/queries.json)). For example, "dealing with anger" counts MN 21 (Kakacūpamasuttaṃ), SN 7.2 (Akkosasuttaṃ), AN 7.64 (Kodhanasuttaṃ) and any text whose title contains *kodha*. Each of the 8,544 texts was embedded from its Pāli title, a full stop and then its opening text, cut to 600 characters in total (so the title counts toward the 600). A question scores a hit when a correct text is in the top 10.

| Model | Licence | Size | English questions (14): hits in top 10 | Pāli questions (2) | Notes |
|---|---|---|---|---|---|
| [potion-base-8M](https://huggingface.co/minishlab/potion-base-8M) (static, Model2Vec) | MIT | 30 MB (about 7.5 MB at 8 bits) | **3** (ranks 5, 9, 10) | 2 | The only one that could run in plain JavaScript |
| [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) | Apache-2.0 | 91 MB (23 MB 8-bit ONNX) | **0** | 2 | English only; needs a neural-network runtime |
| [paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2) (8-bit ONNX) | Apache-2.0 | 118 MB | **0** | 0 | Over 50 languages; Pāli is not one of them |

The questions used:

| English question | potion-base-8M | all-MiniLM-L6-v2 | multilingual MiniLM | Chance of a hit in the top 10 |
|---|---|---|---|---|
| dealing with anger | miss | miss | miss | 4.6% |
| mindfulness of breathing | miss | miss | miss | 0.4% |
| loving-kindness meditation | miss | miss | miss | 0.8% |
| the four noble truths | miss | miss | miss | 12.2% |
| the last days and death of the Buddha | miss | miss | miss | 0.6% |
| the body and feelings are not self | rank 9 | miss | miss | 2.7% |
| everything is burning with the fire of passion | miss | miss | miss | 0.6% |
| four foundations of mindfulness | miss | miss | miss | 0.8% |
| the highest blessings | rank 10 | miss | miss | 1.2% |
| dependent origination | miss | miss | miss | 0.4% |
| duties of a layman to parents, teachers and wife | miss | miss | miss | 0.1% |
| do not believe something just because of tradition | miss | miss | miss | 0.1% |
| the benefits of giving and generosity | miss | miss | miss | 0.8% |
| old age, sickness and death | rank 5 | miss | miss | 3.2% |

"Chance" is the probability that ten texts picked at random include a correct one. Added up over the 14 English questions, chance alone would give about 0.28 hits; the best model got 3 of 14. That is better than chance, but it still misses 11 of the 14 questions. The best model's three hits are all low in the top 10 (ranks 5, 9 and 10), and none of the well-known answers (MN 118 for breathing, SN 56.11 for the four truths, DN 16 for the Buddha's last days, Snp 1.8 for loving-kindness) appeared in any top 10. The Pāli questions ("kodha", "ānāpānassati") were found by spelling overlap, which the existing keyword search (`search_texts`) already does better and exactly.

## Why it fails

- **No model knows Pāli.** None of these models was trained on Pāli, so *kodha* and "anger" are not near each other in their number space.
- **Pāli is cut into fragments.** The models' word-piece vocabularies were not built for Pāli, so Pāli words are broken into pieces made for other languages. The English-only models also strip diacritics, so *saṃ* and *sam* merge.
- **Nothing English to match against.** The texts we may embed are all Pāli; the English that would help (translations) may not be stored.

## Size and runtime

The npm package has no runtime dependencies and ships the server as one JavaScript file of about 5.8 MB ([D21](decisions.md)). Anything that needs a runtime library therefore does not fit as things stand.

| Part | Size | Fits with no runtime dependencies (D21)? |
|---|---|---|
| Text vectors: 8,544 × 384 numbers at 1 byte | 3.3 MB | yes, as a data file |
| Text vectors: 8,544 × 256 numbers at 1 byte | 2.2 MB | yes, as a data file |
| Query model, static (potion-base-8M at 8 bits) | about 7.5 MB plus a 0.7 MB tokenizer | yes: a lookup table averaged in plain JavaScript |
| Query model, small transformer (MiniLM 8-bit ONNX) | 23 MB | no: needs a neural-network runtime |
| Query model, multilingual (8-bit ONNX) | 118 MB | no: needs a neural-network runtime |
| Runtime for transformer models: `onnxruntime-node` 1.31.1 (MIT) | 308 MB unpacked on npm | no: a runtime dependency, and native code |
| Runtime: `onnxruntime-web` 1.31.1 (MIT, WebAssembly) | 151 MB unpacked on npm | no: a runtime dependency |

So only a static model could ship, and it is also the weakest at meaning.

## Licences checked

- **VRI Pāli**: VRI's terms say the text is freely available for non-commercial use with attribution. They say nothing about derived data such as vectors. This project's reading is that vectors would be allowed on the same terms, non-commercially and with VRI credited with every result; that is our interpretation, not a statement by VRI.
- **dhammatalks.org and Access to Insight**: fetched live and never stored by this project, so not embedded.
- **Models**: MIT (potion-base-8M) and Apache-2.0 (both MiniLM models) would allow shipping, with their notices added to THIRD_PARTY.md.

## What to use instead

- Ask in Pāli terms. The AI you are talking to can turn "dealing with anger" into *kodha*, *akkosa* or *khanti* and call `search_texts`, which matches words exactly and shows where.
- The planned [topic index (#30)](https://github.com/DaniilKi/pali-canon-claude/issues/30) and [Dhamma lists index (#31)](https://github.com/DaniilKi/pali-canon-claude/issues/31) are hand-checked bridges from English concepts to texts. They are the better first step.

## When to revisit

Reopen this when any of these changes:

1. We have English text we may store: our own summaries or topic entries, or openly licensed translations bundled under [#34](https://github.com/DaniilKi/pali-canon-claude/issues/34) whose licence allows derived data.
2. A small, openly licensed model is shown to understand Pāli.
3. A query model good enough to pass the evaluation can run in plain JavaScript, with no runtime dependency ([D21](decisions.md)).

Any shipped version must label results as approximate matches by meaning, return VRI attribution with every result, and keep the evaluation in this file passing well above chance.

## Reproduce

The script reads the bundled canon and the question set. Download these files by hand from Hugging Face into one models folder, keeping the layout `<models>/<org>/<name>/` (each download is under 200 MB; you do not need the other files in the repositories, such as the 471 MB `model.safetensors` of the multilingual model):

| Script name | Folder | Files |
|---|---|---|
| `potion` | `minishlab/potion-base-8M/` | `model.safetensors` (30 MB), `tokenizer.json` |
| `minilm` | `sentence-transformers/all-MiniLM-L6-v2/` | `model.safetensors` (91 MB), `tokenizer.json` |
| `multi` | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2/` | `onnx/model_qint8_avx512.onnx` (118 MB), `tokenizer.json` |

```sh
pip install numpy tokenizers safetensors onnxruntime   # torch + transformers for minilm
python -I scripts/semantic/eval_embeddings.py <models folder> potion minilm multi
```

`tests/semantic.test.mjs` checks that every citation in the question set resolves to the stated VRI title, recomputes the "Chance" column from the question set and the bundled canon and compares it with the table above, and checks that no embedding data or semantic tool has been shipped by accident.
