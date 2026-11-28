/** Separate finite Therā extraction; never dispatch by a shared publisher poem number. */
import { THERA_APADANA_PROFILES } from './apadana-thera-profiles.mjs';
import { digest, plainMarkdown } from './apadana-presentation.mjs';
const fail = () => { throw new Error('Apadāna source metadata or content differs from the reviewed pinned publication.'); };
// These three pinned originals explicitly print BJTS-only fancy-brace headings.
// Their source ordering, canonical identities and printed labels are distinct.
const BJTS_ONLY_HEADINGS = Object.freeze({ 'tha-ap334': 332, 'tha-ap335': 333, 'tha-ap336': 334 });

// Only these reviewed pinned originals print both PTS and BJTS/file numbers.
// The raw paragraph/note owners bind every original display pair, including
// publisher346's five upper-case and three lower-case HTML pairs. Other source
// families, BJTS-only headings, markup and owner rules remain independent.
const MIXED_PTS_BJTS_HEADINGS = Object.freeze({
  "tha-ap337": {
    "poem": 335,
    "pts": 332,
    "raw_sha256": "d584d972d7a6009c74a9def1914607171090d3f0cf593189fdc135fd4d42d389",
    "heading_sha256": "892b755959a5c731bbcbf0d6be7acf8392938cce2badb2ffd3d0e4fd681a77d2",
    "paragraph_count": 17,
    "note_count": 20,
    "paragraph_pairs": {},
    "note_pairs": {
      "6": [
        [
          0,
          1
        ]
      ]
    }
  },
  "tha-ap338": {
    "poem": 336,
    "pts": 333,
    "raw_sha256": "98890461bc290bd3fb455e410e6a92fec9c7ff0b03cbe401e219274847463300",
    "heading_sha256": "9a36b8ea18411aa19201d1ee8cd665b285784e0446a3c164ae59963a71008a04",
    "paragraph_count": 23,
    "note_count": 22,
    "paragraph_pairs": {},
    "note_pairs": {
      "3": [
        [
          0,
          1
        ]
      ],
      "8": [
        [
          0,
          1
        ]
      ],
      "14": [
        [
          0,
          1
        ]
      ]
    }
  },
  "tha-ap339": {
    "poem": 337,
    "pts": 334,
    "raw_sha256": "24c71d29205c43f6bb0a5757cd760de2dad8ecf397dc941ce916426dc5d7fb9c",
    "heading_sha256": "c383ecea8d9ec54b9c50f277e60503a34a3b3e39704f42654e55021884fe83b6",
    "paragraph_count": 19,
    "note_count": 17,
    "paragraph_pairs": {},
    "note_pairs": {
      "13": [
        [
          0,
          1
        ]
      ],
      "15": [
        [
          0,
          3
        ]
      ]
    }
  },
  "tha-ap340": {
    "poem": 338,
    "pts": 335,
    "raw_sha256": "4b9be1a6694f7a8013c3b6a8a211cb7a472643f0ce393e8ed74e59a32366f56a",
    "heading_sha256": "6badddf2331b324d4d66cd465ff07ae97855c463211c6f9faf96bce01e3a8fbc",
    "paragraph_count": 24,
    "note_count": 26,
    "paragraph_pairs": {},
    "note_pairs": {
      "3": [
        [
          0,
          1
        ]
      ],
      "7": [
        [
          0,
          1
        ]
      ],
      "12": [
        [
          0,
          2
        ]
      ]
    }
  },
  "tha-ap341": {
    "poem": 339,
    "pts": 336,
    "raw_sha256": "277a106e651a0c97c52ceb05c88340c1052b0ab67c3c9c90a2d92ce4f4f374f2",
    "heading_sha256": "674df5093040ff6ae2a76b13af770e135bee852759df52ba883958633cd2dd5c",
    "paragraph_count": 21,
    "note_count": 23,
    "paragraph_pairs": {},
    "note_pairs": {
      "18": [
        [
          2,
          1
        ]
      ]
    }
  },
  "tha-ap342": {
    "poem": 340,
    "pts": 337,
    "raw_sha256": "42f279469173f83208828c9a4aa7d3dcf0f98fc1de013b2f1a769e8cdc3b5cdb",
    "heading_sha256": "5b811dbd663857458e68b5cedc0541232eef2cbd1d297070d9bf1632e1664cba",
    "paragraph_count": 19,
    "note_count": 8,
    "paragraph_pairs": {},
    "note_pairs": {
      "6": [
        [
          2,
          1
        ]
      ]
    }
  },
  "tha-ap343": {
    "poem": 341,
    "pts": 338,
    "raw_sha256": "d50e74153f047c2512a745fb9e5b7f215f4300c4e115190cee58e0549feb9c31",
    "heading_sha256": "6068d6fdcc469eded83c69f97af98192697e2b7f06f3913d5f3451fa4fa9d389",
    "paragraph_count": 13,
    "note_count": 11,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap344": {
    "poem": 342,
    "pts": 339,
    "raw_sha256": "240ca9e41dd5e29ebf479a5eebb62d998e181134da69813ea1421c79eecb1241",
    "heading_sha256": "b91b5ad052dd7d0117c5b7e7b26424b029d3141f0c5a09dbdbd2aa8fa25a61af",
    "paragraph_count": 12,
    "note_count": 6,
    "paragraph_pairs": {
      "1": [
        [
          1,
          1
        ]
      ]
    },
    "note_pairs": {}
  },
  "tha-ap345": {
    "poem": 343,
    "pts": 340,
    "raw_sha256": "2f8fdf0c82dcf2b93bf933e77fab59479c163043b4b9eb97bec1be29ae33c581",
    "heading_sha256": "eaedc9d059051a4254243214bedaa9c866652a6a1ef26c01440a846b55c98718",
    "paragraph_count": 10,
    "note_count": 6,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap346": {
    "poem": 344,
    "pts": 341,
    "raw_sha256": "e75eaf03a0a5054a032132af445ed385a9e11c61f585416001ee85bf3b9dbd41",
    "heading_sha256": "e03e02a5a5d2dfe803b2424dd6abbcf9d32bbe968003e90c92d355eb73dd7343",
    "paragraph_count": 7,
    "note_count": 8,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap347": {
    "poem": 345,
    "pts": 342,
    "raw_sha256": "1c6028fa7c65f1df3bfa79a7e2594a8e46f7086b4ed704d0d250c4c43344b273",
    "heading_sha256": "555f12cdb5b7338764d265fe7aa585f46a5b373a2a2356393733bef68ceeed66",
    "paragraph_count": 11,
    "note_count": 7,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap348": {
    "poem": 346,
    "pts": 343,
    "raw_sha256": "2c5a4fecb8f830c10f58109d0c29aac7f136e3264c8a4aea295616486a67dbf6",
    "heading_sha256": "03e46934925f32116a12bfb235973360720cd514073359cc5fb1f063aff7907b",
    "paragraph_count": 8,
    "note_count": 5,
    "paragraph_pairs": {
      "0": [
        [
          4,
          1
        ]
      ],
      "1": [
        [
          4,
          1
        ]
      ],
      "3": [
        [
          3,
          1
        ]
      ],
      "6": [
        [
          4,
          1
        ]
      ],
      "7": [
        [
          4,
          1
        ]
      ]
    },
    "note_pairs": {
      "2": [
        [
          3,
          1
        ],
        [
          4,
          1
        ]
      ],
      "3": [
        [
          3,
          1
        ]
      ]
    }
  },
  "tha-ap349": {
    "poem": 347,
    "pts": 344,
    "raw_sha256": "081829ee5ff04149dcc576b3937c68151726c0ada68bf94921e3e5549ce48d4d",
    "heading_sha256": "a57d44f425618be7f5c932e9d56b44c89718f1ee938f8537c31375cde084d8f2",
    "paragraph_count": 7,
    "note_count": 5,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap350": {
    "poem": 348,
    "pts": 345,
    "raw_sha256": "6db687c913c84f79fda8bd96aa15dabb95cc13ee4c8824cc03c56f09d942b262",
    "heading_sha256": "761d409e143febf3bdb00743c689eec2e050fda9a5bc1d6fd7d090cdadb4b1c4",
    "paragraph_count": 13,
    "note_count": 12,
    "paragraph_pairs": {},
    "note_pairs": {
      "7": [
        [
          0,
          1
        ]
      ]
    }
  },
  "tha-ap351": {
    "poem": 349,
    "pts": 346,
    "raw_sha256": "25a0755055dd28a6f7ed250bd644798a5c97471c4df26aa7dee4e3d4a5c9a383",
    "heading_sha256": "bce9f408e3a3b6ae2ba5207e3107e95519ea2db7f059cbf47402c8b3631c8d57",
    "paragraph_count": 7,
    "note_count": 6,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap352": {
    "poem": 350,
    "pts": 347,
    "raw_sha256": "df49aa382e3871129ed5626c2679c6665960ee1d1d45d53917e0923fe710e127",
    "heading_sha256": "41894a510ed3d72a9b290b5c373326aa56a184ddfd5530470774c45bd101e13d",
    "paragraph_count": 9,
    "note_count": 9,
    "paragraph_pairs": {
      "7": [
        [
          1,
          1
        ]
      ]
    },
    "note_pairs": {}
  },
  "tha-ap353": {
    "poem": 351,
    "pts": 348,
    "raw_sha256": "942ed1ea9f0b443d0aee952b672175ae16b489fea92093d4a77f322f587d1475",
    "heading_sha256": "d2c51985e06a8d2f787e856a2885e0906a2717ca92473e977c4ff3c8332c6be1",
    "paragraph_count": 9,
    "note_count": 8,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap354": {
    "poem": 352,
    "pts": 349,
    "raw_sha256": "66a57f11fe1e1a70e03f97d8c80796df61fa06c7bed45eb4ab894f148ef19b27",
    "heading_sha256": "c78f9f561a8a69c7a44e3d79b4ee1c16249eece3838384fc6fb320eda8f114e7",
    "paragraph_count": 8,
    "note_count": 4,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap355": {
    "poem": 353,
    "pts": 350,
    "raw_sha256": "58f9483eda4948652e5c9d087efd2a9ff6c771e81ec8fad59dcf9df589b92846",
    "heading_sha256": "e9503719fbd84e4142d9c8cb7a244f96856f18579439514d33b0f03ae48db338",
    "paragraph_count": 6,
    "note_count": 3,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap356": {
    "poem": 354,
    "pts": 351,
    "raw_sha256": "a4d1bd65e84529d5b84007c6efd154b69eeca1fe9afc51ece6f9c32d16feb68a",
    "heading_sha256": "237eabc1a017ea16d99f47e3884352d1035a54d0bbb47967e6ff68bc9e7c1843",
    "paragraph_count": 7,
    "note_count": 8,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap357": {
    "poem": 355,
    "pts": 352,
    "raw_sha256": "e8f764137cea90ab89b9e50a6ba56262952703337e661a11fd5a2474093174dd",
    "heading_sha256": "2e773a52f07203447fe67e7860a443ab379706aa01e1145991eda0140ff2b2ae",
    "paragraph_count": 7,
    "note_count": 4,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap358": {
    "poem": 356,
    "pts": 353,
    "raw_sha256": "5b548b2baf80c546b2fd4292d687b68485e8fe580a4be9e13a571b63b6472181",
    "heading_sha256": "6cc33872573dc605dbee8446519767f5e748c047fd166291309d61f29c831b1b",
    "paragraph_count": 7,
    "note_count": 4,
    "paragraph_pairs": {
      "2": [
        [
          2,
          1
        ]
      ]
    },
    "note_pairs": {}
  },
  "tha-ap359": {
    "poem": 357,
    "pts": 354,
    "raw_sha256": "42db12f6969557e8cfa71798e52af5c65d6294b988ae51f4c55b7d97e94fba77",
    "heading_sha256": "fc4f7d04d46fbf0c7c6d223f4d0e840ec09d88e961189216890d5ae2f0d45b1a",
    "paragraph_count": 7,
    "note_count": 2,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap361": {
    "poem": 359,
    "pts": 356,
    "raw_sha256": "c4407a8ca54f710c4cdfa4e33cb0dd11153de1b334c81e9618022bf172e34944",
    "heading_sha256": "64d0fef0d31abfb48865bfad1339a918ba8dfef12a98ff030c112a2c7b4430a8",
    "paragraph_count": 6,
    "note_count": 3,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap362": {
    "poem": 360,
    "pts": 357,
    "raw_sha256": "588a0ece97c85896e42977e6e7219536af3a264288f650aef8a0516d5dab5bf9",
    "heading_sha256": "0ee7cc0be26dbbfccfae6c0777774b5227b662cdac849bc3ed85ddd44a257e14",
    "paragraph_count": 10,
    "note_count": 2,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap373": {
    "poem": 371,
    "pts": 368,
    "raw_sha256": "f3bebeb81616e44cd1c87c054b593618c07401f9b1866d4c9f0bbe176e6103ac",
    "heading_sha256": "f69e7c3f09f51426a36ab726919e24df983831bf1b5f2103fd210dfa2fdc8c20",
    "paragraph_count": 8,
    "note_count": 9,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap374": {
    "poem": 372,
    "pts": 369,
    "raw_sha256": "d427dae50e37a941b5274729e956d386622563ce16bed5fb244450e9fee18638",
    "heading_sha256": "4dd76ca322033da3abd1db06d1aceaf701bc239e64b5c9b55f1a6c06f068d7f0",
    "paragraph_count": 9,
    "note_count": 6,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap376": {
    "poem": 374,
    "pts": 371,
    "raw_sha256": "c4d55fb9316a07ab430aec7e59c67f52cb18a2ce0f63c7220c0b958f20b52fee",
    "heading_sha256": "1f14a5c5ac812accface4398bca707c38d6e77339685de6c189f084d7f94157b",
    "paragraph_count": 9,
    "note_count": 7,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap377": {
    "poem": 375,
    "pts": 372,
    "raw_sha256": "5fcab2c0af6a2eb7c5e8313a2aed97ddc9dee546d2b08645f64ff3fd99ed4d08",
    "heading_sha256": "1a38071abdf7de648692ece6374bb2317ffa652f7bb5d3b492ffeace5f531d52",
    "paragraph_count": 8,
    "note_count": 4,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap378": {
    "poem": 376,
    "pts": 373,
    "raw_sha256": "8e4fb8a1753528c6f4627c38590262afc349eec992eb987b73b1feba5b992211",
    "heading_sha256": "f62c01f3b8f8ed2bc6b67815cb3167ca5984157a90eec7cc0090d3676bca4201",
    "paragraph_count": 8,
    "note_count": 7,
    "paragraph_pairs": {},
    "note_pairs": {
      "3": [
        [
          0,
          3
        ]
      ]
    }
  },
  "tha-ap379": {
    "poem": 377,
    "pts": 374,
    "raw_sha256": "be18eca83cc2102178e6e0d086ed8723c9ac7795a26b1bae20a2fa7a7c774811",
    "heading_sha256": "ae784dcbda196a7fdf2e11cd6ed91765435ba78049bb3cb28683bff68b85b524",
    "paragraph_count": 8,
    "note_count": 5,
    "paragraph_pairs": {
      "0": [
        [
          1,
          1
        ]
      ],
      "6": [
        [
          1,
          1
        ]
      ],
      "7": [
        [
          1,
          1
        ]
      ]
    },
    "note_pairs": {}
  },
  "tha-ap380": {
    "poem": 378,
    "pts": 375,
    "raw_sha256": "898d21bf93b7a7ed5c1bbc6533c263f6766095dc35907577cde20283ebe0a186",
    "heading_sha256": "7c6a7af6e8ffadee4f98bf26b08fe1085e9594552532eccbe66a17037074d690",
    "paragraph_count": 8,
    "note_count": 4,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap383": {
    "poem": 381,
    "pts": 378,
    "raw_sha256": "2f3020478e27fabb0ad40b94ce45659d4e10db7c91a509455d3f949de9e640d5",
    "heading_sha256": "f7edd23d7fe761a6791f9cf8474497512254aedb5c26c33c4f497e70b709914a",
    "paragraph_count": 10,
    "note_count": 4,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap385": {
    "poem": 383,
    "pts": 380,
    "raw_sha256": "6a67971063c6c4dc4fd4a45c0d1b913318b1e820d26b4b9991772ad61a6cc812",
    "heading_sha256": "4113f4ce67ac274a5dd6b34334b5f7ee03a3ad415516c82e7fe83a55a1262171",
    "paragraph_count": 9,
    "note_count": 6,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap386": {
    "poem": 384,
    "pts": 381,
    "raw_sha256": "05d26e53292e293381d9235bf4fa4a114c0452e529f3c81197fa494827463ea1",
    "heading_sha256": "18ddbff2dba5f730b910569f2aee9027b197b8db56580e8052104db1330a26b4",
    "paragraph_count": 8,
    "note_count": 4,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap387": {
    "poem": 385,
    "pts": 382,
    "raw_sha256": "6490e8e6fb6f07cbf1f18ad7b9dfba7a07b0773830f0d2dd0057f3f935168140",
    "heading_sha256": "f5d2f34c85a5d18696816b5af2899404493e05192146ba69d71bb316ac16cd22",
    "paragraph_count": 8,
    "note_count": 3,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap388": {
    "poem": 386,
    "pts": 383,
    "raw_sha256": "b35e1657e1f0036ebf5de1c5f82ad47b15556aa787439aebaa728d2092cfa835",
    "heading_sha256": "f7041be003bdcd83f7566da7d355b61b4d02abcdeb7191249f78d7fec5af843b",
    "paragraph_count": 9,
    "note_count": 3,
    "paragraph_pairs": {},
    "note_pairs": {}
  },
  "tha-ap403": {
    "poem": 401,
    "pts": 398,
    "raw_sha256": "acd65e79f98f11239870504f054002cc440339a375e77033800649d99bf91bc9",
    "heading_sha256": "c756b3f49219aba48d7142b176e749712f7c27057e891068f2248032b204a903",
    "paragraph_count": 32,
    "note_count": 19,
    "paragraph_pairs": {},
    "note_pairs": {
      "7": [
        [
          0,
          1
        ]
      ]
    }
  },
  "tha-ap404": {
    "poem": 402,
    "pts": 399,
    "raw_sha256": "36ab4b64da98ca50626ff3f9c9d86fc34f53b1405b47ba2e9d60dda6a5d99740",
    "heading_sha256": "2dfda0f2f797948c80d2d59d82926ba85a3910064cfc88798fa721b5a6c0ed61",
    "paragraph_count": 18,
    "note_count": 17,
    "paragraph_pairs": {},
    "note_pairs": {
      "4": [
        [
          0,
          1
        ]
      ],
      "6": [
        [
          0,
          3
        ]
      ],
      "17": [
        [
          0,
          1
        ]
      ]
    }
  }
});
const MIXED_DISPLAY_TOKENS = Object.freeze([
  "[c]{.diacritics data-state=on}[ch]{.no-diacritics data-state=off}",
  "[C]{.diacritics data-state=on}[Ch]{.no-diacritics data-state=off}",
  "[cc]{.diacritics data-state=on}[chch]{.no-diacritics data-state=off}",
  "<span class=\"diacritics\" data-state=\"on\">c</span><span class=\"no-diacritics\" data-state=\"off\">ch</span>",
  "<span class=\"diacritics\" data-state=\"on\">C</span><span class=\"no-diacritics\" data-state=\"off\">Ch</span>"
]);

