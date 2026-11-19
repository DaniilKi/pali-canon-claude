/** Twenty independently reviewed publisher-edition whole-poem mappings only. No translated bodies or footnotes. */
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
  },
  "thi-ap11": {
    "id": "thi-ap11",
    "poem": 11,
    "verses": [
      131,
      150
    ],
    "root_verses": [
      1,
      21
    ],
    "note_count": 6,
    "note_numbers": [
      1,
      2,
      3,
      4,
      5,
      6
    ],
    "source": "apadana",
    "path": "/text/chapter-4/poem-011/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-011/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-011.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Ekūposathikā",
    "reference": "Therī Apadāna 11; complete publisher-edition poem; original publisher numbering retained",
    "raw_sha256": "73d6881ddc2554bc4a0ed3433eb8b76d2a17f8a60a8233d0d178c6a7b276a8e5",
    "body_sha256": "82b4b8d0d958c21c889b04b5f0eb84ed9daa8ead711c81f8d8962b1d6c395095",
    "notes_sha256": "44a57580db2d21a99ffd9be0ba261ecb4b02a309b2a92f40a84dd7daa5318d2a",
    "paratext_sha256": "82c8d817b70123bd81092f976be1ab27f8a11a85e5b6f0254f4d92dd8405dd4a",
    "root_sha256": "164aa615f8ae1aaeef438d86c0502856fa58c46f9c3f0e9882fcefc8ccfdc16c",
    "stanza_layout": [
      {
        "local_label": "1",
        "publisher_label": "131",
        "suffix": "(1) [131]",
        "lines": 4
      },
      {
        "local_label": "2",
        "publisher_label": "132",
        "suffix": "(2) [132]",
        "lines": 4
      },
      {
        "local_label": "3",
        "publisher_label": "133",
        "suffix": "(3) [133]",
        "lines": 4
      },
      {
        "local_label": "4",
        "publisher_label": "134",
        "suffix": "(4) [134]",
        "lines": 4
      },
      {
        "local_label": "5",
        "publisher_label": "135",
        "suffix": "(5) [135]",
        "lines": 4
      },
      {
        "local_label": "6",
        "publisher_label": "136",
        "suffix": "(6) [136]",
        "lines": 4
      },
      {
        "local_label": "7",
        "publisher_label": "137",
        "suffix": "(7) [137]",
        "lines": 4
      },
      {
        "local_label": "8",
        "publisher_label": "138",
        "suffix": "(8) [138]",
        "lines": 4
      },
      {
        "local_label": "9",
        "publisher_label": "139",
        "suffix": "(9) [139]",
        "lines": 4
      },
      {
        "local_label": "10",
        "publisher_label": "140",
        "suffix": "(10) [140]",
        "lines": 4
      },
      {
        "local_label": "11",
        "publisher_label": "141",
        "suffix": "(11) [141]",
        "lines": 4
      },
      {
        "local_label": "12",
        "publisher_label": "142",
        "suffix": "(12) [142]",
        "lines": 4
      },
      {
        "local_label": "13",
        "publisher_label": "143",
        "suffix": "(13) [143]",
        "lines": 4
      },
      {
        "local_label": "14",
        "publisher_label": "144",
        "suffix": "(14) [144]",
        "lines": 4
      },
      {
        "local_label": "15",
        "publisher_label": "145",
        "suffix": "(15) [145]",
        "lines": 4
      },
      {
        "local_label": "16",
        "publisher_label": "146",
        "suffix": "(16) [146]",
        "lines": 4
      },
      {
        "local_label": "17",
        "publisher_label": "147",
        "suffix": "(17) [147]",
        "lines": 4
      },
      {
        "local_label": "18",
        "publisher_label": "148",
        "suffix": "(18) [148]",
        "lines": 4
      },
      {
        "local_label": "19",
        "publisher_label": "149",
        "suffix": "(19) [149]",
        "lines": 4
      },
      {
        "local_label": "20",
        "publisher_label": "150",
        "suffix": "(20) [150]",
        "lines": 4
      }
    ],
    "mapping_notes": [
      "Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Retain the independent VRI root and all explicit recension differences; no line alignment or missing words are inferred.",
      "Publisher complete 20-stanza poem labels131–150 vs VRI21stanzas1–21; VRI19 second kilesā refrain has no separate publisher stanza. This is complete publisher edition, not line-complete VRI.",
      "Publisher146 attainment at eighth month differs from VRI16 before half a month. Do not correct either.",
      "Chapter heading is publisher preface outside poem stanza/quotation evidence."
    ]
  },
  "thi-ap12": {
    "id": "thi-ap12",
    "poem": 12,
    "verses": [
      151,
      158
    ],
    "root_verses": [
      22,
      29
    ],
    "note_count": 1,
    "note_numbers": [
      1
    ],
    "source": "apadana",
    "path": "/text/chapter-4/poem-012/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-012/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-012.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Salalapupphikā",
    "reference": "Therī Apadāna 12; complete publisher-edition poem; original publisher numbering retained",
    "raw_sha256": "644b0b233faca1f34be5137e2cbbb770f5f7701f9fd205f09185a80879cb58c4",
    "body_sha256": "de1dc7f05a6f97c0d3f0a04f97859af4041f2a8ddea95e2b611b3fe587c5c04d",
    "notes_sha256": "cef930ded8b688cf28b2e8da561b5cfa8a28fcbfc939f0fe6550524f98d004a3",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "2337078d99acd9c3b912ac2106801d7d24cb9294ec8043c1fbe4928fc7a5e103",
    "stanza_layout": [
      {
        "local_label": "1",
        "publisher_label": "151",
        "suffix": "(1) [151]",
        "lines": 4
      },
      {
        "local_label": "2",
        "publisher_label": "152",
        "suffix": "(2) [152]",
        "lines": 4
      },
      {
        "local_label": "3",
        "publisher_label": "153",
        "suffix": "(3) [153]",
        "lines": 4
      },
      {
        "local_label": "4",
        "publisher_label": "154",
        "suffix": "(4) [154]",
        "lines": 4
      },
      {
        "local_label": "5",
        "publisher_label": "155",
        "suffix": "(5) [155]",
        "lines": 4
      },
      {
        "local_label": "6",
        "publisher_label": "156",
        "suffix": "(6) [156]",
        "lines": 4
      },
      {
        "local_label": "7",
        "publisher_label": "157",
        "suffix": "(7) [157]",
        "lines": 4
      },
      {
        "local_label": "8",
        "publisher_label": "158",
        "suffix": "(8) [158]",
        "lines": 4
      }
    ],
    "mapping_notes": [
      "Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Retain the independent VRI root and all explicit recension differences; no line alignment or missing words are inferred.",
      "Publisher Salalapupphikā vs VRI Saḷalapupphikā and source note1 PTS spelling; preserve title spelling.",
      "Eight publisher stanzas151–158 correspond to VRI22–29 as a subject, not line alignment."
    ]
  },
  "thi-ap13": {
    "id": "thi-ap13",
    "poem": 13,
    "verses": [
      159,
      165
    ],
    "root_verses": [
      30,
      36
    ],
    "note_count": 2,
    "note_numbers": [
      1,
      2
    ],
    "source": "apadana",
    "path": "/text/chapter-4/poem-013/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-013/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-013.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Modakadāyikā",
    "reference": "Therī Apadāna 13; complete publisher-edition poem; original publisher numbering retained",
    "raw_sha256": "86d93fbcc8a5bfa8658699cac30831749642f9016a9d73ce2befee1982b70c36",
    "body_sha256": "d10795670fcfe35c8bd0b507d95b9266b7bcbe588022ae93e403f3169e749706",
    "notes_sha256": "2c31bd5e9461d7d3a196f8d3fc77aeedcd6328d6a0b05a5cf882601ff53b9477",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "2d6f846b1a513cc8e9e728a61d9a40492d0cb5e86911ab45904c9e169b23be79",
    "stanza_layout": [
      {
        "local_label": "1",
        "publisher_label": "159",
        "suffix": "(1) [159]",
        "lines": 4
      },
      {
        "local_label": "2",
        "publisher_label": "160",
        "suffix": "(2) [160]",
        "lines": 4
      },
      {
        "local_label": "3",
        "publisher_label": "161",
        "suffix": "(3) [161]",
        "lines": 4
      },
      {
        "local_label": "4",
        "publisher_label": "162",
        "suffix": "(4) [162]",
        "lines": 4
      },
      {
        "local_label": "5",
        "publisher_label": "163",
        "suffix": "(5) [163]",
        "lines": 4
      },
      {
        "local_label": "6",
        "publisher_label": "164",
        "suffix": "(6) [164]",
        "lines": 4
      },
      {
        "local_label": "7",
        "publisher_label": "165",
        "suffix": "(7) [165]",
        "lines": 4
      }
    ],
    "mapping_notes": [
      "Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Retain the independent VRI root and all explicit recension differences; no line alignment or missing words are inferred.",
      "Publisher heading Modakadāyikā; note2 on spoken colophon records PTS Timodakadāyikā. Retain note2 with colophon and do not silently rename.",
      "Publisher159 wages/water-fetcher follows its edition; VRI30 preserves alternative water-carrier readings."
    ]
  },
  "thi-ap14": {
    "id": "thi-ap14",
    "poem": 14,
    "verses": [
      166,
      189
    ],
    "root_verses": [
      37,
      60
    ],
    "note_count": 11,
    "note_numbers": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11
    ],
    "source": "apadana",
    "path": "/text/chapter-4/poem-014/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-014/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-014.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Ekāsanadāyikā",
    "reference": "Therī Apadāna 14; complete publisher-edition poem; original publisher numbering retained",
    "raw_sha256": "ad3e984cd8feac560d92dc27d74266f9d925d29c72f3806d88ac618ec345685c",
    "body_sha256": "7a81c5fc934587d2be7453f9b1989ee17b405aadab8e74c9a069fcb439c4ec53",
    "notes_sha256": "b3bab216e6ad0f8fca9d4bacf153b1aa20581969c60eaff7bf01874d9791606f",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "9a69373d3af38c4a7b8cf2b77774d2d1fa10a3b9349bb2d3a710eb8c04cfeb72",
    "stanza_layout": [
      {
        "local_label": "1",
        "publisher_label": "166",
        "suffix": "(1) [166]",
        "lines": 4
      },
      {
        "local_label": "2",
        "publisher_label": "167",
        "suffix": "(2) [167]",
        "lines": 4
      },
      {
        "local_label": "3",
        "publisher_label": "168",
        "suffix": "(3) [168]",
        "lines": 4
      },
      {
        "local_label": "4",
        "publisher_label": "169",
        "suffix": "(4) [169]",
        "lines": 4
      },
      {
        "local_label": "5",
        "publisher_label": "170",
        "suffix": "(5) [170]",
        "lines": 4
      },
      {
        "local_label": "6",
        "publisher_label": "171",
        "suffix": "(6) [171]",
        "lines": 4
      },
      {
        "local_label": "7",
        "publisher_label": "172",
        "suffix": "(7) [172]",
        "lines": 4
      },
      {
        "local_label": "8",
        "publisher_label": "173",
        "suffix": "(8) [173]",
        "lines": 4
      },
      {
        "local_label": "9",
        "publisher_label": "174",
        "suffix": "(9) [174]",
        "lines": 4
      },
      {
        "local_label": "10",
        "publisher_label": "175",
        "suffix": "(10) [175]",
        "lines": 4
      },
      {
        "local_label": "11",
        "publisher_label": "176",
        "suffix": "(11) [176]",
        "lines": 4
      },
      {
        "local_label": "12",
        "publisher_label": "177",
        "suffix": "(12) [177]",
        "lines": 4
      },
      {
        "local_label": "13",
        "publisher_label": "178",
        "suffix": "(13) [178]",
        "lines": 4
      },
      {
        "local_label": "14",
        "publisher_label": "179",
        "suffix": "(14) [179]",
        "lines": 4
      },
      {
        "local_label": "15",
        "publisher_label": "180",
        "suffix": "(15) [180]",
        "lines": 4
      },
      {
        "local_label": "16",
        "publisher_label": "181",
        "suffix": "(16) [181]",
        "lines": 4
      },
      {
        "local_label": "17",
        "publisher_label": "182",
        "suffix": "(17) [182]",
        "lines": 4
      },
      {
        "local_label": "18",
        "publisher_label": "183",
        "suffix": "(18) [183]",
        "lines": 4
      },
      {
        "local_label": "19",
        "publisher_label": "184",
        "suffix": "(19) [184]",
        "lines": 4
      },
      {
        "local_label": "20",
        "publisher_label": "185",
        "suffix": "(20) [185]",
        "lines": 4
      },
      {
        "local_label": "21",
        "publisher_label": "186",
        "suffix": "(21) [186]",
        "lines": 4
      },
      {
        "local_label": "22",
        "publisher_label": "187",
        "suffix": "(22) [187]",
        "lines": 4
      },
      {
        "local_label": "23",
        "publisher_label": "188",
        "suffix": "(23) [188]",
        "lines": 4
      },
      {
        "local_label": "24",
        "publisher_label": "189",
        "suffix": "(24) [189]",
        "lines": 4
      }
    ],
    "mapping_notes": [
      "Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Retain the independent VRI root and all explicit recension differences; no line alignment or missing words are inferred.",
      "Publisher166 garland-maker follows mālikā variant; VRI37 main bālikā girl retained.",
      "Publisher174 has gold/silver couches; VRI45 gold/gem couches.",
      "Publisher seat/garments/servant readings and original11notes, including source note9 attributed published personal communication, remain Walters editorial material, not scripture."
    ]
  },
  "thi-ap15": {
    "id": "thi-ap15",
    "poem": 15,
    "verses": [
      190,
      214
    ],
    "root_verses": [
      61,
      85
    ],
    "note_count": 8,
    "note_numbers": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8
    ],
    "source": "apadana",
    "path": "/text/chapter-4/poem-015/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-015/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-015.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Pañcadīpikā",
    "reference": "Therī Apadāna 15; complete publisher-edition poem; original publisher numbering retained",
    "raw_sha256": "82c0f4fac1a60ed18c850ae3849e99234d20bc986c16c1de1a38a82fd61cfbb6",
    "body_sha256": "b55552269aec0ac7349e5212c825c81458d47321b2f567ac5e3943e6dff29a29",
    "notes_sha256": "14bb482c913ed61d83fba45962dc5af6ee543b1a2f10ca6a8f0eab05ffbc00e4",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "315579ea2da355a265b62145a875ffe46ae56bbbaf9aaa0657dd735fd3010459",
    "stanza_layout": [
      {
        "local_label": "1",
        "publisher_label": "190",
        "suffix": "(1) [190]",
        "lines": 4
      },
      {
        "local_label": "2",
        "publisher_label": "191",
        "suffix": "(2) [191]",
        "lines": 4
      },
      {
        "local_label": "3",
        "publisher_label": "192",
        "suffix": "(3) [192]",
        "lines": 4
      },
      {
        "local_label": "4",
        "publisher_label": "193",
        "suffix": "(4) [193]",
        "lines": 4
      },
      {
        "local_label": "5",
        "publisher_label": "194",
        "suffix": "(5) [194]",
        "lines": 4
      },
      {
        "local_label": "6",
        "publisher_label": "195",
        "suffix": "(6) [195]",
        "lines": 4
      },
      {
        "local_label": "7",
        "publisher_label": "196",
        "suffix": "(7) [196]",
        "lines": 4
      },
      {
        "local_label": "8",
        "publisher_label": "197",
        "suffix": "(8) [197]",
        "lines": 4
      },
      {
        "local_label": "9",
        "publisher_label": "198",
        "suffix": "(9) [198]",
        "lines": 4
      },
      {
        "local_label": "10",
        "publisher_label": "199",
        "suffix": "(10) [199]",
        "lines": 4
      },
      {
        "local_label": "11",
        "publisher_label": "200",
        "suffix": "(11) [200]",
        "lines": 4
      },
      {
        "local_label": "12",
        "publisher_label": "201",
        "suffix": "(12) [201]",
        "lines": 4
      },
      {
        "local_label": "13",
        "publisher_label": "202",
        "suffix": "(13) [202]",
        "lines": 4
      },
      {
        "local_label": "14",
        "publisher_label": "203",
        "suffix": "(14) [203]",
        "lines": 4
      },
      {
        "local_label": "15",
        "publisher_label": "204",
        "suffix": "(15) [204]",
        "lines": 4
      },
      {
        "local_label": "16",
        "publisher_label": "205",
        "suffix": "(16) [205]",
        "lines": 4
      },
      {
        "local_label": "17",
        "publisher_label": "206",
        "suffix": "(17) [206]",
        "lines": 4
      },
      {
        "local_label": "18",
        "publisher_label": "207",
        "suffix": "(18) [207]",
        "lines": 4
      },
      {
        "local_label": "19",
        "publisher_label": "208",
        "suffix": "(19) [208]",
        "lines": 4
      },
      {
        "local_label": "20",
        "publisher_label": "209",
        "suffix": "(20) [209]",
        "lines": 4
      },
      {
        "local_label": "21",
        "publisher_label": "210",
        "suffix": "(21) [210]",
        "lines": 4
      },
      {
        "local_label": "22",
        "publisher_label": "211",
        "suffix": "(22) [211]",
        "lines": 4
      },
      {
        "local_label": "23",
        "publisher_label": "212",
        "suffix": "(23) [212]",
        "lines": 4
      },
      {
        "local_label": "24",
        "publisher_label": "213",
        "suffix": "(24) [213]",
        "lines": 4
      },
      {
        "local_label": "25",
        "publisher_label": "214",
        "suffix": "(25) [214]",
        "lines": 4
      }
    ],
    "mapping_notes": [
      "Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Retain the independent VRI root and all explicit recension differences; no line alignment or missing words are inferred.",
      "True VRI scope61–85 ends7192; current unit wrongly includes next heading+86.",
      "Publisher title Pañcadīpikā vs VRI Pañcadīpadāyikā. Publisher25stanzas190–214; keep distinct from poem9 despite strong repetition.",
      "Publisher194 good colors vs VRI65 gold. Publisher200 standing/east vs VRI71 seated/turned away. Publisher201 good/bad actions vs VRI72 good/bad destinations (PTS action variant retained).",
      "Publisher207 ends fruit of five lamps; VRI78 ends Gotama knowing her qualities. No supplied wording is inferred from another poem; note1 explicitly does not repeat earlier notes."
    ],
    "index_revision": "apadana-theri11-20-v1"
  },
  "thi-ap16": {
    "id": "thi-ap16",
    "poem": 16,
    "verses": [
      215,
      225
    ],
    "root_verses": [
      86,
      96
    ],
    "note_count": 8,
    "note_numbers": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8
    ],
    "source": "apadana",
    "path": "/text/chapter-4/poem-016/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-016/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-016.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Sālamālikā",
    "reference": "Therī Apadāna 16; complete publisher-edition poem; original publisher numbering retained",
    "raw_sha256": "961c914d4b392296cf0d385c056f0c1670b95aa923bc62e3500461e8cc721838",
    "body_sha256": "b5edfc8c21bd6c907b59735f6926db91a2d55312e7ece492cea9c44cd1b0c0a6",
    "notes_sha256": "77fd26d21439906b5600d354e70a4ac8e10fc465d8c4b76505790f5426be1bd1",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "a3e30dbff9432a9c3c02bfa8f090fa2020811bc635c3f356cd1f86a271320289",
    "stanza_layout": [
      {
        "local_label": "1",
        "publisher_label": "215",
        "suffix": "(1) [215]",
        "lines": 4
      },
      {
        "local_label": "2",
        "publisher_label": "216",
        "suffix": "(2) [216]",
        "lines": 4
      },
      {
        "local_label": "3",
        "publisher_label": "217",
        "suffix": "(3) [217]",
        "lines": 4
      },
      {
        "local_label": "4",
        "publisher_label": "218",
        "suffix": "(4) [218]",
        "lines": 4
      },
      {
        "local_label": "5",
        "publisher_label": "219",
        "suffix": "(5) [219]",
        "lines": 4
      },
      {
        "local_label": "6",
        "publisher_label": "220",
        "suffix": "(6) [220]",
        "lines": 4
      },
      {
        "local_label": "7",
        "publisher_label": "221",
        "suffix": "(7) [221]",
        "lines": 4
      },
      {
        "local_label": "8",
        "publisher_label": "223",
        "suffix": "(8) [223]",
        "lines": 4
      },
      {
        "local_label": "9",
        "publisher_label": "224",
        "suffix": "(9) [224]",
        "lines": 4
      },
      {
        "local_label": "10",
        "publisher_label": "225",
        "suffix": "(10) [225]",
        "lines": 4
      },
      {
        "local_label": "11",
        "publisher_label": "222",
        "suffix": "(11) [222]",
        "lines": 4
      },
      {
        "local_label": "12",
        "publisher_label": null,
        "suffix": "(12)",
        "lines": 4
      }
    ],
    "mapping_notes": [
      "Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Retain the independent VRI root and all explicit recension differences; no line alignment or missing words are inferred.",
      "True VRI scope86–96 starts7192. Source title Sālamālikā follows BJTS; PTS Nalamālikā and VRI Naḷamālikā remain distinct edition spellings/readings. Publisher sal garland vs VRI reed garland.",
      "Publisher217 human body vs VRI88 kinnarī body; root human-body variant retained.",
      "Publisher local1–12 has globals215,216,217,218,219,220,221,223,224,225,222,null. BJTS places222 before refrains and omits final local12; PTS-only local12 is fully printed with no global label. Do not invent226 or reorder."
    ],
    "index_revision": "apadana-theri11-20-v1"
  },
  "thi-ap17": {
    "id": "thi-ap17",
    "poem": 17,
    "verses": [
      226,
      415
    ],
    "root_verses": [
      97,
      288
    ],
    "note_count": 119,
    "note_numbers": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32,
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40,
      41,
      42,
      43,
      44,
      45,
      46,
      47,
      48,
      49,
      50,
      51,
      52,
      53,
      54,
      55,
      56,
      57,
      58,
      59,
      60,
      61,
      62,
      63,
      64,
      65,
      66,
      67,
      68,
      69,
      70,
      71,
      72,
      73,
      74,
      75,
      76,
      77,
      78,
      79,
      80,
      81,
      82,
      83,
      84,
      85,
      86,
      87,
      88,
      89,
      90,
      91,
      92,
      93,
      94,
      95,
      96,
      97,
      98,
      99,
      100,
      101,
      102,
      103,
      104,
      105,
      106,
      107,
      108,
      109,
      110,
      111,
      112,
      113,
      114,
      115,
      116,
      117,
      118,
      119,
      120
    ],
    "source": "apadana",
    "path": "/text/chapter-4/poem-017/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-017/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-017.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Gotamī",
    "reference": "Therī Apadāna 17; complete publisher-edition poem; original publisher numbering retained",
    "raw_sha256": "483d1147155da827d0a64aaae4ccd78ce5916ef3bb89dcf55b6f94831ed300ab",
    "body_sha256": "ad425e6f9380043a880541747de30038f52f7dcd3c9551cb99fa694023867499",
    "notes_sha256": "be2abf60b810f8f927660b2d0d0377e0f8baec242c8804278af670eca5a21d0a",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "483fc05030a8ae4c74145634b8d9ae9216fa424c5bda2042b7e950b191b6adea",
    "stanza_layout": [
      {
        "local_label": "1",
        "publisher_label": "226",
        "suffix": "(1) [226]",
        "lines": 4
      },
      {
        "local_label": "2",
        "publisher_label": "227",
        "suffix": "(2) [227]",
        "lines": 4
      },
      {
        "local_label": "2e-f, 3a-b",
        "publisher_label": "228",
        "suffix": "(2e-f, 3a-b) [228]",
        "lines": 4
      },
      {
        "local_label": "3c-f",
        "publisher_label": "229",
        "suffix": "(3c-f) [229]",
        "lines": 4
      },
      {
        "local_label": "4",
        "publisher_label": "230",
        "suffix": "(4) [230]",
        "lines": 4
      },
      {
        "local_label": "5",
        "publisher_label": "231",
        "suffix": "(5) [231]",
        "lines": 4
      },
      {
        "local_label": "6",
        "publisher_label": "232",
        "suffix": "(6) [232]",
        "lines": 6
      },
      {
        "local_label": "7",
        "publisher_label": "233",
        "suffix": "(7) [233]",
        "lines": 4
      },
      {
        "local_label": "8",
        "publisher_label": "234",
        "suffix": "(8) [234]",
        "lines": 6
      },
      {
        "local_label": "9",
        "publisher_label": "235",
        "suffix": "(9) [235]",
        "lines": 4
      },
      {
        "local_label": "10",
        "publisher_label": "236",
        "suffix": "(10) [236]",
        "lines": 4
      },
      {
        "local_label": "11",
        "publisher_label": "237",
        "suffix": "(11) [237]",
        "lines": 4
      },
      {
        "local_label": "12",
        "publisher_label": "238",
        "suffix": "(12) [238]",
        "lines": 4
      },
      {
        "local_label": "13",
        "publisher_label": "239",
        "suffix": "(13) [239]",
        "lines": 4
      },
      {
        "local_label": "14",
        "publisher_label": "240",
        "suffix": "(14) [240]",
        "lines": 4
      },
      {
        "local_label": "15",
        "publisher_label": "241",
        "suffix": "(15) [241]",
        "lines": 4
      },
      {
        "local_label": "16",
        "publisher_label": "242",
        "suffix": "(16) [242]",
        "lines": 4
      },
      {
        "local_label": "17",
        "publisher_label": "243",
        "suffix": "(17) [243]",
        "lines": 4
      },
      {
        "local_label": "18",
        "publisher_label": "244",
        "suffix": "(18) [244]",
        "lines": 4
      },
      {
        "local_label": "19",
        "publisher_label": "245",
        "suffix": "(19) [245]",
        "lines": 4
      },
      {
        "local_label": "20",
        "publisher_label": "246",
        "suffix": "(20) [246]",
        "lines": 4
      },
      {
        "local_label": "21",
        "publisher_label": "247",
        "suffix": "(21) [247]",
        "lines": 4
      },
      {
        "local_label": "22",
        "publisher_label": "248",
        "suffix": "(22) [248]",
        "lines": 4
      },
      {
        "local_label": "23",
        "publisher_label": "249",
        "suffix": "(23) [249]",
        "lines": 4
      },
      {
        "local_label": "24",
        "publisher_label": "250",
        "suffix": "(24) [250]",
        "lines": 4
      },
      {
        "local_label": "25",
        "publisher_label": "251",
        "suffix": "(25) [251]",
        "lines": 4
      },
      {
        "local_label": "26",
        "publisher_label": "252",
        "suffix": "(26) [252]",
        "lines": 4
      },
      {
        "local_label": "27",
        "publisher_label": "253",
        "suffix": "(27) [253]",
        "lines": 4
      },
      {
        "local_label": "28",
        "publisher_label": "254",
        "suffix": "(28) [254]",
        "lines": 4
      },
      {
        "local_label": "29",
        "publisher_label": "255",
        "suffix": "(29) [255]",
        "lines": 4
      },
      {
        "local_label": "30",
        "publisher_label": "256",
        "suffix": "(30) [256]",
        "lines": 4
      },
      {
        "local_label": "31",
        "publisher_label": "257",
        "suffix": "(31) [257]",
        "lines": 4
      },
      {
        "local_label": "32",
        "publisher_label": "258",
        "suffix": "(32) [258]",
        "lines": 4
      },
      {
        "local_label": "33",
        "publisher_label": "259",
        "suffix": "(33) [259]",
        "lines": 4
      },
      {
        "local_label": "34",
        "publisher_label": "260",
        "suffix": "(34) [260]",
        "lines": 4
      },
      {
        "local_label": "35",
        "publisher_label": "261",
        "suffix": "(35) [261]",
        "lines": 4
      },
      {
        "local_label": "36",
        "publisher_label": "262",
        "suffix": "(36) [262]",
        "lines": 4
      },
      {
        "local_label": "37",
        "publisher_label": "263",
        "suffix": "(37) [263]",
        "lines": 4
      },
      {
        "local_label": "38",
        "publisher_label": "264",
        "suffix": "(38) [264]",
        "lines": 4
      },
      {
        "local_label": "39",
        "publisher_label": "265",
        "suffix": "(39) [265]",
        "lines": 4
      },
      {
        "local_label": "40",
        "publisher_label": "266",
        "suffix": "(40) [266]",
        "lines": 4
      },
      {
        "local_label": "41",
        "publisher_label": "267",
        "suffix": "(41) [267]",
        "lines": 4
      },
      {
        "local_label": "42",
        "publisher_label": "268",
        "suffix": "(42) [268]",
        "lines": 4
      },
      {
        "local_label": "43",
        "publisher_label": "269",
        "suffix": "(43) [269]",
        "lines": 4
      },
      {
        "local_label": "44",
        "publisher_label": "270",
        "suffix": "(44) [270]",
        "lines": 4
      },
      {
        "local_label": "45",
        "publisher_label": "271",
        "suffix": "(45) [271]",
        "lines": 4
      },
      {
        "local_label": "46",
        "publisher_label": "272",
        "suffix": "(46) [272]",
        "lines": 4
      },
      {
        "local_label": "47",
        "publisher_label": "273",
        "suffix": "(47) [273]",
        "lines": 4
      },
      {
        "local_label": "48",
        "publisher_label": "274",
        "suffix": "(48) [274]",
        "lines": 4
      },
      {
        "local_label": "49",
        "publisher_label": "275",
        "suffix": "(49) [275]",
        "lines": 4
      },
      {
        "local_label": "50",
        "publisher_label": "276",
        "suffix": "(50) [276]",
        "lines": 4
      },
      {
        "local_label": "51",
        "publisher_label": "277",
        "suffix": "(51) [277]",
        "lines": 4
      },
      {
        "local_label": "52",
        "publisher_label": "278",
        "suffix": "(52) [278]",
        "lines": 4
      },
      {
        "local_label": "53",
        "publisher_label": "279",
        "suffix": "(53) [279]",
        "lines": 4
      },
      {
        "local_label": "54",
        "publisher_label": "280",
        "suffix": "(54) [280]",
        "lines": 4
      },
      {
        "local_label": "55",
        "publisher_label": "281",
        "suffix": "(55) [281]",
        "lines": 4
      },
      {
        "local_label": "56-57",
        "publisher_label": "282-283",
        "suffix": "(56-57) [282-283]",
        "lines": 8
      },
      {
        "local_label": "58",
        "publisher_label": "284",
        "suffix": "(58) [284]",
        "lines": 4
      },
      {
        "local_label": "59",
        "publisher_label": "285",
        "suffix": "(59) [285]",
        "lines": 4
      },
      {
        "local_label": "60",
        "publisher_label": "286",
        "suffix": "(60) [286]",
        "lines": 4
      },
      {
        "local_label": "61",
        "publisher_label": "287",
        "suffix": "(61) [287]",
        "lines": 4
      },
      {
        "local_label": "62",
        "publisher_label": "288",
        "suffix": "(62) [288]",
        "lines": 4
      },
      {
        "local_label": "63",
        "publisher_label": "289",
        "suffix": "(63) [289]",
        "lines": 4
      },
      {
        "local_label": "64",
        "publisher_label": "290",
        "suffix": "(64) [290]",
        "lines": 4
      },
      {
        "local_label": "65",
        "publisher_label": "291",
        "suffix": "(65) [291]",
        "lines": 4
      },
      {
        "local_label": "66",
        "publisher_label": "292",
        "suffix": "(66) [292]",
        "lines": 4
      },
      {
        "local_label": "67",
        "publisher_label": "293",
        "suffix": "(67) [293]",
        "lines": 4
      },
      {
        "local_label": "68",
        "publisher_label": "294",
        "suffix": "(68) [294]",
        "lines": 4
      },
      {
        "local_label": "69",
        "publisher_label": "295",
        "suffix": "(69) [295]",
        "lines": 4
      },
      {
        "local_label": "70",
        "publisher_label": "296",
        "suffix": "(70) [296]",
        "lines": 4
      },
      {
        "local_label": "71",
        "publisher_label": "297",
        "suffix": "(71) [297]",
        "lines": 4
      },
      {
        "local_label": "72",
        "publisher_label": "298",
        "suffix": "(72) [298]",
        "lines": 4
      },
      {
        "local_label": "73",
        "publisher_label": "299",
        "suffix": "(73) [299]",
        "lines": 4
      },
      {
        "local_label": "74",
        "publisher_label": "300",
        "suffix": "(74) [300]",
        "lines": 4
      },
      {
        "local_label": "75",
        "publisher_label": "301",
        "suffix": "(75) [301]",
        "lines": 4
      },
      {
        "local_label": "76",
        "publisher_label": "302",
        "suffix": "(76) [302]",
        "lines": 4
      },
      {
        "local_label": "77",
        "publisher_label": "303",
        "suffix": "(77) [303]",
        "lines": 4
      },
      {
        "local_label": "78",
        "publisher_label": "304",
        "suffix": "(78) [304]",
        "lines": 4
      },
      {
        "local_label": "79",
        "publisher_label": "305",
        "suffix": "(79) [305]",
        "lines": 4
      },
      {
        "local_label": "80",
        "publisher_label": "306",
        "suffix": "(80) [306]",
        "lines": 4
      },
      {
        "local_label": "81",
        "publisher_label": "307",
        "suffix": "(81) [307]",
        "lines": 4
      },
      {
        "local_label": "82",
        "publisher_label": "308",
        "suffix": "(82) [308]",
        "lines": 4
      },
      {
        "local_label": "83",
        "publisher_label": "309",
        "suffix": "(83) [309]",
        "lines": 4
      },
      {
        "local_label": "84",
        "publisher_label": "310",
        "suffix": "(84) [310]",
        "lines": 4
      },
      {
        "local_label": "85",
        "publisher_label": "311",
        "suffix": "(85) [311]",
        "lines": 4
      },
      {
        "local_label": "86",
        "publisher_label": "312",
        "suffix": "(86) [312]",
        "lines": 4
      },
      {
        "local_label": "87",
        "publisher_label": "313",
        "suffix": "(87) [313]",
        "lines": 4
      },
      {
        "local_label": "88",
        "publisher_label": "314",
        "suffix": "(88) [314]",
        "lines": 4
      },
      {
        "local_label": "89",
        "publisher_label": "315",
        "suffix": "(89) [315]",
        "lines": 4
      },
      {
        "local_label": "90",
        "publisher_label": "316",
        "suffix": "(90) [316]",
        "lines": 4
      },
      {
        "local_label": "91",
        "publisher_label": "317",
        "suffix": "(91) [317]",
        "lines": 4
      },
      {
        "local_label": "92",
        "publisher_label": "318",
        "suffix": "(92) [318]",
        "lines": 4
      },
      {
        "local_label": "93",
        "publisher_label": "319",
        "suffix": "(93) [319]",
        "lines": 4
      },
      {
        "local_label": "94",
        "publisher_label": "320",
        "suffix": "(94) [320]",
        "lines": 4
      },
      {
        "local_label": "95",
        "publisher_label": "321",
        "suffix": "(95) [321]",
        "lines": 4
      },
      {
        "local_label": "96",
        "publisher_label": "322",
        "suffix": "(96) [322]",
        "lines": 4
      },
      {
        "local_label": "97",
        "publisher_label": "323",
        "suffix": "(97) [323]",
        "lines": 4
      },
      {
        "local_label": "98",
        "publisher_label": "324",
        "suffix": "(98) [324]",
        "lines": 4
      },
      {
        "local_label": "99",
        "publisher_label": "325",
        "suffix": "(99) [325]",
        "lines": 4
      },
      {
        "local_label": "100",
        "publisher_label": "326",
        "suffix": "(100) [326]",
        "lines": 4
      },
      {
        "local_label": "101",
        "publisher_label": "327",
        "suffix": "(101) [327]",
        "lines": 4
      },
      {
        "local_label": "102",
        "publisher_label": "328",
        "suffix": "(102) [328]",
        "lines": 4
      },
      {
        "local_label": "103",
        "publisher_label": "329",
        "suffix": "(103) [329]",
        "lines": 4
      },
      {
        "local_label": "104",
        "publisher_label": "330",
        "suffix": "(104) [330]",
        "lines": 4
      },
      {
        "local_label": "105",
        "publisher_label": "331",
        "suffix": "(105) [331]",
        "lines": 4
      },
      {
        "local_label": "106",
        "publisher_label": "332",
        "suffix": "(106) [332]",
        "lines": 4
      },
      {
        "local_label": "107",
        "publisher_label": "333",
        "suffix": "(107) [333]",
        "lines": 4
      },
      {
        "local_label": "108",
        "publisher_label": "334",
        "suffix": "(108) [334]",
        "lines": 4
      },
      {
        "local_label": "109",
        "publisher_label": "335",
        "suffix": "(109) [335]",
        "lines": 4
      },
      {
        "local_label": "110",
        "publisher_label": "336",
        "suffix": "(110) [336]",
        "lines": 4
      },
      {
        "local_label": "111",
        "publisher_label": "337",
        "suffix": "(111) [337]",
        "lines": 4
      },
      {
        "local_label": "112",
        "publisher_label": "338",
        "suffix": "(112) [338]",
        "lines": 4
      },
      {
        "local_label": "113",
        "publisher_label": "339",
        "suffix": "(113) [339]",
        "lines": 4
      },
      {
        "local_label": "114",
        "publisher_label": "340",
        "suffix": "(114) [340]",
        "lines": 4
      },
      {
        "local_label": "115",
        "publisher_label": "341",
        "suffix": "(115) [341]",
        "lines": 4
      },
      {
        "local_label": "116",
        "publisher_label": "342",
        "suffix": "(116) [342]",
        "lines": 4
      },
      {
        "local_label": "117",
        "publisher_label": "343",
        "suffix": "(117) [343]",
        "lines": 4
      },
      {
        "local_label": "118",
        "publisher_label": "344",
        "suffix": "(118) [344]",
        "lines": 4
      },
      {
        "local_label": "119",
        "publisher_label": "345",
        "suffix": "(119) [345]",
        "lines": 4
      },
      {
        "local_label": "120",
        "publisher_label": "346",
        "suffix": "(120) [346]",
        "lines": 4
      },
      {
        "local_label": "121",
        "publisher_label": "347",
        "suffix": "(121) [347]",
        "lines": 4
      },
      {
        "local_label": "122-123",
        "publisher_label": "348-349",
        "suffix": "(122-123) [348-349]",
        "lines": 8
      },
      {
        "local_label": "124",
        "publisher_label": "350",
        "suffix": "(124) [350]",
        "lines": 4
      },
      {
        "local_label": "125",
        "publisher_label": "351",
        "suffix": "(125) [351]",
        "lines": 4
      },
      {
        "local_label": "126",
        "publisher_label": "352",
        "suffix": "(126) [352]",
        "lines": 4
      },
      {
        "local_label": "127",
        "publisher_label": "353",
        "suffix": "(127) [353]",
        "lines": 4
      },
      {
        "local_label": "128",
        "publisher_label": "354",
        "suffix": "(128) [354]",
        "lines": 4
      },
      {
        "local_label": "129",
        "publisher_label": "355",
        "suffix": "(129) [355]",
        "lines": 4
      },
      {
        "local_label": "130",
        "publisher_label": "356",
        "suffix": "(130) [356]",
        "lines": 4
      },
      {
        "local_label": "131",
        "publisher_label": "357",
        "suffix": "(131) [357]",
        "lines": 4
      },
      {
        "local_label": "132",
        "publisher_label": "358",
        "suffix": "(132) [358]",
        "lines": 4
      },
      {
        "local_label": "133",
        "publisher_label": "359",
        "suffix": "(133) [359]",
        "lines": 4
      },
      {
        "local_label": "134",
        "publisher_label": "360",
        "suffix": "(134) [360]",
        "lines": 4
      },
      {
        "local_label": "135",
        "publisher_label": "361",
        "suffix": "(135) [361]",
        "lines": 4
      },
      {
        "local_label": "136",
        "publisher_label": "362",
        "suffix": "(136) [362]",
        "lines": 4
      },
      {
        "local_label": "137",
        "publisher_label": "363",
        "suffix": "(137) [363]",
        "lines": 4
      },
      {
        "local_label": "138",
        "publisher_label": "364",
        "suffix": "(138) [364]",
        "lines": 4
      },
      {
        "local_label": "139",
        "publisher_label": "365",
        "suffix": "(139) [365]",
        "lines": 4
      },
      {
        "local_label": "140",
        "publisher_label": "366",
        "suffix": "(140) [366]",
        "lines": 4
      },
      {
        "local_label": "141",
        "publisher_label": "367",
        "suffix": "(141) [367]",
        "lines": 4
      },
      {
        "local_label": "142",
        "publisher_label": "368",
        "suffix": "(142) [368]",
        "lines": 4
      },
      {
        "local_label": "143",
        "publisher_label": "369",
        "suffix": "(143) [369]",
        "lines": 4
      },
      {
        "local_label": "144",
        "publisher_label": "370",
        "suffix": "(144) [370]",
        "lines": 4
      },
      {
        "local_label": "145",
        "publisher_label": "371",
        "suffix": "(145) [371]",
        "lines": 4
      },
      {
        "local_label": "146",
        "publisher_label": "372",
        "suffix": "(146) [372]",
        "lines": 4
      },
      {
        "local_label": "147",
        "publisher_label": "373",
        "suffix": "(147) [373]",
        "lines": 4
      },
      {
        "local_label": "148",
        "publisher_label": "374",
        "suffix": "(148) [374]",
        "lines": 4
      },
      {
        "local_label": "149",
        "publisher_label": "375",
        "suffix": "(149) [375]",
        "lines": 4
      },
      {
        "local_label": "150",
        "publisher_label": "376",
        "suffix": "(150) [376]",
        "lines": 4
      },
      {
        "local_label": "151",
        "publisher_label": "377",
        "suffix": "(151) [377]",
        "lines": 4
      },
      {
        "local_label": "152",
        "publisher_label": "378",
        "suffix": "(152) [378]",
        "lines": 4
      },
      {
        "local_label": "153",
        "publisher_label": "379",
        "suffix": "(153) [379]",
        "lines": 4
      },
      {
        "local_label": "154",
        "publisher_label": "380",
        "suffix": "(154) [380]",
        "lines": 4
      },
      {
        "local_label": "155",
        "publisher_label": "381",
        "suffix": "(155) [381]",
        "lines": 4
      },
      {
        "local_label": "156-157",
        "publisher_label": "382-383",
        "suffix": "(156-157) [382-383]",
        "lines": 8
      },
      {
        "local_label": "158",
        "publisher_label": "384",
        "suffix": "(158) [384]",
        "lines": 4
      },
      {
        "local_label": "159",
        "publisher_label": "385",
        "suffix": "(159) [385]",
        "lines": 4
      },
      {
        "local_label": "160",
        "publisher_label": "386",
        "suffix": "(160) [386]",
        "lines": 4
      },
      {
        "local_label": "161",
        "publisher_label": "387",
        "suffix": "(161) [387]",
        "lines": 4
      },
      {
        "local_label": "162",
        "publisher_label": "388",
        "suffix": "(162) [388]",
        "lines": 4
      },
      {
        "local_label": "163",
        "publisher_label": "389",
        "suffix": "(163) [389]",
        "lines": 4
      },
      {
        "local_label": "164",
        "publisher_label": "390",
        "suffix": "(164) [390]",
        "lines": 4
      },
      {
        "local_label": "165",
        "publisher_label": "391",
        "suffix": "(165) [391]",
        "lines": 4
      },
      {
        "local_label": "166",
        "publisher_label": "392",
        "suffix": "(166) [392]",
        "lines": 4
      },
      {
        "local_label": "167",
        "publisher_label": "393",
        "suffix": "(167) [393]",
        "lines": 4
      },
      {
        "local_label": "168",
        "publisher_label": "394",
        "suffix": "(168) [394]",
        "lines": 4
      },
      {
        "local_label": "169",
        "publisher_label": "395",
        "suffix": "(169) [395]",
        "lines": 4
      },
      {
        "local_label": "170",
        "publisher_label": "396",
        "suffix": "(170) [396]",
        "lines": 4
      },
      {
        "local_label": "171",
        "publisher_label": "397",
        "suffix": "(171) [397]",
        "lines": 4
      },
      {
        "local_label": "172",
        "publisher_label": "398",
        "suffix": "(172) [398]",
        "lines": 4
      },
      {
        "local_label": "173",
        "publisher_label": "399",
        "suffix": "(173) [399]",
        "lines": 4
      },
      {
        "local_label": "174",
        "publisher_label": "400",
        "suffix": "(174) [400]",
        "lines": 4
      },
      {
        "local_label": "175",
        "publisher_label": "401",
        "suffix": "(175) [401]",
        "lines": 4
      },
      {
        "local_label": "176",
        "publisher_label": "402",
        "suffix": "(176) [402]",
        "lines": 4
      },
      {
        "local_label": "177",
        "publisher_label": "403",
        "suffix": "(177) [403]",
        "lines": 4
      },
      {
        "local_label": "178",
        "publisher_label": "404",
        "suffix": "(178) [404]",
        "lines": 4
      },
      {
        "local_label": "179-180",
        "publisher_label": "405-406",
        "suffix": "(179-180) [405-406]",
        "lines": 8
      },
      {
        "local_label": "181",
        "publisher_label": "407",
        "suffix": "(181) [407]",
        "lines": 4
      },
      {
        "local_label": "182",
        "publisher_label": "408",
        "suffix": "(182) [408]",
        "lines": 4
      },
      {
        "local_label": "183",
        "publisher_label": "409",
        "suffix": "(183) [409]",
        "lines": 4
      },
      {
        "local_label": "184",
        "publisher_label": "410",
        "suffix": "(184) [410]",
        "lines": 4
      },
      {
        "local_label": "185",
        "publisher_label": "411",
        "suffix": "(185) [411]",
        "lines": 4
      },
      {
        "local_label": "186",
        "publisher_label": "412",
        "suffix": "(186) [412]",
        "lines": 4
      },
      {
        "local_label": "187",
        "publisher_label": "413",
        "suffix": "(187) [413]",
        "lines": 4
      },
      {
        "local_label": "188",
        "publisher_label": "414",
        "suffix": "(188) [414]",
        "lines": 4
      },
      {
        "local_label": "189",
        "publisher_label": "415",
        "suffix": "(189) [415]",
        "lines": 4
      }
    ],
    "mapping_notes": [
      "Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Retain the independent VRI root and all explicit recension differences; no line alignment or missing words are inferred.",
      "True VRI97–288 ends7802; next Khemā heading and289 belong to18. Publisher is complete beginning-to-final-instruction narrative,186printed stanza entries spanning226–415 with combined ranges; not line-complete VRI192stanzas.",
      "VRI101 repeats prospective nirvāṇa losses, adds Mahākassapa and has no separate publisher stanza. Publisher6/8 six-foot division differs from VRI104–107.",
      "Publisher230 destroying life constituents vs VRI102 paṭikaccā/ossajjitvā reading; note5 preserves PTS/BJTS differences.",
      "Publisher277–280 addresses speaker/wording differently from VRI150–153; retain original explanatory notes.",
      "Publisher315 boar/Vishnu vs VRI188 elephant (dvirada). Publisher326 one day vs VRI199 week (publisher328 itself says week). Publisher327 Greatly Mindful vs VRI200 great assembly.",
      "Publisher344 Śākyan heroes with male interpolation vs VRI217 Sākiyānīhi; preserve original gender wording and do not assert person-by-person alignment.",
      "Publisher372 enumerates three immaterial planes while VRI245 includes four, including nevasañña; no missing English is generated.",
      "Publisher393 incense follows PTS variant vs VRI266 sky lotuses. Translator notes1–120 all preserved with original numbers;21 is solely recitation-marker note."
    ],
    "index_revision": "apadana-theri11-20-v1",
    "publisher_divisions": [
      {
        "kind": "publisher_recitation",
        "label": "First recitation portion",
        "before_local_label": "22",
        "before_publisher_label": "248",
        "body_sha256": "98517aa34d401470f71d510fdd5aebada3597c029abd94579c1d5df6543c0539",
        "notes_sha256": "f1234f877d75bb55da1f9861699a2df6d8325af2f4f87d9e268a41bfb239664f",
        "note_numbers": [
          21
        ]
      }
    ]
  },
  "thi-ap18": {
    "id": "thi-ap18",
    "poem": 18,
    "verses": [
      416,
      510
    ],
    "root_verses": [
      289,
      383
    ],
    "note_count": 82,
    "note_numbers": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32,
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40,
      41,
      42,
      43,
      44,
      45,
      46,
      47,
      48,
      49,
      50,
      51,
      52,
      53,
      54,
      55,
      56,
      57,
      58,
      59,
      60,
      61,
      62,
      63,
      64,
      65,
      66,
      67,
      68,
      69,
      70,
      71,
      72,
      73,
      74,
      75,
      76,
      77,
      78,
      79,
      80,
      81,
      82
    ],
    "source": "apadana",
    "path": "/text/chapter-4/poem-018/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-018/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-018.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Khemā",
    "reference": "Therī Apadāna 18; complete publisher-edition poem; original publisher numbering retained",
    "raw_sha256": "5b579d6567f36d1952254b33295b826720f1f9bd4163e1a4be63830857af9dbc",
    "body_sha256": "94f22111fea0ea29c56ac00950a50b975001757e31d45d179523a45feb3f9b90",
    "notes_sha256": "927e03d408453ed06bcba44cc8f673bc981a500af512eb53b57548f0879866b5",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "30da05306d87e9d353e750af13e030b9ac064e45ddc98abccf906c65ddb72723",
    "stanza_layout": [
      {
        "local_label": "1",
        "publisher_label": "416",
        "suffix": "(1) [416]",
        "lines": 4
      },
      {
        "local_label": "2",
        "publisher_label": "417",
        "suffix": "(2) [417]",
        "lines": 4
      },
      {
        "local_label": "3",
        "publisher_label": "418",
        "suffix": "(3) [418]",
        "lines": 4
      },
      {
        "local_label": "4",
        "publisher_label": "419",
        "suffix": "(4) [419]",
        "lines": 4
      },
      {
        "local_label": "5",
        "publisher_label": "420",
        "suffix": "(5) [420]",
        "lines": 4
      },
      {
        "local_label": "6",
        "publisher_label": "421",
        "suffix": "(6) [421]",
        "lines": 4
      },
      {
        "local_label": "7",
        "publisher_label": "422",
        "suffix": "(7) [422]",
        "lines": 4
      },
      {
        "local_label": "8",
        "publisher_label": "423",
        "suffix": "(8) [423]",
        "lines": 4
      },
      {
        "local_label": "9",
        "publisher_label": "424",
        "suffix": "(9) [424]",
        "lines": 4
      },
      {
        "local_label": "10",
        "publisher_label": "425",
        "suffix": "(10) [425]",
        "lines": 4
      },
      {
        "local_label": "11",
        "publisher_label": "426",
        "suffix": "(11) [426]",
        "lines": 4
      },
      {
        "local_label": "12",
        "publisher_label": "427",
        "suffix": "(12) [427]",
        "lines": 4
      },
      {
        "local_label": "13",
        "publisher_label": "428",
        "suffix": "(13) [428]",
        "lines": 4
      },
      {
        "local_label": "14",
        "publisher_label": "429",
        "suffix": "(14) [429]",
        "lines": 4
      },
      {
        "local_label": "15",
        "publisher_label": "430",
        "suffix": "(15) [430]",
        "lines": 4
      },
      {
        "local_label": "16",
        "publisher_label": "431",
        "suffix": "(16) [431]",
        "lines": 4
      },
      {
        "local_label": "17",
        "publisher_label": "432",
        "suffix": "(17) [432]",
        "lines": 4
      },
      {
        "local_label": "18",
        "publisher_label": "433",
        "suffix": "(18) [433]",
        "lines": 4
      },
      {
        "local_label": "19",
        "publisher_label": "434",
        "suffix": "(19) [434]",
        "lines": 4
      },
      {
        "local_label": "20",
        "publisher_label": "435",
        "suffix": "(20) [435]",
        "lines": 4
      },
      {
        "local_label": "21",
        "publisher_label": "436",
        "suffix": "(21) [436]",
        "lines": 4
      },
      {
        "local_label": "22",
        "publisher_label": "437",
        "suffix": "(22) [437]",
        "lines": 4
      },
      {
        "local_label": "23",
        "publisher_label": "438",
        "suffix": "(23) [438]",
        "lines": 4
      },
      {
        "local_label": "24",
        "publisher_label": "439",
        "suffix": "(24) [439]",
        "lines": 4
      },
      {
        "local_label": "25",
        "publisher_label": "440",
        "suffix": "(25) [440]",
        "lines": 4
      },
      {
        "local_label": "26",
        "publisher_label": "441",
        "suffix": "(26) [441]",
        "lines": 4
      },
      {
        "local_label": "27",
        "publisher_label": "442",
        "suffix": "(27) [442]",
        "lines": 4
      },
      {
        "local_label": "28",
        "publisher_label": "443",
        "suffix": "(28) [443]",
        "lines": 4
      },
      {
        "local_label": "29",
        "publisher_label": "444",
        "suffix": "(29) [444]",
        "lines": 4
      },
      {
        "local_label": "30-31",
        "publisher_label": "445-446",
        "suffix": "(30-31) [445-446]",
        "lines": 8
      },
      {
        "local_label": "32",
        "publisher_label": "447",
        "suffix": "(32) [447]",
        "lines": 4
      },
      {
        "local_label": "33",
        "publisher_label": "448",
        "suffix": "(33) [448]",
        "lines": 4
      },
      {
        "local_label": "34",
        "publisher_label": "449",
        "suffix": "(34) [449]",
        "lines": 4
      },
      {
        "local_label": "35",
        "publisher_label": "450",
        "suffix": "(35) [450]",
        "lines": 4
      },
      {
        "local_label": "36",
        "publisher_label": "451",
        "suffix": "(36) [451]",
        "lines": 4
      },
      {
        "local_label": "37",
        "publisher_label": "452",
        "suffix": "(37) [452]",
        "lines": 4
      },
      {
        "local_label": "38",
        "publisher_label": "453",
        "suffix": "(38) [453]",
        "lines": 4
      },
      {
        "local_label": "39",
        "publisher_label": "454",
        "suffix": "(39) [454]",
        "lines": 4
      },
      {
        "local_label": "40",
        "publisher_label": "455",
        "suffix": "(40) [455]",
        "lines": 4
      },
      {
        "local_label": "41",
        "publisher_label": "456",
        "suffix": "(41) [456]",
        "lines": 4
      },
      {
        "local_label": "42",
        "publisher_label": "457",
        "suffix": "(42) [457]",
        "lines": 4
      },
      {
        "local_label": "43",
        "publisher_label": "458",
        "suffix": "(43) [458]",
        "lines": 4
      },
      {
        "local_label": "44",
        "publisher_label": "459",
        "suffix": "(44) [459]",
        "lines": 4
      },
      {
        "local_label": "45",
        "publisher_label": "460",
        "suffix": "(45) [460]",
        "lines": 4
      },
      {
        "local_label": "46",
        "publisher_label": "461",
        "suffix": "(46) [461]",
        "lines": 4
      },
      {
        "local_label": "47",
        "publisher_label": "462",
        "suffix": "(47) [462]",
        "lines": 4
      },
      {
        "local_label": "48",
        "publisher_label": "463",
        "suffix": "(48) [463]",
        "lines": 4
      },
      {
        "local_label": "49",
        "publisher_label": "464",
        "suffix": "(49) [464]",
        "lines": 4
      },
      {
        "local_label": "50",
        "publisher_label": "465",
        "suffix": "(50) [465]",
        "lines": 4
      },
      {
        "local_label": "51",
        "publisher_label": "466",
        "suffix": "(51) [466]",
        "lines": 4
      },
      {
        "local_label": "52",
        "publisher_label": "467",
        "suffix": "(52) [467]",
        "lines": 4
      },
      {
        "local_label": "53",
        "publisher_label": "468",
        "suffix": "(53) [468]",
        "lines": 4
      },
      {
        "local_label": "54",
        "publisher_label": "469",
        "suffix": "(54) [469]",
        "lines": 4
      },
      {
        "local_label": "55",
        "publisher_label": "470",
        "suffix": "(55) [470]",
        "lines": 4
      },
      {
        "local_label": "56",
        "publisher_label": "471",
        "suffix": "(56) [471]",
        "lines": 4
      },
      {
        "local_label": "57",
        "publisher_label": "472",
        "suffix": "(57) [472]",
        "lines": 4
      },
      {
        "local_label": "58",
        "publisher_label": "473",
        "suffix": "(58) [473]",
        "lines": 4
      },
      {
        "local_label": "59",
        "publisher_label": "474",
        "suffix": "(59) [474]",
        "lines": 4
      },
      {
        "local_label": "60",
        "publisher_label": "475",
        "suffix": "(60) [475]",
        "lines": 4
      },
      {
        "local_label": "61",
        "publisher_label": "476",
        "suffix": "(61) [476]",
        "lines": 4
      },
      {
        "local_label": "62",
        "publisher_label": "477",
        "suffix": "(62) [477]",
        "lines": 4
      },
      {
        "local_label": "63",
        "publisher_label": "478",
        "suffix": "(63) [478]",
        "lines": 4
      },
      {
        "local_label": "64",
        "publisher_label": "479",
        "suffix": "(64) [479]",
        "lines": 4
      },
      {
        "local_label": "65",
        "publisher_label": "480",
        "suffix": "(65) [480]",
        "lines": 4
      },
      {
        "local_label": "66",
        "publisher_label": "481",
        "suffix": "(66) [481]",
        "lines": 4
      },
      {
        "local_label": "67",
        "publisher_label": "482",
        "suffix": "(67) [482]",
        "lines": 4
      },
      {
        "local_label": "68",
        "publisher_label": "483",
        "suffix": "(68) [483]",
        "lines": 4
      },
      {
        "local_label": "69",
        "publisher_label": "484",
        "suffix": "(69) [484]",
        "lines": 4
      },
      {
        "local_label": "70-71",
        "publisher_label": "485",
        "suffix": "(70-71) [485].",
        "lines": 4
      },
      {
        "local_label": "72",
        "publisher_label": "486",
        "suffix": "(72) [486]",
        "lines": 4
      },
      {
        "local_label": "73",
        "publisher_label": "487",
        "suffix": "(73) [487]",
        "lines": 4
      },
      {
        "local_label": "74",
        "publisher_label": "488",
        "suffix": "(74) [488]",
        "lines": 4
      },
      {
        "local_label": "75",
        "publisher_label": "489",
        "suffix": "(75) [489]",
        "lines": 4
      },
      {
        "local_label": "76",
        "publisher_label": "490",
        "suffix": "(76) [490]",
        "lines": 4
      },
      {
        "local_label": "77",
        "publisher_label": "491",
        "suffix": "(77) [491]",
        "lines": 4
      },
      {
        "local_label": "78",
        "publisher_label": "492",
        "suffix": "(78) [492]",
        "lines": 4
      },
      {
        "local_label": "79",
        "publisher_label": "493",
        "suffix": "(79) [493]",
        "lines": 4
      },
      {
        "local_label": "80",
        "publisher_label": "494",
        "suffix": "(80) [494]",
        "lines": 4
      },
      {
        "local_label": "81",
        "publisher_label": "495",
        "suffix": "(81) [495]",
        "lines": 4
      },
      {
        "local_label": "82",
        "publisher_label": "496",
        "suffix": "(82) [496]",
        "lines": 4
      },
      {
        "local_label": "83",
        "publisher_label": "497",
        "suffix": "(83) [497]",
        "lines": 4
      },
      {
        "local_label": "84",
        "publisher_label": "498",
        "suffix": "(84) [498]",
        "lines": 4
      },
      {
        "local_label": "85",
        "publisher_label": "499",
        "suffix": "(85) [499]",
        "lines": 4
      },
      {
        "local_label": "86",
        "publisher_label": "500",
        "suffix": "(86) [500]",
        "lines": 4
      },
      {
        "local_label": "87",
        "publisher_label": "501",
        "suffix": "(87) [501]",
        "lines": 4
      },
      {
        "local_label": "88",
        "publisher_label": "502",
        "suffix": "(88) [502]",
        "lines": 4
      },
      {
        "local_label": "89",
        "publisher_label": "503",
        "suffix": "(89) [503]",
        "lines": 4
      },
      {
        "local_label": "90",
        "publisher_label": "504",
        "suffix": "(90) [504]",
        "lines": 4
      },
      {
        "local_label": "91",
        "publisher_label": "505",
        "suffix": "(91) [505]",
        "lines": 4
      },
      {
        "local_label": "92",
        "publisher_label": "506",
        "suffix": "(92) [506]",
        "lines": 4
      },
      {
        "local_label": "93",
        "publisher_label": "507",
        "suffix": "(93) [507]",
        "lines": 4
      },
      {
        "local_label": "94",
        "publisher_label": "508",
        "suffix": "(94) [508]",
        "lines": 4
      },
      {
        "local_label": "95",
        "publisher_label": "509",
        "suffix": "(95) [509]",
        "lines": 4
      },
      {
        "local_label": "96",
        "publisher_label": "510",
        "suffix": "(96) [510]",
        "lines": 4
      }
    ],
    "mapping_notes": [
      "Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Retain the independent VRI root and all explicit recension differences; no line alignment or missing words are inferred.",
      "True VRI289–383 begins7802;95VRIstanzas vs94printed publisher entries416–510 due combined445-446 and local70-71/global485 meter convention.",
      "Source note7 contains original unresolved xxx; retain it as translator editorial wording. No guessed resolution.",
      "Publisher435 beautiful vs VRI308 sīlavatī moral (beauty variant retained). Publisher440 thousand donation vs VRI313 dānasahāyikā reading (source donation variant retained).",
      "Publisher471 asks if Buddha is wretched vs VRI344 na ayaṃ lūkho negation. Publisher499 seven months vs VRI372 half month (seven-month variant retained). Publisher505 queen questions vs VRI378 king.",
      "VRI second recitation marker at8049 is not printed in this publisher artifact; do not fabricate it. All82notes original ownership preserved."
    ],
    "index_revision": "apadana-theri11-20-v1"
  },
  "thi-ap19": {
    "id": "thi-ap19",
    "poem": 19,
    "verses": [
      511,
      594
    ],
    "root_verses": [
      384,
      467
    ],
    "note_count": 85,
    "note_numbers": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32,
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40,
      41,
      42,
      43,
      44,
      45,
      46,
      47,
      48,
      49,
      50,
      51,
      52,
      53,
      54,
      55,
      56,
      57,
      58,
      59,
      60,
      61,
      62,
      63,
      64,
      65,
      66,
      67,
      68,
      69,
      70,
      71,
      72,
      73,
      74,
      75,
      76,
      77,
      78,
      79,
      80,
      81,
      82,
      83,
      84,
      85
    ],
    "source": "apadana",
    "path": "/text/chapter-4/poem-019/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-019/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-019.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Uppalavaṇṇā",
    "reference": "Therī Apadāna 19; complete publisher-edition poem; original publisher numbering retained",
    "raw_sha256": "6ca863b88c543d78aaea3092404f6ae1d9953fc3dbd4c993e73dc6d2dfe8f8c5",
    "body_sha256": "fee71ea5b44344b88f90925ef4ddc8fc112350e4789d7092b24f1cda579cbe28",
    "notes_sha256": "a7ee7a8f75320989c2f5fb785b05e8cb4ece96343722317f424371809da33796",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "e9efc0259984d179c7dcb3cf69232a759235125224ef1f1a83ba88844c153a5e",
    "stanza_layout": [
      {
        "local_label": "1",
        "publisher_label": "511",
        "suffix": "(1) [511]",
        "lines": 4
      },
      {
        "local_label": "2",
        "publisher_label": "512",
        "suffix": "(2) [512]",
        "lines": 4
      },
      {
        "local_label": "3",
        "publisher_label": "513",
        "suffix": "(3) [513]",
        "lines": 4
      },
      {
        "local_label": "4",
        "publisher_label": "514",
        "suffix": "(4) [514]",
        "lines": 4
      },
      {
        "local_label": "5",
        "publisher_label": "515",
        "suffix": "(5) [515]",
        "lines": 4
      },
      {
        "local_label": "6",
        "publisher_label": "516",
        "suffix": "(6) [516]",
        "lines": 4
      },
      {
        "local_label": "7",
        "publisher_label": "517",
        "suffix": "(7) [517]",
        "lines": 4
      },
      {
        "local_label": "8",
        "publisher_label": "518",
        "suffix": "(8) [518]",
        "lines": 4
      },
      {
        "local_label": "9",
        "publisher_label": "519",
        "suffix": "(9) [519]",
        "lines": 4
      },
      {
        "local_label": "10",
        "publisher_label": "520",
        "suffix": "(10) [520]",
        "lines": 4
      },
      {
        "local_label": "11",
        "publisher_label": "521",
        "suffix": "(11) [521]",
        "lines": 4
      },
      {
        "local_label": "12",
        "publisher_label": "522",
        "suffix": "(12) [522]",
        "lines": 4
      },
      {
        "local_label": "13",
        "publisher_label": "523",
        "suffix": "(13) [523]",
        "lines": 4
      },
      {
        "local_label": "14",
        "publisher_label": "524",
        "suffix": "(14) [524]",
        "lines": 4
      },
      {
        "local_label": "15",
        "publisher_label": "525",
        "suffix": "(15) [525]",
        "lines": 4
      },
      {
        "local_label": "16",
        "publisher_label": "526",
        "suffix": "(16) [526]",
        "lines": 4
      },
      {
        "local_label": "17",
        "publisher_label": "527",
        "suffix": "(17) [527]",
        "lines": 4
      },
      {
        "local_label": "18",
        "publisher_label": "528",
        "suffix": "(18) [528]",
        "lines": 4
      },
      {
        "local_label": "19",
        "publisher_label": "529",
        "suffix": "(19) [529]",
        "lines": 4
      },
      {
        "local_label": "20",
        "publisher_label": "530",
        "suffix": "(20) [530]",
        "lines": 4
      },
      {
        "local_label": "21",
        "publisher_label": "531",
        "suffix": "(21) [531]",
        "lines": 4
      },
      {
        "local_label": "22",
        "publisher_label": "532",
        "suffix": "(22) [532]",
        "lines": 4
      },
      {
        "local_label": "23",
        "publisher_label": "533",
        "suffix": "(23) [533]",
        "lines": 4
      },
      {
        "local_label": null,
        "publisher_label": "534",
        "suffix": "[534]",
        "lines": 4
      },
      {
        "local_label": "24",
        "publisher_label": "535",
        "suffix": "(24) [535]",
        "lines": 4
      },
      {
        "local_label": "25",
        "publisher_label": "536",
        "suffix": "(25) [536]",
        "lines": 4
      },
      {
        "local_label": "26-27",
        "publisher_label": "537-538",
        "suffix": "(26-27) [537-538]",
        "lines": 8
      },
      {
        "local_label": "28",
        "publisher_label": "539",
        "suffix": "(28) [539]",
        "lines": 4
      },
      {
        "local_label": "29",
        "publisher_label": "540",
        "suffix": "(29) [540]",
        "lines": 4
      },
      {
        "local_label": "30",
        "publisher_label": "541",
        "suffix": "(30) [541]",
        "lines": 4
      },
      {
        "local_label": "31-32",
        "publisher_label": "542-543",
        "suffix": "(31-32) [542-543]",
        "lines": 8
      },
      {
        "local_label": "33",
        "publisher_label": "544",
        "suffix": "(33) [544]",
        "lines": 4
      },
      {
        "local_label": "34",
        "publisher_label": "545",
        "suffix": "(34) [545]",
        "lines": 4
      },
      {
        "local_label": "35",
        "publisher_label": "546",
        "suffix": "(35) [546]",
        "lines": 4
      },
      {
        "local_label": "36",
        "publisher_label": "547",
        "suffix": "(36) [547]",
        "lines": 4
      },
      {
        "local_label": "37",
        "publisher_label": "548",
        "suffix": "(37) [548]",
        "lines": 4
      },
      {
        "local_label": "38",
        "publisher_label": "549",
        "suffix": "(38) [549]",
        "lines": 4
      },
      {
        "local_label": "39",
        "publisher_label": "550",
        "suffix": "(39) [550]",
        "lines": 4
      },
      {
        "local_label": "40",
        "publisher_label": "551",
        "suffix": "(40) [551]",
        "lines": 4
      },
      {
        "local_label": "41",
        "publisher_label": "552",
        "suffix": "(41) [552]",
        "lines": 4
      },
      {
        "local_label": "42",
        "publisher_label": "553",
        "suffix": "(42) [553]",
        "lines": 4
      },
      {
        "local_label": "43",
        "publisher_label": "554",
        "suffix": "(43) [554]",
        "lines": 4
      },
      {
        "local_label": "44",
        "publisher_label": "555",
        "suffix": "(44) [555]",
        "lines": 4
      },
      {
        "local_label": "45",
        "publisher_label": "556",
        "suffix": "(45) [556]",
        "lines": 4
      },
      {
        "local_label": "46",
        "publisher_label": "557",
        "suffix": "(46) [557]",
        "lines": 4
      },
      {
        "local_label": "47",
        "publisher_label": "558",
        "suffix": "(47) [558]",
        "lines": 4
      },
      {
        "local_label": "48-49",
        "publisher_label": "559-560",
        "suffix": "(48-49) [559-560]",
        "lines": 8
      },
      {
        "local_label": "50",
        "publisher_label": "561",
        "suffix": "(50) [561]",
        "lines": 4
      },
      {
        "local_label": "51",
        "publisher_label": "562",
        "suffix": "(51) [562]",
        "lines": 4
      },
      {
        "local_label": "52",
        "publisher_label": "563",
        "suffix": "(52) [563]",
        "lines": 4
      },
      {
        "local_label": "53",
        "publisher_label": "564",
        "suffix": "(53) [564]",
        "lines": 4
      },
      {
        "local_label": "54",
        "publisher_label": "565",
        "suffix": "(54) [565]",
        "lines": 4
      },
      {
        "local_label": "55",
        "publisher_label": "566",
        "suffix": "(55) [566]",
        "lines": 4
      },
      {
        "local_label": "56",
        "publisher_label": "567",
        "suffix": "(56) [567]",
        "lines": 4
      },
      {
        "local_label": "57",
        "publisher_label": "568",
        "suffix": "(57) [568]",
        "lines": 4
      },
      {
        "local_label": "58",
        "publisher_label": "569",
        "suffix": "(58) [569]",
        "lines": 4
      },
      {
        "local_label": "59",
        "publisher_label": "570",
        "suffix": "[59] [570]",
        "lines": 4
      },
      {
        "local_label": "60",
        "publisher_label": "571",
        "suffix": "(60) [571]",
        "lines": 4
      },
      {
        "local_label": "61-62",
        "publisher_label": "572-573",
        "suffix": "(61-62) [572-573]",
        "lines": 8
      },
      {
        "local_label": "63",
        "publisher_label": "574",
        "suffix": "(63) [574]",
        "lines": 4
      },
      {
        "local_label": "64",
        "publisher_label": "575",
        "suffix": "(64) [575]",
        "lines": 4
      },
      {
        "local_label": "65-66",
        "publisher_label": "576-577",
        "suffix": "(65-66) [576-577]",
        "lines": 8
      },
      {
        "local_label": "67",
        "publisher_label": "578",
        "suffix": "(67) [578]",
        "lines": 4
      },
      {
        "local_label": "68",
        "publisher_label": "579",
        "suffix": "(68) [579]",
        "lines": 4
      },
      {
        "local_label": "69",
        "publisher_label": "580",
        "suffix": "(69) [580]",
        "lines": 4
      },
      {
        "local_label": "70",
        "publisher_label": "581",
        "suffix": "(70) [581]",
        "lines": 4
      },
      {
        "local_label": "71",
        "publisher_label": "582",
        "suffix": "(71) [582]",
        "lines": 4
      },
      {
        "local_label": "72",
        "publisher_label": "583",
        "suffix": "(72) [583]",
        "lines": 4
      },
      {
        "local_label": "73",
        "publisher_label": "584",
        "suffix": "(73) [584]",
        "lines": 4
      },
      {
        "local_label": "74",
        "publisher_label": "585",
        "suffix": "(74) [585]",
        "lines": 4
      },
      {
        "local_label": "75",
        "publisher_label": "586",
        "suffix": "(75) [586]",
        "lines": 4
      },
      {
        "local_label": "76",
        "publisher_label": "587",
        "suffix": "(76) [587]",
        "lines": 4
      },
      {
        "local_label": "77",
        "publisher_label": "588",
        "suffix": "(77) [588]",
        "lines": 4
      },
      {
        "local_label": "78",
        "publisher_label": "589",
        "suffix": "(78) [589]",
        "lines": 4
      },
      {
        "local_label": "79",
        "publisher_label": "590",
        "suffix": "(79) [590]",
        "lines": 4
      },
      {
        "local_label": "80",
        "publisher_label": "591",
        "suffix": "(80) [591]",
        "lines": 4
      },
      {
        "local_label": "81",
        "publisher_label": "592",
        "suffix": "(81) [592]",
        "lines": 4
      },
      {
        "local_label": "82",
        "publisher_label": "593",
        "suffix": "(82) [593]",
        "lines": 4
      },
      {
        "local_label": "83",
        "publisher_label": "594",
        "suffix": "(83) [594]",
        "lines": 4
      }
    ],
    "mapping_notes": [
      "Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Retain the independent VRI root and all explicit recension differences; no line alignment or missing words are inferred.",
      "True VRI384–467 ends8340.79printed stanza entries correspond to publisher globals511–594 includingfive combined pairs; source534 is BJTS-only per note29 and has no local label.",
      "Publisher521 physician/oil-to-bladder vs VRI394 child playing with oil in hand; root vejjo variant retained. Publisher522 flower vs VRI395 muñja/reed.",
      "Publisher530 presence/absence vs VRI403 saṅgama reading. Publisher568 personal wishes vs VRI441 they also wished.",
      "Publisher572 maternal self-guard wording differs from VRI445 reference to sons/husband. Note69 is incomplete in original publisher artifact and remains incomplete; no guessed BJTS reading.",
      "Publisher580 eight months vs VRI453 before half month. Publisher582 unparalleled beauty vs VRI455 no other companion (beauty variant retained). All85notes remain publisher editorial material."
    ],
    "index_revision": "apadana-theri11-20-v1"
  },
  "thi-ap20": {
    "id": "thi-ap20",
    "poem": 20,
    "verses": [
      595,
      638
    ],
    "root_verses": [
      468,
      511
    ],
    "note_count": 26,
    "note_numbers": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26
    ],
    "source": "apadana",
    "path": "/text/chapter-4/poem-020/",
    "url": "https://apadanatranslation.com/text/chapter-4/poem-020/",
    "raw_url": "https://raw.githubusercontent.com/apadana-translation/apadana-site/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-4/poem-020.md",
    "translator": "Jonathan S. Walters",
    "license": "CC BY-NC-SA 4.0",
    "translation_revision": "fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4",
    "title": "Paṭācārā",
    "reference": "Therī Apadāna 20; complete publisher-edition poem; original publisher numbering retained",
    "raw_sha256": "52e6c06170c5e7e23038d5e5d302c152476fa1bc5f4b287985b6b943bbd64d45",
    "body_sha256": "2222929d70fcd22ce76a37af71bc0e1a086afbee5226703602888b15a0bdfbb4",
    "notes_sha256": "0a516ec2cac11dc4e4e542429a0e7db44f7654011315b9e1a682040eca5888c4",
    "paratext_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "root_sha256": "0df732f6540bf82fe511ca848f8fb39ca6815a303d4f1e6a753b692704a785c7",
    "stanza_layout": [
      {
        "local_label": "1",
        "publisher_label": "595",
        "suffix": "(1) [595]",
        "lines": 4
      },
      {
        "local_label": "2",
        "publisher_label": "596",
        "suffix": "(2) [596]",
        "lines": 4
      },
      {
        "local_label": "3",
        "publisher_label": "597",
        "suffix": "(3) [597]",
        "lines": 4
      },
      {
        "local_label": "4",
        "publisher_label": "598",
        "suffix": "(4) [598]",
        "lines": 4
      },
      {
        "local_label": "5",
        "publisher_label": "599",
        "suffix": "(5) [599]",
        "lines": 4
      },
      {
        "local_label": "6",
        "publisher_label": "600",
        "suffix": "(6) [600]",
        "lines": 4
      },
      {
        "local_label": "7",
        "publisher_label": "601",
        "suffix": "(7) [601]",
        "lines": 4
      },
      {
        "local_label": "8",
        "publisher_label": "602",
        "suffix": "(8) [602]",
        "lines": 4
      },
      {
        "local_label": "9",
        "publisher_label": "603",
        "suffix": "(9) [603]",
        "lines": 4
      },
      {
        "local_label": "10",
        "publisher_label": "604",
        "suffix": "(10) [604]",
        "lines": 4
      },
      {
        "local_label": "11",
        "publisher_label": "605",
        "suffix": "(11) [605]",
        "lines": 4
      },
      {
        "local_label": "12",
        "publisher_label": "606",
        "suffix": "(12) [606]",
        "lines": 4
      },
      {
        "local_label": "13",
        "publisher_label": "607",
        "suffix": "(13) [607]",
        "lines": 4
      },
      {
        "local_label": "14",
        "publisher_label": "608",
        "suffix": "(14) [608]",
        "lines": 4
      },
      {
        "local_label": "15",
        "publisher_label": "609",
        "suffix": "(15) [609]",
        "lines": 4
      },
      {
        "local_label": "16-17",
        "publisher_label": "610-611",
        "suffix": "(16-17) [610-611]",
        "lines": 8
      },
      {
        "local_label": "18",
        "publisher_label": "612",
        "suffix": "(18) [612]",
        "lines": 4
      },
      {
        "local_label": "19",
        "publisher_label": "613",
        "suffix": "(19) [613]",
        "lines": 4
      },
      {
        "local_label": "20",
        "publisher_label": "614",
        "suffix": "(20) [614]",
        "lines": 4
      },
      {
        "local_label": "21",
        "publisher_label": "615",
        "suffix": "(21) [615]",
        "lines": 4
      },
      {
        "local_label": "22",
        "publisher_label": "616",
        "suffix": "(22) [616]",
        "lines": 4
      },
      {
        "local_label": "23",
        "publisher_label": "617",
        "suffix": "(23) [617]",
        "lines": 4
      },
      {
        "local_label": "24",
        "publisher_label": "618",
        "suffix": "(24) [618]",
        "lines": 4
      },
      {
        "local_label": "25",
        "publisher_label": "619",
        "suffix": "(25) [619]",
        "lines": 4
      },
      {
        "local_label": "26",
        "publisher_label": "620",
        "suffix": "(26) [620]",
        "lines": 4
      },
      {
        "local_label": "27",
        "publisher_label": "621",
        "suffix": "(27) [621]",
        "lines": 4
      },
      {
        "local_label": "28",
        "publisher_label": "622",
        "suffix": "(28) [622]",
        "lines": 4
      },
      {
        "local_label": "29",
        "publisher_label": "623",
        "suffix": "(29) [623]",
        "lines": 4
      },
      {
        "local_label": "30",
        "publisher_label": "624",
        "suffix": "(30) [624]",
        "lines": 4
      },
      {
        "local_label": "31",
        "publisher_label": "625",
        "suffix": "(31) [625]",
        "lines": 4
      },
      {
        "local_label": "32",
        "publisher_label": "626",
        "suffix": "(32) [626]",
        "lines": 4
      },
      {
        "local_label": "33",
        "publisher_label": "627",
        "suffix": "(33) [627]",
        "lines": 4
      },
      {
        "local_label": "34",
        "publisher_label": "628",
        "suffix": "(34) [628]",
        "lines": 4
      },
      {
        "local_label": "35",
        "publisher_label": "629",
        "suffix": "(35) [629]",
        "lines": 4
      },
      {
        "local_label": "36",
        "publisher_label": "630",
        "suffix": "(36) [630]",
        "lines": 4
      },
      {
        "local_label": "37",
        "publisher_label": "631",
        "suffix": "(37) [631]",
        "lines": 4
      },
      {
        "local_label": "38",
        "publisher_label": "632",
        "suffix": "(38) [632]",
        "lines": 4
      },
      {
        "local_label": "39",
        "publisher_label": "633",
        "suffix": "(39) [633]",
        "lines": 4
      },
      {
        "local_label": "40",
        "publisher_label": "634",
        "suffix": "(40) [634]",
        "lines": 4
      },
      {
        "local_label": "41",
        "publisher_label": "635",
        "suffix": "(41) [635]",
        "lines": 4
      },
      {
        "local_label": "42",
        "publisher_label": "636",
        "suffix": "(42) [636]",
        "lines": 4
      },
      {
        "local_label": "43",
        "publisher_label": "637",
        "suffix": "(43) [637]",
        "lines": 4
      },
      {
        "local_label": "44",
        "publisher_label": "638",
        "suffix": "(44) [638]",
        "lines": 4
      }
    ],
    "mapping_notes": [
      "Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Retain the independent VRI root and all explicit recension differences; no line alignment or missing words are inferred.",
      "True complete root8340–8478, poem body8340–8472, chapter summary8472–8478; next chapter/Kuṇḍalakesā1 begin8478.",
      "Publisher595–638 has43printed stanza entries, local16-17/global610-611 combined. VRI468–511 is44stanzas.",
      "Publisher609 calls third daughter Samaṇaguttā vs VRI482 Bhikkhunī; preserve both. Publisher618 husband not pleased vs VRI491 did not inform husband; publisher628 father vs VRI501 kin.",
      "Publisher chapter summary declares496stanzas; VRI summary declares509, while final VRI number is511. Do not reconcile these source counts. Summary exists only in PTS per original note27; BJTS omission remains disclosed."
    ],
    "index_revision": "apadana-theri11-20-v1",
    "chapter_summary": {
      "kind": "canonical_chapter_summary",
      "label": "Second Therī Apadāna chapter summary",
      "parent_id": "thi-ap20",
      "first_ref": "thi-ap20/48",
      "last_ref": "thi-ap20/51",
      "root_start": 8472,
      "root_end": 8478,
      "root_sha256": "3986f6f59952c43685b19cc37dc1d1977649e4b36cc5dd1521a2d56b6933ba7c",
      "body_sha256": "8701c0a6b7b5ea7736dd41f37afef0153653ee7efc8b9b33509ccb4eadacba64",
      "notes_sha256": "b6f6fec2b446374d7577d5ef365af6a75474404e751b9004fd3041ec9eb988d2",
      "note_numbers": [
        27
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
