# Topics and numbered lists

People often look things up by subject ("anger", "emptiness") or by a numbered list ("the five hindrances"), not by citation. Three offline tools help with that.

| Tool | What it gives you |
|---|---|
| `topic(name)` | The texts Access to Insight's index gives for a topic, each with its canon ID, Pāli title and PTS page |
| `list_topics(query?, index?)` | Browse or search the 472 topics (173 subject topics, 299 numbered ones such as "Hindrances (5)") |
| `dhamma_list(name?)` | A standard numbered list: its members in Pāli, a short English gloss for each, and the passage that sets it out. With no name, every list |

## Where the topics come from

The topics are Access to Insight's [General Index](https://www.accesstoinsight.org/index-subject.html) and [Numerical Index](https://www.accesstoinsight.org/index-number.html), made by its editors over many years. Both pages are licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), and every result says so. We keep only the topic names, the cross-references and the links, read from a fixed version of the site's [GitHub repository](https://github.com/bcbsit/ati) so the data does not change underneath us. `scripts/build_topics.mjs` rebuilds the file.

Each link is turned into a canon ID (such as `sn22.59`) like this:

- If the bundled translation index already ties that exact Access to Insight page to a text, that text is used.
- For DN, MN, the Dhammapada, Khuddakapāṭha, Itivuttaka and Udāna, whose numbers are the same in every scheme, the link's own citation is used, but only when the page address agrees with it.
- Saṃyutta and Aṅguttara texts are never matched by number alone, because Access to Insight numbers some of them differently ([citations](citations.md)). When the numbers differ, the result says so (`numbering_note`).

119 links could not be matched safely and were left out. A topic is an index entry, not a ruling on what the texts mean. Essays listed under `further_reading` are commentary, not scripture.

## The numbered lists

37 lists, including the four noble truths, the three characteristics, the five aggregates, the five hindrances, the seven factors of awakening, the noble eightfold path, the thirty-seven aids to awakening and their seven groups, the ten fetters, the twelve links of dependent origination, the four jhānas and formless attainments, the brahmavihāras, the precepts and the ten pāramīs.

For each list:

- **Members in Pāli** are the words of the defining passage in the VRI edition. A test checks every member name against the bundled text of every passage cited as defining the list, so a list can never cite a passage that does not contain it.
- **English glosses** are short labels written for this index. They are glosses, not translations: quote the passage itself (`get_text`) or a named translation (`get_translation`).
- **Status** says how old the list is. `canonical`: the suttas give the list. `canonical-later-name`: the suttas give the members together, but the name or count is later (the "three characteristics", the "thirty-seven" aids). `later`: not given as a set in the four main Nikāyas. The ten pāramīs are marked `later`: they are set out in the Buddhavaṃsa (Bv 2), a late book, and developed in the commentaries.

## Not included yet

Word families from the [Digital Pāḷi Dictionary](https://www.dpdict.net/) would add many more topics, but they need the full DPD database (several hundred megabytes). They wait for the offline dictionary ([#22](https://github.com/DaniilKi/pali-canon-claude/issues/22)).
