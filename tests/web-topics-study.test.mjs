import {test} from 'node:test';import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';import {topic,listTopics,dhammaList,topicsIndex} from '../src/topics.mjs';
import {topicCatalogue,topicDetail,listCatalogue,listDetail,atiLink} from '../web/topics-study.mjs';
test('every actual paginated topic, exact topic and teaching list passes without changing its source identity',()=>{
 for(const index of ['all','subject','numerical'])for(let offset=0;offset<500;offset+=24){const data=listTopics({index,offset,limit:24});assert.equal(topicCatalogue(data,{offset,limit:24}),data);}
 for(const t of topicsIndex().topics)assert.equal(topicDetail(topic(canon,t.slug),t.slug).topic.slug,t.slug);
 const lists=listCatalogue(dhammaList(canon));for(const l of lists.lists)assert.equal(listDetail(dhammaList(canon,l.slug),l.slug).slug,l.slug);
});
test('topic pagination, source labels and emitted reader commands cannot silently change',()=>{
 const c=listTopics({limit:24});for(const change of [{source:{}},{offset:1},{returned:0},{next_offset:0},{topics:[{...c.topics[0],read_with:{tool:'topic',name:'other'}}]}])assert.throws(()=>topicCatalogue({...c,...change},{offset:0,limit:24}));
 const d=topic(canon,'kamma');for(const change of [{topic:{...d.topic,slug:'other'}},{topic:{...d.topic,ati_url:'https://evil.example'}},{texts:[{...d.texts[0],read_with:{tool:'get_translation',uid:d.texts[0].id}}]},{texts:[{...d.texts[0],id:'javascript:alert(1)'}]},{further_reading:[{title:'unsafe',kind:'commentary',url:'javascript:alert(1)'}]},{note:''}])assert.throws(()=>topicDetail({...d,...change},'kamma'));
});
test('later and later-named lists keep their status, source grouping and reference provenance',()=>{
 const later=listDetail(dhammaList(canon,'ten-paramis'),'ten-paramis');assert.equal(later.status,'later');assert.equal(later.defined_in[0].id,'bv2');
 const groups=listDetail(dhammaList(canon,'thirty-seven-aids-to-awakening'),'thirty-seven-aids-to-awakening');assert.equal(groups.count,37);assert.equal(groups.members.length,7);assert.equal(groups.status,'canonical-later-name');
 for(const change of [{status:'early'},{source:{}},{status_meaning:''},{members:[{...later.members[0],n:2}]},{defined_in:[]},{defined_in:[{...later.defined_in[0],read_with:{tool:'get_text',uid:'other'}}]}])assert.throws(()=>listDetail({...later,...change},'ten-paramis'));
 assert.throws(()=>listCatalogue({lists:[{...dhammaList(canon).lists[0],status:'early'}],status_labels:{}}));
});
test('index links are HTTPS ATI references, never credentials or a caller-selected host',()=>{
 assert.equal(atiLink('https://www.accesstoinsight.org/index-subject.html#kamma'),true);
 for(const url of ['http://www.accesstoinsight.org','https://evil.example','https://user@www.accesstoinsight.org','https://www.accesstoinsight.org:444','javascript:alert(1)'])assert.equal(atiLink(url),false);
});
