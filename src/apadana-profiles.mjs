/** Ten independently reviewed whole-unit mappings only. No translated bodies or footnotes. */
export const APADANA_COMMIT = 'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4';
export const APADANA_VRI_COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070';
export const APADANA_BASE = 'https://apadanatranslation.com';
export const APADANA_LICENSE = 'CC BY-NC-SA 4.0';
export const APADANA_LICENSE_URL = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';
export const APADANA_TRANSLATOR = 'Jonathan S. Walters';
const deepFreeze = value => { if (value && typeof value === 'object') { for (const child of Object.values(value)) deepFreeze(child); Object.freeze(value); } return value; };
export const APADANA_PROFILES = deepFreeze({
  "thi-ap1": {
    "id": "thi-ap1",
    "poem": 1,
    "verses": [
      1,
      19
    ],
    "note_count": 22,
    "source": "apadana",
    "path": "/text/chapter-4/poem-001/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-001/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-001.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Sumedhā",
    "reference": "Therī Apadāna 1; publisher verses 1–19",
    "raw_sha256": "991b5f4b2b56a5c501a5360032339619274c6340e844c498d7e0c9416e97e855",
    "body_sha256": "e1deb7546c3710c718fe032d81f9afe8d7a16c608fca9d765e5bda2a85c995d2",
    "notes_sha256": "4e26b19bcda68d059f70a2989ec43b1f4cc12ffba6a7274f25232db13d81c821",
    "paratext_sha256": "226030c23cf0f56a7ff463f39a2fa26d543fe8526b98d482f66a722b80302535",
    "root_sha256": "4417e8981c281ed284efb907df388f95b50352a4cfd9ac2141c819250a642f82",
    "mapping_notes": [
      "Publisher follows PTS/BJTS readings, not a line-aligned translation of the bundled VRI recension. VRI peyyāla remains abbreviated; publisher expands repeated stanzas.",
      "Invocation and chapter preface are publisher paratext, not substantive poem stanzas.",
      "Publisher verse 2's main wording does not include the additional thousandfold count present in VRI thi-ap1/7; translator note 6 records the corresponding BJTS count."
    ]
  },
  "thi-ap2": {
    "id": "thi-ap2",
    "poem": 2,
    "verses": [
      20,
      25
    ],
    "note_count": 6,
    "source": "apadana",
    "path": "/text/chapter-4/poem-002/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-002/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-002.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Mekhalādāyikā",
    "reference": "Therī Apadāna 2; publisher verses 20–25",
    "raw_sha256": "eff753b7c329e57894f6e601e6fc3941ffd2b361b2c2d7bdb1e2dc76363fb3d1",
    "body_sha256": "11c3144cff01460fed4fd759f9805d657da50b06bf1a89cb8b080bdac65d6f4a",
    "notes_sha256": "320a107958260e7f9528a6fef39e94120d6c9ca509056067efcf1360c36d7045",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "21c0602267dc7fb2b47ea9b057233b1679778ced388c30cc057d875bf4df09b2",
    "mapping_notes": [
      "Publisher follows PTS/BJTS readings, not a line-aligned translation of the bundled VRI recension. VRI peyyāla remains abbreviated; publisher expands repeated stanzas."
    ]
  },
  "thi-ap3": {
    "id": "thi-ap3",
    "poem": 3,
    "verses": [
      26,
      30
    ],
    "note_count": 2,
    "source": "apadana",
    "path": "/text/chapter-4/poem-003/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-003/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-003.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Maṇḍapadāyikā",
    "reference": "Therī Apadāna 3; publisher verses 26–30",
    "raw_sha256": "917d69a2f1e064ac2bbcf29373214844af5cae023960c551934b7c47a7c630ad",
    "body_sha256": "1a8ff14e72fa1771acd59d6207cd5403421f36ab7aa9a85bfe0d8fadd06a69d9",
    "notes_sha256": "c2a15194f466a8f929aa4ccb34643e6e63957722790339ae19dfb48bf7aaecec",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "a839c51970c212fc5d2ecc8045f059b599ab2a9b1604841fb0a8146e77a1c26a",
    "mapping_notes": [
      "Publisher follows PTS/BJTS readings, not a line-aligned translation of the bundled VRI recension. VRI peyyāla remains abbreviated; publisher expands repeated stanzas.",
      "Verse26: publisher robes vs VRI three robes."
    ]
  },
  "thi-ap4": {
    "id": "thi-ap4",
    "poem": 4,
    "verses": [
      31,
      36
    ],
    "note_count": 1,
    "source": "apadana",
    "path": "/text/chapter-4/poem-004/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-004/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-004.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Saṅkamanattā",
    "reference": "Therī Apadāna 4; publisher verses 31–36",
    "raw_sha256": "c059f6361fa2b6f98e599baa84721e615c63f5052a60e0b11d304b89a7c4bc5f",
    "body_sha256": "ae1326cf8ebab5a14db40b108dc40085e2691a6d63ac7c48b2c8ae6340a69e19",
    "notes_sha256": "bc9e1cbe2bb2972a044360e44587c12a089131da087e70897207fa7dbb671bdb",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "21bf7bb0a2998c44df1b93c5fa421397060d441a063d9df15674904acf7f4ff8",
    "mapping_notes": [
      "Publisher follows PTS/BJTS readings, not a line-aligned translation of the bundled VRI recension. VRI peyyāla remains abbreviated; publisher expands repeated stanzas.",
      "Publisher title Saṅkamanattā differs from VRI Saṅkamanatthā; both source spellings remain unchanged. Publisher verse 31 names Koṇḍañña where the VRI main reading names Vipassī; a VRI variant supports Koṇḍañña.",
      "The paired 4/5 ownership repair restores poem 4 verses 31–36 and poem 5 verses 37–45. Previously saved Pāli locations require fresh source review."
    ],
    "index_revision": "apadana-theri45-v1"
  },
  "thi-ap5": {
    "id": "thi-ap5",
    "poem": 5,
    "verses": [
      37,
      45
    ],
    "note_count": 7,
    "source": "apadana",
    "path": "/text/chapter-4/poem-005/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-005/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-005.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Tīṇinaḷamālikā",
    "reference": "Therī Apadāna 5; publisher verses 37–45",
    "raw_sha256": "8f91f8c76988b7367fbbdf60245983dfc156f315095e11c26dfd1c33f5f46288",
    "body_sha256": "ba73861917517774a6b76506bf54bdcd94d0abe989c5fa51b33ea3e6309c30f5",
    "notes_sha256": "d1d133a8e25163d7ca2d883c77dcd1a5040ce34b936d45c5531c3c0040b25108",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "bc87b06e6c4713fe575053f88a8c7efe1a4bac017e6b830dfd371b14eeffcbaf",
    "mapping_notes": [
      "Publisher follows PTS/BJTS readings, not a line-aligned translation of the bundled VRI recension. VRI peyyāla remains abbreviated; publisher expands repeated stanzas.",
      "Publisher verse labels are preserved exactly: 37, 38, 39-40, 40, 42, 41, 43, 44, 45. Local stanzas 1–9 remain in publisher order, including the overlap and reversed 42/41 labels. They are not a line alignment to VRI.",
      "Publisher stanza 3 labelled 39-40 combines VRI 39 and the opening of 40; stanza 4 labelled 40 continues that material. Publisher label 42 corresponds broadly to VRI 41, label 41 to VRI 42, whose worship wording also differs. Translator notes 1–7 remain separately owned by this poem.",
      "The paired 4/5 ownership repair restores the Naḷamālikā heading and verse 37 to poem 5; it does not rewrite publisher numbering. Previously saved Pāli locations require fresh source review."
    ],
    "index_revision": "apadana-theri45-v1",
    "publisher_verse_labels": [
      "37",
      "38",
      "39-40",
      "40",
      "42",
      "41",
      "43",
      "44",
      "45"
    ]
  },
  "thi-ap6": {
    "id": "thi-ap6",
    "poem": 6,
    "verses": [
      46,
      59
    ],
    "note_count": 8,
    "source": "apadana",
    "path": "/text/chapter-4/poem-006/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-006/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-006.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Ekapiṇḍadāyikā",
    "reference": "Therī Apadāna 6; publisher verses 46–59",
    "raw_sha256": "638655719b428169df431f96decaf6edc144f24b180a5b0c6bfc8463532f18b2",
    "body_sha256": "ab27b118990068d04fa913b4008300439a2ea21af612d15973a269f8015ecc49",
    "notes_sha256": "254463635ff0d36277c038cf3cea249e190438482f5cc1cfdf549a6c0aca3b48",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "b43d3e52f25dded0a3328f13892ef085f619114ea9bf6f90534b3d8fc2454878",
    "mapping_notes": [
      "Publisher follows PTS/BJTS readings, not a line-aligned translation of the bundled VRI recension. VRI peyyāla remains abbreviated; publisher expands repeated stanzas.",
      "Verse51: publisher blue lotus/mahānela vs VRI pair of cloths; translator note6 records the edition difference."
    ]
  },
  "thi-ap7": {
    "id": "thi-ap7",
    "poem": 7,
    "verses": [
      60,
      70
    ],
    "note_count": 4,
    "source": "apadana",
    "path": "/text/chapter-4/poem-007/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-007/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-007.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Kaṭacchubhikkhadāyikā",
    "reference": "Therī Apadāna 7; publisher verses 60–70",
    "raw_sha256": "5d6b59e89a412da94f71d43b9c580431e6933f58624048c1ba2f1d48e0021a35",
    "body_sha256": "8591cbb67ec83420320cda0cdc4b3eac149a2ac120b3382e059f1a92cb983fb0",
    "notes_sha256": "db3b2dbf2de356bf961a7e80c7e0364c437898e35b493a546ec17b0c8b8789c2",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "9896a9cead5994e6ef49ece34dc30dd03e42c7b5c81f39dca8079baef7877108",
    "mapping_notes": [
      "Publisher follows PTS/BJTS readings, not a line-aligned translation of the bundled VRI recension. VRI peyyāla remains abbreviated; publisher expands repeated stanzas."
    ]
  },
  "thi-ap8": {
    "id": "thi-ap8",
    "poem": 8,
    "verses": [
      71,
      90
    ],
    "note_count": 14,
    "source": "apadana",
    "path": "/text/chapter-4/poem-008/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-008/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-008.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Sattuppalamālikāya",
    "reference": "Therī Apadāna 8; publisher verses 71–90",
    "raw_sha256": "2cc66fe4525f8482ecd138b67984b1665371526bc004485bcfe44e37aa55d79c",
    "body_sha256": "46db0ce32894b40c193f8b5b5b83f42885a7e3733f05f92b1280fe181abd14d3",
    "notes_sha256": "867890223e60963d78ec4a04b92df764470132f0711f38b703c7a20ce6b6d1ea",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "f5b4ead53dafba4dcf409c20c8baeca54ff3df56306932813ead09a02c50a782",
    "mapping_notes": [
      "Publisher follows PTS/BJTS readings, not a line-aligned translation of the bundled VRI recension. VRI peyyāla remains abbreviated; publisher expands repeated stanzas.",
      "Verse71: publisher follows BJTS journey reading; VRI root differs.",
      "Publisher verse 83 describes freedom from bad rebirth; VRI thi-ap8/14 instead has dubbaṇṇiyaṃ, concerning unattractive appearance. The publisher's edition-specific wording and the VRI reading are retained separately."
    ]
  },
  "thi-ap9": {
    "id": "thi-ap9",
    "poem": 9,
    "verses": [
      91,
      115
    ],
    "note_count": 14,
    "source": "apadana",
    "path": "/text/chapter-4/poem-009/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-009/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-009.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Pañcadīpikā",
    "reference": "Therī Apadāna 9; publisher verses 91–115",
    "raw_sha256": "739f3c437aca5774b48d8f6bf25563301dde919bcf25a8ce44693243d8594016",
    "body_sha256": "df06b3d79c75b5a60039e0397aa6ff360bbdcbd540644698061ebf178818865c",
    "notes_sha256": "aaf80c212d4fb79af81b8a6ace856009ef4457dc14003f4c301b654b8ea78d6e",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "e0ffdb846c3174017d22ef7cdd3095b4af1391d80694b90ea0b8f8fd13fb9ce0",
    "mapping_notes": [
      "Publisher follows PTS/BJTS readings, not a line-aligned translation of the bundled VRI recension. VRI peyyāla remains abbreviated; publisher expands repeated stanzas.",
      "Verse99: publisher PTS hundred-by-sixty leagues vs VRI/BJTS sixty-by-thirty; translator note8 preserves the difference.",
      "Publisher verse 101 depicts standing and looking eastward; VRI thi-ap9/12 instead describes sitting while turned away (parammukhā nisīditvā). No posture or direction alignment is asserted.",
      "Publisher verse 102 concerns deeds done well or badly; VRI thi-ap9/13 instead has good and bad destinations (sugataduggate). Translator note 11 records the BJTS destination reading and remains separate from the verse."
    ]
  },
  "thi-ap10": {
    "id": "thi-ap10",
    "poem": 10,
    "verses": [
      116,
      130
    ],
    "note_count": 7,
    "source": "apadana",
    "path": "/text/chapter-4/poem-010/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-010/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-010.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Udakadāyikā",
    "reference": "Therī Apadāna 10; publisher verses 116–130",
    "raw_sha256": "2696db2cc5d8cc1271c611864e5f3a687e97af7208e80472a4dbdfbc257a6af3",
    "body_sha256": "11892ab91ea2091ba9568089a417abf764129a20d4393d3fbc7036b82919f47f",
    "notes_sha256": "b44ff0d544bca0de72278f0cf4e8fbcacd466cdd5d17bfc1b8a2a4fe9351b0dd",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "d2b542bdf76f31f4a5c46d56ae2d43e8c612d46902bb6d9725e034ec2e4229ce",
    "mapping_notes": [
      "Publisher follows PTS/BJTS readings, not a line-aligned translation of the bundled VRI recension. VRI peyyāla remains abbreviated; publisher expands repeated stanzas.",
      "Publisher verse 122 describes a bad road where VRI dumagge describes a tree top; publisher verse 127 describes karma generally where VRI specifies water-giving. Neither reading is substituted for the other.",
      "The chapter summary and its translator note 8 are separate canonical chapter paratext, not poem 10 stanzas or poem notes. Publisher summary counts 118 stanzas while VRI counts 130; their colophon/summary order also differs. Original wording, order and numbers remain unchanged."
    ],
    "chapter_summary": {
      "kind": "canonical_chapter_summary",
      "label": "First Therī Apadāna chapter summary",
      "parent_id": "thi-ap10",
      "first_ref": "thi-ap10/19",
      "last_ref": "thi-ap10/22",
      "root_start": 6930,
      "root_end": 6936,
      "root_sha256": "37490df4056522cb2cf00a3e3372fa3730dd2f49979c95b021bf6ee6e76a3057",
      "body_sha256": "652008e55afc3343b94eb3a5042a8ad9874b4904aedd13126555e84798abc0dd",
      "notes_sha256": "7e43cbed8c710d9a0458f2e6d8919f3f79afc983a37c0b36dd4e4626777cafc5",
      "note_numbers": [
        8
      ]
    }
  }
});
export const APADANA_RIGHTS = deepFreeze([
  {
    "path": "LICENSE.md",
    "sha256": "66eea18fe8cb99e0d178d838a4932be0d3af8a6f844e933a8bbb0054e22f2592"
  },
  {
    "path": "src/_pages/about.md",
    "sha256": "17d8029419cd7b4c7f9e7f88d0127141d2425b3fe30516888b389ce7521f1352"
  },
  {
    "path": "src/_includes/site/footer.njk",
    "sha256": "08a7d4a0c3a9841afa38a8d98aa563e0ddedc6228f66e86b9a49d564aba26fd4"
  },
  {
    "path": "src/_includes/layouts/epub-metadata.xml",
    "sha256": "1a6320b1580b76112c63bd557e419d5816b410197da666444e9d412327430b2f"
  },
  {
    "path": "src/_data/site.json",
    "sha256": "6b4b5b5661b1bfb35cee0f207066fd6941aa042d6377993b02c77db677319efa"
  },
  {
    "path": "src/_poems/_poems.json",
    "sha256": "7c0d9a568ff9c495c89fb3ae13397ff71e8e1d678c221cca5966c9adc886cf22"
  }
]);
export const isApadanaRawUrl = value => Object.values(APADANA_PROFILES).some(p => p.raw_url === String(value));