function reviewedMixedSourceOwners(poem, entries, profile) {
  const scope = MIXED_PTS_BJTS_HEADINGS[profile.id];
  if (!scope) return;
  if (profile.poem !== scope.poem || profile.raw_sha256 !== scope.raw_sha256
    || profile.publisher_heading_sha256 !== scope.heading_sha256
    || profile.note_count !== scope.note_count) fail();
  const paragraphs = poem.split('\n\n');
  if (paragraphs.length !== scope.paragraph_count || entries.length !== scope.note_count) fail();
  const check = (value, expected) => {
    let remaining = value;
    for (const [index, count] of expected) {
      const token = MIXED_DISPLAY_TOKENS[index];
      if (!token || remaining.split(token).length !== count + 1) fail();
      remaining = remaining.split(token).join('');
    }
    if (/\{\.(?:no-)?diacritics\b|<span\b/.test(remaining)) fail();
  };
  for (const [i, paragraph] of paragraphs.entries()) check(paragraph, scope.paragraph_pairs[i] || []);
  for (const entry of entries) check(entry[2], scope.note_pairs[entry[1]] || []);
}


/** Only the exact Sobhita artifact combines original labels in physical paragraphs. */
export function theraMultiLabelQuotation(paragraph, stanza, profile, index) {
  const known = THERA_APADANA_PROFILES[profile?.id];
  if (profile?.id !== 'tha-ap133' || profile.poem !== 131 || !known
    || ![2, 5].includes(index) || JSON.stringify(stanza) !== JSON.stringify(known.stanza_layout[index])
    || stanza.finite_multi_label !== true || stanza.paragraph !== index + 1
    || stanza.lines !== (index === 2 ? 12 : 8) || stanza.entries.length !== (index === 2 ? 3 : 2)) fail();
  const lines = paragraph.replace(/\[Note \d+\]/g, '').trim().split('\n');
  if (lines.length !== stanza.lines) fail();
  for (const [i, entry] of stanza.entries.entries()) {
    if (entry.line !== (i + 1) * 4 || !entry.suffix || !lines[entry.line - 1].endsWith(entry.suffix)) fail();
    lines[entry.line - 1] = lines[entry.line - 1].slice(0, -entry.suffix.length).trimEnd();
  }
  return lines.join('\n');
}

/** The exact208 artifact shares its heading and first stanza in one paragraph.
 * These five literal selectors preserve the body; they are not a selector grammar.
 * Independent source-review hashes bind the heading, physical paragraph and each
 * selected entry before this helper returns any quotation words.
 */
export function theraJoinedHeadingStanza(paragraphs, stanza, profile, index) {
  const known = THERA_APADANA_PROFILES[profile?.id];
  const entryPins = [
    '43c7716457f885548bdbdfad7513748f2b2158f7071e2cd8ebf7c9327cbce5fa',
    '5239342f4d5ab74d39857c87b18040d5a10a360b2e36d1114bc9fa11a2bdf73c',
    '1315d2eb2c1af78f09d7c0415bbbf0acd60e17509403cfa88518d320b1462013',
    '654b8629d9de28da53723a21c230f836a8c0c4bc21696c893bced0dae7415eb6',
    'b4e1c4f75ab4dd1966238d108fa34c773067eac526cfe2115db1a46259ebb42f',
  ];
  if (profile?.id !== 'tha-ap210' || profile.poem !== 208 || !known
    || JSON.stringify(profile) !== JSON.stringify(known)
    || known.raw_sha256 !== 'd616cbea21dc15386ee4253c6c73e053380e35d62f6e88e8b8052a8d93213a76'
    || !Number.isInteger(index) || index < 0 || index > 4 || known.stanza_layout.length !== 5
    || JSON.stringify(stanza) !== JSON.stringify(known.stanza_layout[index])
    || Object.keys(stanza).sort().join(',') !== 'first_line,lines,local_label,paragraph,publisher_label,suffix'
    || stanza.paragraph !== index || stanza.first_line !== [2, 1, 1, 1, 1][index] || stanza.lines !== 4
    || !Array.isArray(paragraphs) || paragraphs.length !== 7
    || digest(paragraphs[0]) !== '5a66ec001d3cc36f1f1546a3f72cfe92abfda97e3335791af9b818934c13e330'
    || digest(paragraphs[0].split('\n')[0]) !== '2a9ae565ec013f54a8f5d6b036ca95a8a6e3d8a65d955debdc3704999bfb3882') fail();
  const lines = paragraphs[stanza.paragraph].split('\n');
  if (lines.length !== stanza.lines + stanza.first_line - 1) fail();
  const selected = lines.slice(stanza.first_line - 1).join('\n');
  if (digest(selected) !== entryPins[index]) fail();
  return selected;
}

export function parseTheraApadana(raw, profile) {
  const known = THERA_APADANA_PROFILES[profile?.id];
  if (!known || JSON.stringify(profile) !== JSON.stringify(known) || digest(raw) !== known.raw_sha256
    || profile.publisher_chapter !== 'chapter-3') fail();
  // This exact file keeps original order235 beside printed poem234. Its
  // filename/path and raw pin identify it independently of the sorting value.
  let expectedOrder = profile.poem;
  if (profile.id === 'tha-ap236') {
    if (profile.poem !== 234 || profile.path !== '/text/chapter-3/poem-234/'
      || profile.raw_sha256 !== '24e6aa7f6352e29fa850811602ce63084197d3aab66953a203b3cbe53d26a91a') fail();
    expectedOrder = 235;
  }
  const front = raw.match(/^---\n([^]*?)\n---\n/);
  if (!front || !new RegExp(`^order: ${expectedOrder}$`, 'm').test(front[1]) || !/^category: chapter-3$/m.test(front[1])) fail();
  const title = front[1].match(/^title: (.+)$/m)?.[1]; if (title !== profile.title) fail();
  const present = value => {
    // Only source346 has this upper-case HTML pair; its exact source owners
    // are validated before any call below. Lower-case and Pandoc rendering
    // retain the existing shared presentation and literal [Note n] markers.
    if (profile.id === 'tha-ap348') value = value.replaceAll('<span class="diacritics" data-state="on">C</span><span class="no-diacritics" data-state="off">Ch</span>', 'C');
    return plainMarkdown((['tha-ap42', 'tha-ap121'].includes(profile.id) ? value.replace(/<span class="diacritics" data-state="on">(c|cc)<\/span><span class="no-diacritics" data-state="off">(ch|chch)<\/span>/g, (_all, diacritic, alternate) => {
    // Only this exact reviewed artifact has both single and doubled alternatives.
    if (alternate !== (diacritic === 'c' ? 'ch' : 'chch')) fail();
    return diacritic;
  }) : value)
    .replace(/<dfn id="#(?:PTS|BJTS)">([^]*?)<\/dfn>/g, '$1')
    .replace(/<a href="#(?:PTS|BJTS)" class="abbr">([^<>]*)<\/a>/g, '$1')
    .replace(/<span class="diacritics" data-state="on">c<\/span><span class="no-diacritics" data-state="off">ch<\/span>/g, 'c'));
  };
  const rest = raw.slice(front[0].length).trim(), at = rest.search(/^\[\^\d+\]:/m);
  // Only these exact reviewed artifacts have no translator-note definitions.
  if (at < 0 && (!['tha-ap30', 'tha-ap88'].includes(profile.id) || profile.note_count !== 0 || profile.note_numbers.length)) fail();
  let poem = at < 0 ? rest : rest.slice(0, at).trim();
  const entries = [...(at < 0 ? '' : rest.slice(at)).matchAll(/^\[\^(\d+)\]:[ \t]*([^]*?)(?=^\[\^\d+\]:|(?![^]))/gm)];
  reviewedMixedSourceOwners(poem, entries, profile);
  // Only the exact263 artifact owns these three HTML c/ch displays: its
  // heading and both colophons. Keep their state-on spelling through the
  // existing renderer, refusing duplicate/off-only/foreign-owner controls.
  if (profile.id === 'tha-ap265') {
    if (profile.poem !== 263 || profile.path !== '/text/chapter-3/poem-263/'
      || profile.raw_sha256 !== 'bd26ab528dfcfbb8a74ac61ebb3c313803c0f90b0eb686de5829a9ab0f383755') fail();
    const token = '<span class="diacritics" data-state="on">c</span><span class="no-diacritics" data-state="off">ch</span>';
    const checkHtmlPairs = (value, count) => {
      if (value.split(token).length !== count + 1
        || /<span\b[^>]*\bclass="(?:no-)?diacritics"/.test(value.split(token).join(''))) fail();
    };
    const paragraphs = poem.split('\n\n');
    if (paragraphs.length !== 7) fail();
    for (const [i, paragraph] of paragraphs.entries()) checkHtmlPairs(paragraph, [0, 5, 6].includes(i) ? 1 : 0);
    for (const entry of entries) checkHtmlPairs(entry[2], 0);
  }
  // These new exact artifacts use only the established Pandoc display syntax.
  // Bind every reviewed pair to its source paragraph or note before rendering.
  if (['tha-ap238', 'tha-ap242'].includes(profile.id)) {
    const upper = '[C]{.diacritics data-state=on}[Ch]{.no-diacritics data-state=off}';
    const lower = '[c]{.diacritics data-state=on}[ch]{.no-diacritics data-state=off}';
    const checkPairs = (value, expected) => {
      let remaining = value;
      for (const token of expected) {
        if (remaining.split(token).length !== 2) fail();
        remaining = remaining.replace(token, '');
      }
      if (/\{\.(?:no-)?diacritics\b/.test(remaining)) fail();
    };
    if (profile.id === 'tha-ap238') {
      const paragraphs = poem.split('\n\n');
      if (paragraphs.length !== 7) fail();
      for (const [i, paragraph] of paragraphs.entries()) checkPairs(paragraph, i === 3 ? [upper] : []);
    } else checkPairs(poem, []);
    for (const [i, entry] of entries.entries()) {
      checkPairs(entry[2], i === 1 ? (profile.id === 'tha-ap238' ? [lower, upper] : [lower]) : []);
    }
  }
  // Publisher253/254/256 have these fourteen exact source-owned display pairs.
  // Preserve the reviewed heading/colophon and stanza coordinates, including
  // duplicate lower-case pairs inside individual notes; accept no extra pair.
  if (['tha-ap255', 'tha-ap256', 'tha-ap258'].includes(profile.id)) {
    const upper = '[C]{.diacritics data-state=on}[Ch]{.no-diacritics data-state=off}';
    const lower = '[c]{.diacritics data-state=on}[ch]{.no-diacritics data-state=off}';
    const checkPairs = (value, expected) => {
      let remaining = value;
      for (const [token, count] of expected) {
        if (remaining.split(token).length !== count + 1) fail();
        remaining = remaining.split(token).join('');
      }
      if (/\{\.(?:no-)?diacritics\b/.test(remaining)) fail();
    };
    const paragraphs = poem.split('\n\n');
    if (paragraphs.length !== (profile.id === 'tha-ap258' ? 6 : 7)) fail();
    for (const [i, paragraph] of paragraphs.entries()) {
      const expected = profile.id === 'tha-ap258' ? (i === 1 ? [[upper, 1]] : [])
        : [0, 5, 6].includes(i) ? [[profile.id === 'tha-ap255' ? upper : lower, 1]] : [];
      checkPairs(paragraph, expected);
    }
    for (const [i, entry] of entries.entries()) {
      const expected = profile.id === 'tha-ap255' ? (i === 0 ? [[upper, 1], [lower, 2]] : i === 2 ? [[lower, 2]] : [])
        : profile.id === 'tha-ap256' && i === 0 ? [[upper, 1], [lower, 1]] : [];
      checkPairs(entry[2], expected);
    }
  }
  // Six reviewed321/323-326/329 artifacts use only these source-owned
  // Pandoc alternatives. Existing presentation keeps state-on spelling; these
  // finite owners do not authorize new markup, moved notes or chapter text.
  if (['tha-ap323', 'tha-ap325', 'tha-ap326', 'tha-ap327', 'tha-ap328', 'tha-ap331'].includes(profile.id)) {
    const lower = '[c]{.diacritics data-state=on}[ch]{.no-diacritics data-state=off}';
    const upper = '[C]{.diacritics data-state=on}[Ch]{.no-diacritics data-state=off}';
    const counts = { 'tha-ap323': 10, 'tha-ap325': 7, 'tha-ap326': 13, 'tha-ap327': 9, 'tha-ap328': 7, 'tha-ap331': 11 };
    const paragraphs = poem.split('\n\n');
    if (paragraphs.length !== counts[profile.id]) fail();
    const check = (value, token) => {
      if (token && value.split(token).length !== 2) fail();
      if (/\{\.(?:no-)?diacritics\b/.test(token ? value.replace(token, '') : value)) fail();
    };
    for (const [i, paragraph] of paragraphs.entries()) {
      const token = profile.id === 'tha-ap323' && i === 6 ? lower
        : profile.id === 'tha-ap327' && i === 1 ? upper
        : profile.id === 'tha-ap331' && [0, 9, 10].includes(i) ? lower : undefined;
      check(paragraph, token);
    }
    for (const entry of entries) check(entry[2], profile.id === 'tha-ap326' && entry[1] === '7' ? lower : undefined);
  }
  // Publisher226 alone owns these two exact paired note displays. The existing
  // presentation rule keeps the state-on spelling; no new grammar is accepted.
  const pairedNotes = profile.id === 'tha-ap228' ? {
    1: '[C]{.diacritics data-state=on}[Ch]{.no-diacritics data-state=off}',
    3: '[cc]{.diacritics data-state=on}[chch]{.no-diacritics data-state=off}',
  } : undefined;
  if (pairedNotes && /\{\.(?:no-)?diacritics\b/.test(poem)) fail();
  const notes = entries.map((entry, i) => {
    if (Number(entry[1]) !== i + 1 || !entry[2].trim()) fail();
    if (pairedNotes) {
      const expected = pairedNotes[i + 1];
      if (expected && entry[2].split(expected).length !== 2
        || /\{\.(?:no-)?diacritics\b/.test(expected ? entry[2].replace(expected, '') : entry[2])) fail();
    }
    return { number: i + 1, text: present(entry[2]) };
  });
  const notesFor = numbers => numbers.map(number => { const note = notes[number - 1]; if (!note || note.number !== number) fail(); return note; });
  const refs = (value, numbers) => {
    const found = [...value.matchAll(/\[\^(\d+)\]/g)].map(m => Number(m[1]));
    if (found.some(n => !numbers.includes(n)) || numbers.some(n => !found.includes(n))) fail();
  };
  let editorial_gap;
  if (profile.editorial_gap) {
    // Only this reviewed raw artifact has an independently owned editorial gap.
    // Its original wording is read live and verified by the sidecar hash, never supplied here.
    const scope = profile.editorial_gap;
    if (profile.id !== 'tha-ap44' || profile.poem !== 42
      || scope.kind !== 'publisher_editorial_gap' || scope.parent_id !== profile.id
      || scope.placement !== 'before_local_label' || scope.after_local_label !== '25'
      || scope.after_publisher_label !== '1164' || scope.before_local_label !== '26'
      || scope.before_publisher_label !== '1165' || JSON.stringify(scope.note_numbers) !== '[12]'
      || Object.keys(scope).length !== 10) fail();
    const parts = poem.split('\n\n'), marker = parts[26];
    if (parts.length !== 32 || !marker || marker.length !== 16 || marker.includes('\n')) fail();
    const before = present(parts[25]).replace(/\[Note \d+\]/g, '').trim();
    const after = present(parts[27]).replace(/\[Note \d+\]/g, '').trim();
    if (!before.endsWith('(25) [1164]') || !after.endsWith('(26) [1165]')) fail();
    refs(marker, scope.note_numbers);
    const text = present(marker), translator_notes = notesFor(scope.note_numbers);
    if (digest(text) !== scope.body_sha256 || digest(JSON.stringify(translator_notes)) !== scope.notes_sha256) fail();
    editorial_gap = { ...scope, text, translator_notes };
    poem = [...parts.slice(0, 26), ...parts.slice(27)].join('\n\n');
  }
  let publisher_divisions;
  if (profile.publisher_divisions) {
    if (profile.publisher_divisions.length !== 1) fail();
    const scope = profile.publisher_divisions[0];
    let marker;
    if (profile.id === 'tha-ap51') {
      // In this exact artifact the recitation heading shares a paragraph with stanza15.
      // Remove only its original line; the four following stanza lines stay together.
      marker = '\n\nThe Fifth Recitation Portion.  \n';
      const parts = poem.split(marker);
      if (parts.length !== 2 || scope.before_local_label !== '15' || scope.before_publisher_label !== '1229') fail();
      const stanza = present(parts[1].split('\n\n')[0]);
      if (stanza.split('\n').length !== 4 || !stanza.endsWith('(15) [1229]')) fail();
      poem = parts.join('\n\n');
    } else {
      marker = ({17: '\n\nThe Third Recitation Portion is Finished.', 30: '\n\nThe Fourth Recitation Portion.', 74: '\n\nThe Sixth Recitation Portion.'})[profile.poem];
      if (!marker || !poem.endsWith(marker) || poem.split(marker).length !== 2
        || scope.parent_id !== profile.id || scope.placement !== ([17, 74].includes(profile.poem) ? 'after_poem' : 'after_chapter_summary')) fail();
      poem = poem.slice(0, -marker.length);
    }
    const text = present(marker), translator_notes = notesFor(scope.note_numbers);
    refs(marker, scope.note_numbers);
    if (digest(text) !== scope.body_sha256 || digest(JSON.stringify(translator_notes)) !== scope.notes_sha256) fail();
    publisher_divisions = [{ ...scope, text, translator_notes }];
  }
  let collection_summary;
  if (profile.collection_summary) {
    // Each hundred's endmatter is distinct from its separately owned chapter.
    if (!((profile.id === 'tha-ap102' && profile.poem === 100)
      || (profile.id === 'tha-ap202' && profile.poem === 200))) fail();
    const marker = '\n\nThen there is the Summary of Chapters:\n\n', parts = poem.split(marker);
    if (parts.length !== 2) fail();
    poem = parts[0];
    const summaryRaw = marker.trim() + '\n\n' + parts[1], text = present(summaryRaw), translator_notes = notesFor(profile.collection_summary.note_numbers);
    refs(summaryRaw, profile.collection_summary.note_numbers);
    if (digest(text) !== profile.collection_summary.body_sha256 || digest(JSON.stringify(translator_notes)) !== profile.collection_summary.notes_sha256) fail();
    collection_summary = { ...profile.collection_summary, text, translator_notes };
  }
  let chapter_summary;
  if (profile.chapter_summary) {
    if (['tha-ap342', 'tha-ap352', 'tha-ap362'].includes(profile.id)) {
      const scope = profile.chapter_summary;
      if (Object.keys(scope).sort().join(',') !== 'body_sha256,first_ref,kind,label,last_ref,note_numbers,notes_sha256,parent_id,root_end,root_sha256,root_start'
        || scope.kind !== 'canonical_chapter_summary' || scope.parent_id !== profile.id
        || JSON.stringify(scope.note_numbers) !== '[]') fail();
    }
    if (!['tha-ap22', 'tha-ap32', 'tha-ap42', 'tha-ap52', 'tha-ap62', 'tha-ap82', 'tha-ap92', 'tha-ap102', 'tha-ap112', 'tha-ap122', 'tha-ap132', 'tha-ap152', 'tha-ap162', 'tha-ap172', 'tha-ap182', 'tha-ap192', 'tha-ap202', 'tha-ap212', 'tha-ap222', 'tha-ap252', 'tha-ap232', 'tha-ap242', 'tha-ap272', 'tha-ap312', 'tha-ap342', 'tha-ap352', 'tha-ap362'].includes(profile.id)) fail();
    // Publisher230 joins its summary heading to the verse paragraph. Keep the
    // exact original hard break, with no synthetic blank paragraph after it.
    const marker = profile.id === 'tha-ap232' ? '\n\nThe Summary:  \n' : '\n\nThe Summary:\n\n';
    const parts = poem.split(marker); if (parts.length !== 2) fail();
    poem = parts[0];
    const summaryRaw = profile.id === 'tha-ap232' ? marker.slice(2) + parts[1] : marker.trim() + '\n\n' + parts[1];
    const text = present(summaryRaw), translator_notes = notesFor(profile.chapter_summary.note_numbers);
    refs(summaryRaw, profile.chapter_summary.note_numbers);
    if (digest(text) !== profile.chapter_summary.body_sha256 || digest(JSON.stringify(translator_notes)) !== profile.chapter_summary.notes_sha256) fail();
    chapter_summary = { ...profile.chapter_summary, text, translator_notes };
  }
  const owned = [...profile.note_numbers, ...(profile.publisher_preface?.note_numbers || []), ...(profile.editorial_gap?.note_numbers || []), ...(profile.chapter_summary?.note_numbers || []), ...(profile.collection_summary?.note_numbers || []), ...(profile.publisher_divisions || []).flatMap(s => s.note_numbers)];
  if (new Set(owned).size !== owned.length || owned.length !== notes.length || notes.some(n => !owned.includes(n.number))) fail();
  // Publisher101 alone uses ## for its poem heading, beside a separate ## preface.
  const headings = [...poem.matchAll(profile.id === 'tha-ap103' ? /^## \\\[101\. /gm : /^### /gm)]; if (headings.length !== 1) fail();
  const split = headings[0].index; if (['tha-ap13', 'tha-ap23', 'tha-ap33', 'tha-ap43', 'tha-ap53', 'tha-ap63', 'tha-ap73', 'tha-ap83', 'tha-ap93', 'tha-ap103', 'tha-ap113', 'tha-ap123', 'tha-ap133', 'tha-ap143', 'tha-ap153', 'tha-ap163', 'tha-ap173', 'tha-ap183', 'tha-ap193', 'tha-ap203', 'tha-ap213', 'tha-ap243', 'tha-ap223', 'tha-ap233', 'tha-ap253', 'tha-ap263', 'tha-ap273', 'tha-ap283', 'tha-ap323', 'tha-ap333', 'tha-ap343', 'tha-ap353', 'tha-ap373', 'tha-ap383', 'tha-ap403'].includes(profile.id) !== (split > 0)) fail();
  const preface = poem.slice(0, split), body = poem.slice(split); refs(body, profile.note_numbers);
  const publisher_paratext = present(preface), text = present(body), translator_notes = notesFor(profile.note_numbers), paragraphs = text.split(/\n\n+/);
  let publisher_preface;
  if (profile.publisher_preface) {
    const scope = profile.publisher_preface;
    if (profile.id !== 'tha-ap333' || profile.poem !== 331
      || Object.keys(scope).sort().join(',') !== 'body_sha256,kind,label,note_numbers,notes_sha256,parent_id'
      || scope.kind !== 'publisher_preface' || scope.parent_id !== profile.id
      || scope.label !== 'Thirty-fourth Therā chapter preface'
      || JSON.stringify(scope.note_numbers) !== '[1]' || scope.body_sha256 !== profile.paratext_sha256) fail();
    refs(preface, scope.note_numbers);
    const notes = notesFor(scope.note_numbers);
    if (digest(publisher_paratext) !== scope.body_sha256 || digest(JSON.stringify(notes)) !== scope.notes_sha256) fail();
    // The preface wording remains solely in publisher_paratext; note1 stays editorial.
    publisher_preface = { ...scope, translator_notes: notes };
  } else refs(preface, []);
  const bjtsPoem = BJTS_ONLY_HEADINGS[profile.id], mixedHeading = MIXED_PTS_BJTS_HEADINGS[profile.id];
  if (Object.hasOwn(profile, 'publisher_heading_sha256') !== (bjtsPoem !== undefined || mixedHeading !== undefined)) fail();
  const headingMatches = mixedHeading !== undefined
    ? profile.poem === mixedHeading.poem && profile.raw_sha256 === mixedHeading.raw_sha256
      && profile.publisher_heading_sha256 === mixedHeading.heading_sha256
      && digest(paragraphs[0]) === mixedHeading.heading_sha256
      && paragraphs[0].startsWith(`[${mixedHeading.pts}. {${mixedHeading.poem}.}`)
    : bjtsPoem === undefined ? paragraphs[0].startsWith(`[${profile.poem}. `)
      : profile.poem === bjtsPoem && /^[a-f0-9]{64}$/.test(profile.publisher_heading_sha256)
        && digest(paragraphs[0]) === profile.publisher_heading_sha256
        && paragraphs[0].startsWith(`{*${bjtsPoem}, BJTS only: `)
        && profile.stanza_layout.every(stanza => stanza.local_label === null);
  const joinedColophons = ['tha-ap134', 'tha-ap184'].includes(profile.id);
  const colophons = joinedColophons ? paragraphs.at(-1).split('\n') : paragraphs.slice(-2);
  if (paragraphs.length !== profile.stanza_layout.length + (joinedColophons || profile.id === 'tha-ap210' ? 2 : 3) || !headingMatches
    || colophons.length !== 2
    || !(profile.id === 'tha-ap34' ? /^This indeed / : profile.id === 'tha-ap48' ? /^Thus indeed, / : /^Thus indeed /).test(colophons[0])
    || !(['tha-ap33', 'tha-ap45'].includes(profile.id) ? /^The Legend of / : /^The legend of /).test(colophons[1])
    || translator_notes.length !== profile.note_count || digest(text) !== profile.body_sha256
    || digest(JSON.stringify(translator_notes)) !== profile.notes_sha256 || digest(publisher_paratext) !== profile.paratext_sha256) fail();
  for (const [i, stanza] of profile.stanza_layout.entries()) {
    if (stanza.finite_multi_label) { theraMultiLabelQuotation(paragraphs[i + 1], stanza, profile, i); continue; }
    const entry = profile.id === 'tha-ap210' ? theraJoinedHeadingStanza(paragraphs, stanza, profile, i) : paragraphs[i + 1];
    if (!stanza.suffix || entry.split('\n').length !== stanza.lines
      || !entry.replace(/\[Note \d+\]/g, '').trim().endsWith(stanza.suffix)) fail();
  }
  return { title, text, translator_notes, publisher_paratext, ...(publisher_preface ? {publisher_preface} : {}), ...(editorial_gap ? {editorial_gap} : {}), ...(chapter_summary ? {chapter_summary} : {}), ...(collection_summary ? {collection_summary} : {}), ...(publisher_divisions ? {publisher_divisions} : {}) };
}
