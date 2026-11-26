/** Exact finite source inverses preserve every old104 assertion and fixture byte. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=value=>createHash('sha256').update(value).digest('hex');
const fixture={
  "rules": {
    "tests/helpers/apadana-intake-expectations.mjs": [
      {
        "before": "import {thera301310Evidence} from './thera301-310-evidence.mjs';\n",
        "after": "import {thera301310Evidence} from './thera301-310-evidence.mjs';\nimport {publisher333Authority,requireHistorical325Maps} from './thera333-legacy-projection.mjs';\n",
        "occurrences": 1
      },
      {
        "before": "export const CURRENT_APADANA_IDS=",
        "after": "/* BEGIN finite publisher333 curatorial extension; historical325 assertions above stay intact. */\nconst latest333=publisher333Authority();\nassert.deepEqual(latest333.approval.previous_intake,{file:'THERA_301_310_APPROVAL.json',sha256:'5b6ee312e81f422e464922a53354800f492c571ec98f837fa119ba01de6c7042'});\nassert.deepEqual(latest333.approval.baseline_ids,current.expected_profile_ids);\nassert.deepEqual(latest333.approval.baseline_records,records);\nassert.deepEqual(latest333.approval.held_ids,current.held_ids);\nrequireHistorical325Maps({...eight.baseline.profile_objects,...eight.profiles},{...eight.baseline.translation_objects,...eight.links});\nconst records333=[...records,...latest333.newRecords];\nassert.deepEqual(records333.map(row=>row.id),latest333.approval.expected_profile_ids);\nassert.equal(records333.length,333);assert.equal(new Set(records333.map(row=>row.id)).size,333);\n/* END finite publisher333 curatorial extension. */\n\nexport const CURRENT_APADANA_IDS=",
        "occurrences": 1
      },
      {
        "before": "Object.freeze([...current.expected_profile_ids]);",
        "after": "Object.freeze([...latest333.approval.expected_profile_ids]);",
        "occurrences": 1
      },
      {
        "before": "Object.freeze(records.map(row=>Object.freeze({...row})));",
        "after": "Object.freeze(records333.map(row=>Object.freeze({...row})));",
        "occurrences": 1
      },
      {
        "before": "Object.freeze(records.filter(row=>row.publisher_chapter==='chapter-3').map(row=>row.id));",
        "after": "Object.freeze(records333.filter(row=>row.publisher_chapter==='chapter-3').map(row=>row.id));",
        "occurrences": 1
      },
      {
        "before": "Object.freeze(records.map(row=>`https://apadanatranslation.com/text/",
        "after": "Object.freeze(records333.map(row=>`https://apadanatranslation.com/text/",
        "occurrences": 1
      }
    ],
    "tests/thera301-310-source.test.mjs": [
      {
        "before": "import {readFileSync} from 'node:fs';",
        "after": "import {readFileSync as readCurrentFileSync} from 'node:fs';",
        "occurrences": 1
      },
      {
        "before": "{APADANA_PROFILES,APADANA_COMMIT,isApadanaRawUrl}",
        "after": "{APADANA_PROFILES as CURRENT_APADANA_PROFILES,APADANA_COMMIT,isApadanaRawUrl}",
        "occurrences": 1
      },
      {
        "before": "import {thera301310Evidence,digest,blob} from './helpers/thera301-310-evidence.mjs';\n",
        "after": "import {thera301310Evidence,digest,blob} from './helpers/thera301-310-evidence.mjs';\nimport {projectPublisher333To325,historical325FileReader} from './helpers/thera333-legacy-projection.mjs';\nconst APADANA_PROFILES=projectPublisher333To325(CURRENT_APADANA_PROFILES,JSON.parse(readCurrentFileSync('server/data/apadana.json','utf8'))).profiles;\nconst readFileSync=historical325FileReader(CURRENT_APADANA_PROFILES,readCurrentFileSync);\n",
        "occurrences": 1
      }
    ],
    "tests/thera301-310-client.test.mjs": [
      {
        "before": "{APADANA_PROFILES,APADANA_COMMIT}",
        "after": "{APADANA_PROFILES as CURRENT_APADANA_PROFILES,APADANA_COMMIT}",
        "occurrences": 1
      },
      {
        "before": "import {thera301310Evidence,digest} from './helpers/thera301-310-evidence.mjs';\n",
        "after": "import {thera301310Evidence,digest} from './helpers/thera301-310-evidence.mjs';\nimport {readFileSync} from 'node:fs';\nimport {projectPublisher333To325} from './helpers/thera333-legacy-projection.mjs';\nconst APADANA_PROFILES=projectPublisher333To325(CURRENT_APADANA_PROFILES,JSON.parse(readFileSync('server/data/apadana.json','utf8'))).profiles;\n",
        "occurrences": 1
      }
    ],
    "tests/helpers/thera301-310-evidence.mjs": [
      {
        "before": "import {thera292299Evidence} from './thera292-299-evidence.mjs';\n",
        "after": "import {thera292299Evidence} from './thera292-299-evidence.mjs';\nimport {projectPublisher333ClientTo325} from './thera333-legacy-projection.mjs';\n",
        "occurrences": 1
      },
      {
        "before": "let code=readFileSync(path,'utf8');",
        "after": "let code=projectPublisher333ClientTo325(path,readFileSync(path,'utf8'));",
        "occurrences": 1
      }
    ],
    "tests/thera261-280-source.test.mjs": [
      {
        "before": "assert.equal(CURRENT_APADANA_IDS.length,325)",
        "after": "assert.equal(CURRENT_APADANA_IDS.length,333)",
        "occurrences": 1
      }
    ],
    "tests/thera261-280-client.test.mjs": [
      {
        "before": "assert.equal(CURRENT_APADANA_IDS.length,325)",
        "after": "assert.equal(CURRENT_APADANA_IDS.length,333)",
        "occurrences": 1
      }
    ],
    "tests/thera281-285-source.test.mjs": [
      {
        "before": "assert.equal(CURRENT_APADANA_IDS.length,325)",
        "after": "assert.equal(CURRENT_APADANA_IDS.length,333)",
        "occurrences": 1
      },
      {
        "before": "CURRENT_APADANA_IDS.slice(317)",
        "after": "CURRENT_APADANA_IDS.slice(317,325)",
        "occurrences": 1
      },
      {
        "before": "import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';\n",
        "after": "import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';\nimport {projectPublisher333To325} from './helpers/thera333-legacy-projection.mjs';\n",
        "occurrences": 1
      },
      {
        "before": "const priorSource=clone(manifest.source);",
        "after": "const priorSource=clone(projectPublisher333To325(APADANA_PROFILES,manifest).catalogue.source);",
        "occurrences": 1
      }
    ],
    "tests/thera281-285-client.test.mjs": [
      {
        "before": "assert.equal(CURRENT_APADANA_IDS.length,325)",
        "after": "assert.equal(CURRENT_APADANA_IDS.length,333)",
        "occurrences": 1
      },
      {
        "before": "CURRENT_APADANA_IDS.slice(317)",
        "after": "CURRENT_APADANA_IDS.slice(317,325)",
        "occurrences": 1
      }
    ],
    "tests/thera287-288-source.test.mjs": [
      {
        "before": "assert.equal(CURRENT_APADANA_IDS.length,325)",
        "after": "assert.equal(CURRENT_APADANA_IDS.length,333)",
        "occurrences": 1
      },
      {
        "before": "CURRENT_APADANA_IDS.slice(317)",
        "after": "CURRENT_APADANA_IDS.slice(317,325)",
        "occurrences": 1
      },
      {
        "before": "import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';\n",
        "after": "import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';\nimport {projectPublisher333To325} from './helpers/thera333-legacy-projection.mjs';\n",
        "occurrences": 1
      },
      {
        "before": "const priorSource=clone(manifest.source);",
        "after": "const priorSource=clone(projectPublisher333To325(APADANA_PROFILES,manifest).catalogue.source);",
        "occurrences": 1
      }
    ],
    "tests/thera287-288-client.test.mjs": [
      {
        "before": "assert.equal(CURRENT_APADANA_IDS.length,325)",
        "after": "assert.equal(CURRENT_APADANA_IDS.length,333)",
        "occurrences": 1
      },
      {
        "before": "CURRENT_APADANA_IDS.slice(317)",
        "after": "CURRENT_APADANA_IDS.slice(317,325)",
        "occurrences": 1
      }
    ],
    "tests/thera292-299-source.test.mjs": [
      {
        "before": "assert.equal(CURRENT_APADANA_IDS.length,325)",
        "after": "assert.equal(CURRENT_APADANA_IDS.length,333)",
        "occurrences": 1
      },
      {
        "before": "CURRENT_APADANA_IDS.slice(317)",
        "after": "CURRENT_APADANA_IDS.slice(317,325)",
        "occurrences": 1
      },
      {
        "before": "import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';\n",
        "after": "import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';\nimport {projectPublisher333To325} from './helpers/thera333-legacy-projection.mjs';\n",
        "occurrences": 1
      },
      {
        "before": "const priorSource=clone(manifest.source);",
        "after": "const priorSource=clone(projectPublisher333To325(APADANA_PROFILES,manifest).catalogue.source);",
        "occurrences": 1
      }
    ],
    "tests/thera292-299-client.test.mjs": [
      {
        "before": "assert.equal(CURRENT_APADANA_IDS.length,325)",
        "after": "assert.equal(CURRENT_APADANA_IDS.length,333)",
        "occurrences": 1
      },
      {
        "before": "CURRENT_APADANA_IDS.slice(317)",
        "after": "CURRENT_APADANA_IDS.slice(317,325)",
        "occurrences": 1
      }
    ],
    "tests/apadana-held234.test.mjs": [
      {
        "before": "assert.equal(CURRENT_APADANA_IDS.length,325)",
        "after": "assert.equal(CURRENT_APADANA_IDS.length,333)",
        "occurrences": 1
      }
    ],
    "tests/source-notes-baseline-projection.test.mjs": [
      {
        "before": "assert.equal(CURRENT_APADANA_IDS.length,325)",
        "after": "assert.equal(CURRENT_APADANA_IDS.length,333)",
        "occurrences": 1
      }
    ],
    "tests/held234-client.test.mjs": [
      {
        "before": "assert.equal(CURRENT_APADANA_IDS.length,325)",
        "after": "assert.equal(CURRENT_APADANA_IDS.length,333)",
        "occurrences": 1
      },
      {
        "before": "assert.equal(WIDGET_VERSION,'v38')",
        "after": "assert.equal(WIDGET_VERSION,'v39')",
        "occurrences": 1
      }
    ]
  },
  "original104_sha256": {
    "tests/helpers/apadana-intake-expectations.mjs": "9cb4240d2995f03819142b8cb7498719187890b462e1ca3808dddffcfef9caab",
    "tests/thera301-310-source.test.mjs": "935de2701574226717209b8278d0b25b828c6ec72d58c96b1b9ea3a7dcec3f6a",
    "tests/thera301-310-client.test.mjs": "396c36da20d85a13c03fb1d0ebe80fdca27c8103b47ffcc1f096cc07eb5654e0",
    "tests/helpers/thera301-310-evidence.mjs": "638296953f44bfa229f8ba6495908b702bce1439f2b7c93d3cbaf7f37e4c61f2",
    "tests/thera261-280-source.test.mjs": "3a353a68445e787bbffc80c5b1eedf69e8ee9409362dbe4362be63ec5c8b9ea1",
    "tests/thera261-280-client.test.mjs": "8dce0410bfcc976c8bcd196ba8adf7c7d6c568f2ff3da2f4b857a5bc573a75c7",
    "tests/thera281-285-source.test.mjs": "59c8b5784ca50581660af633601b01ac652eb8d55f7f2580b75d2c3898f3ebcc",
    "tests/thera281-285-client.test.mjs": "30705888e880976cb3f05175534c57441fe57f2c83778b04d8a68c5a9f9b7cf7",
    "tests/thera287-288-source.test.mjs": "7b6fc386821d57a90a3537ceb0e21075c933c4c717a13e605bd2437954a99595",
    "tests/thera287-288-client.test.mjs": "e2874e93d662b28da9d349229fd4cc4b2c1eef4b4401e90055166206299ff6d2",
    "tests/thera292-299-source.test.mjs": "6f29b805a81cee9936426158a8cf6f0b9e0e4a0a28ae9aa5217a802cd8dd53df",
    "tests/thera292-299-client.test.mjs": "53bb515b8cff07652c0013857bb1457de6113f791c58c1922dc6707399647608",
    "tests/apadana-held234.test.mjs": "07411dea8b73caa6999ad62f527191cea240c21a89357862c1d64440cdb6bcd0",
    "tests/source-notes-baseline-projection.test.mjs": "03b1b8342b7d2e50ddf6e2fff009b022cef73aa9d89d40477b4489f558c3a513",
    "tests/held234-client.test.mjs": "3b05ebee8e2f683576a826d57c294829e66224dd7b249e92112ea88cb2bc1b05"
  },
  "proposed_sha256": {
    "tests/helpers/apadana-intake-expectations.mjs": "75fb15679559ee29e23ccd5d443bb84fa3dc6104ffb437b44c9de5bc96ee4b4f",
    "tests/thera301-310-source.test.mjs": "96ec4ba7459a7b739a26225957a5300b834f64af3898e3460caefc5db67c2375",
    "tests/thera301-310-client.test.mjs": "796352f3d8d1d8769979e6b29225281e2a20f138ac86aa313fcfd6f4a7ccb08f",
    "tests/helpers/thera301-310-evidence.mjs": "5f01c294dc11f9af129360fbbf7e60c5e8422a0c7fdc0faf2aff8a094516df17",
    "tests/thera261-280-source.test.mjs": "e49f82e29be98951169e729978008395ea801cc8190ae76a3ba8e2d7d9df6e88",
    "tests/thera261-280-client.test.mjs": "4c089666676037e0f5478f12f6451c682164979592892071d6dea65446ac28f5",
    "tests/thera281-285-source.test.mjs": "e8f74c1f96e27bb8d0037686996904099bb9dae805eb3c5d28489f13cbf8f6fe",
    "tests/thera281-285-client.test.mjs": "ff6cb00cc92725034aa7a389aad7f6355b6237de5fbc987d8fec95bf2b301915",
    "tests/thera287-288-source.test.mjs": "2350ad4ea2bafda34b49823ba1f59b5aa9a07bdde7196ab1fc6358414e43684c",
    "tests/thera287-288-client.test.mjs": "266dff697425078822fc014cf4645f870fa94e7c94a388280dbbb9632d95bd07",
    "tests/thera292-299-source.test.mjs": "4adce075e7a737869f1720e573ec73d36d1e931652927171c13af677cf7be5c2",
    "tests/thera292-299-client.test.mjs": "cd1fbcee58a55b1725de58b2f346f136ceeca8ea767495777af2beacd4bee7a3",
    "tests/apadana-held234.test.mjs": "a331d4c2c7eda345068c06b1b46fcdafc2810eae6e2733e4cf0c27252c045b34",
    "tests/source-notes-baseline-projection.test.mjs": "9242a5907f181b6db31ecfb3368bcbcfa2b6d17963ce6e2bbbfd7d41e6a72c42",
    "tests/held234-client.test.mjs": "6a9488cfb9382ff0a96e297bf8bba5a493893d7be892bc095d7af0f00b7a38f4"
  }
};
function restore104(path,source){
 assert.ok(Object.hasOwn(fixture.rules,path));let code=source;
 for(const {before,after,occurrences} of [...fixture.rules[path]].reverse()){
  assert.equal(code.split(after).length-1,occurrences,'Exact finite adapter occurrence '+path);
  code=code.split(after).join(before);
 }
 assert.equal(sha(code),fixture.original104_sha256[path],'All historical104 bytes, not only assertions, survive '+path);return code;
}
for(const path of Object.keys(fixture.rules))test('finite adapter inverse restores entire pinned104 source '+path,()=>{
 const code=readFileSync(path,'utf8');assert.equal(sha(code),fixture.proposed_sha256[path],'Exact reviewed adapter proposal');assert.equal(sha(restore104(path,code)),fixture.original104_sha256[path]);
 const adapter=fixture.rules[path][0].after;
 assert.throws(()=>restore104(path,code.replace(adapter,'')),'Missing adapter must refuse');
 assert.throws(()=>restore104(path,code.replace(adapter,adapter+adapter)),'Duplicated adapter must refuse');
 assert.throws(()=>restore104(path,code+'\n// unapproved old assertion or body change\n'),'A valid adapter cannot conceal unrelated old source changes');
});
