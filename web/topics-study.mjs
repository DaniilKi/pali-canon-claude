/** Browser guards for existing editorial indexes. They do not create mappings or interpretation. */
const string=x=>typeof x==='string'&&x.length>0;
const slug=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9_-]{0,199}$/.test(x);
const integer=(x,min=0,max=100000)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const fail=()=>{throw Error('The study index is incomplete or does not match this selection. No topic, list or source was substituted.');};
const array=(x,max)=>Array.isArray(x)&&x.length<=max;
const status=x=>['canonical','canonical-later-name','later'].includes(x);
const command=(x,tool,name)=>x?.tool===tool&&x.name===name;
export function atiLink(url) {try {const u=new URL(url);return u.protocol==='https:'&&u.hostname==='www.accesstoinsight.org'&&!u.username&&!u.password&&!u.port;}catch{return false;}}
function topicSource(source){if(!string(source?.name)||!string(source.license)||!string(source.attribution)||!string(source.commit))fail();}
function related(items,tool){if(items===undefined)return;if(!array(items,500))fail();for(const x of items)if(!slug(x.slug)||!string(x.name)||!command(x.read_with,tool,x.slug))fail();}
function texts(items){if(!array(items,500))fail();for(const x of items)if(!/^[a-z][a-z0-9.-]*$/.test(x.id||'')||!string(x.citation)||x.read_with?.tool!=='get_text'||x.read_with.uid!==x.id)fail();}
export function topicCatalogue(data,{offset,limit}) {
 topicSource(data?.source);
 if(!integer(data.total)||data.offset!==offset||!array(data.topics,limit)||data.returned!==data.topics.length||data.returned!==Math.min(limit,Math.max(0,data.total-offset))||data.next_offset!==(offset+limit<data.total?offset+limit:null))fail();
 const seen=new Set();for(const x of data.topics){if(!slug(x.slug)||seen.has(x.slug)||!string(x.name)||!['subject','numerical'].includes(x.index)||!integer(x.texts)||!command(x.read_with,'topic',x.slug))fail();seen.add(x.slug);}return data;
}
export function topicDetail(data,name) {
 topicSource(data?.source);
 if(data.topic?.slug!==name||!slug(name)||!string(data.topic.name)||!string(data.topic.index)||!atiLink(data.topic.ati_url)||data.source.url!==data.topic.ati_url||!string(data.note))fail();
 texts(data.texts);related(data.see_also,'topic');related(data.other_matches,'topic');
 if(data.dhamma_list&&(!slug(data.dhamma_list.slug)||!string(data.dhamma_list.name)||!command(data.dhamma_list.read_with,'dhamma_list',data.dhamma_list.slug)))fail();
 if(data.further_reading!==undefined&&(!array(data.further_reading,500)||data.further_reading.some(x=>!string(x.title)||!string(x.kind)||!atiLink(x.url))))fail();
 for(const x of data.texts)if(!string(x.ati_reference)||!atiLink(x.ati_url))fail();return data;
}
export function listCatalogue(data) {
 if(!array(data?.lists,100)||!data.lists.length)fail();const seen=new Set();
 for(const x of data.lists){if(!slug(x.slug)||seen.has(x.slug)||!string(x.name)||!string(x.pali)||!integer(x.count,1,100)||!status(x.status)||!string(data.status_labels?.[x.status])||!command(x.read_with,'dhamma_list',x.slug))fail();seen.add(x.slug);}return data;
}
export function listDetail(data,name) {
 if(data?.slug!==name||!slug(name)||!string(data.name)||!string(data.pali)||!status(data.status)||!string(data.status_meaning)||!string(data.gloss_note)||!string(data.note)||!integer(data.count,1,100)||!array(data.members,100)||!data.members.length||!string(data.source?.curated_by)||!string(data.source.pali?.name)||!string(data.source.pali.commit)||!string(data.source.pali.attribution)||!string(data.source.pali.terms))fail();
 for(const [i,x]of data.members.entries()){if(x.n!==i+1||!string(x.pali)||!string(x.gloss)||(x.list!==undefined&&(!slug(x.list)||!command(x.read_with,'dhamma_list',x.list))))fail();}
 texts(data.defined_in);if(!data.defined_in.length)fail();texts(data.see_also_texts||[]);related(data.related_lists,'dhamma_list');if(data.topic&&(!slug(data.topic.slug)||!string(data.topic.name)||!command(data.topic.read_with,'topic',data.topic.slug)))fail();return data;
}
