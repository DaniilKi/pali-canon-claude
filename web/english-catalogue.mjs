/** Presentation guards only: link metadata never establishes translation completeness. */
export const ENGLISH_AVAILABILITY = Object.freeze({linked:'All English links',whole:'Whole-unit or chapter links',scoped:'Scoped English only',none:'No English links'});
const fail=()=>{throw Error('The English source catalogue does not match this selection. No filter or source was substituted.');};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2000;
const count=x=>Number.isSafeInteger(x)&&x>=0;
const id=x=>typeof x==='string'&&/^[a-z][a-z0-9.-]{0,199}$/.test(x);
const collectionId=x=>typeof x==='string'&&/^[a-z]{1,30}$/.test(x);
const belongs=(uid,collection)=>collection==='vinaya'?uid.startsWith('pli-tv-'):collection==='ap'?/^(tha|thi)-ap[0-9]/.test(uid):new RegExp('^'+collection+'[0-9]').test(uid);
export function englishBrowseCandidate(args){
 const normalized=x=>String(x).normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/gu,'').toLowerCase();
 return args.has('availability')||args.has('collection')||args.getAll('node').some(value=>normalized(value)==='english');
}
export function englishSelection(args){
 const keys=['node','availability','collection','offset'];
 for(const k of args.keys())if(!keys.includes(k)||args.getAll(k).length!==1)fail();
 if(args.get('node')!=='english')fail();
 const availability=args.has('availability')?args.get('availability'):'linked';
 const collection=args.has('collection')?args.get('collection'):null;
 const raw=args.has('offset')?args.get('offset'):'0';
 if(!Object.hasOwn(ENGLISH_AVAILABILITY,availability)||(collection!==null&&!collectionId(collection))||!/^(0|[1-9]\d*)$/.test(raw)||!count(Number(raw)))fail();
 return{availability,collection,offset:Number(raw),limit:40};
}
export function englishRoute(selection,offset=selection.offset){
 if(!Object.hasOwn(ENGLISH_AVAILABILITY,selection.availability)||(selection.collection!==null&&!collectionId(selection.collection))||!count(offset))fail();
 const q=new URLSearchParams({node:'english',availability:selection.availability});
 if(selection.collection!==null)q.set('collection',selection.collection);
 if(offset)q.set('offset',String(offset));
 return'#browse?'+q;
}
export function englishBadges(item){
 const partial=item.partial_english_available||0,shared=item.shared_english_available||0;
 return[...(item.english_available?['Whole-unit or chapter link']:[]),...(partial&&shared?['Partial and shared sources · review required']:partial?['Partial source · review required']:shared?['Shared page · review required']:[]),...(!item.english_available&&!partial&&!shared?['No indexed English link']:[])];
}
export function englishCatalogue(data,selection){
 if(!object(data)||data.catalogue!==true||data.node!=='english'||data.name!=='Find English sources'||data.availability!==selection.availability||data.collection!==selection.collection||data.offset!==selection.offset||data.limit!==selection.limit||!count(data.total)||!text(data.note)||!Array.isArray(data.collections)||data.collections.length>100||!Array.isArray(data.items)||data.items.length>selection.limit)fail();
 const collections=new Set();
 for(const c of data.collections){if(!object(c)||!collectionId(c.id)||collections.has(c.id)||!text(c.name))fail();collections.add(c.id);}
 if(!collections.size||(selection.collection!==null&&!collections.has(selection.collection)))fail();
 const expected=Math.min(selection.limit,Math.max(0,data.total-selection.offset));
 if(data.items.length!==expected||data.next_offset!==(selection.offset+selection.limit<data.total?selection.offset+selection.limit:null))fail();
 const seen=new Set();
 for(const item of data.items){
  if(!object(item)||!id(item.id)||seen.has(item.id)||!text(item.citation)||!text(item.title)||!text(item.collection)||!collections.has(item.collection_id)||!belongs(item.id,item.collection_id)||(selection.collection!==null&&item.collection_id!==selection.collection)||item.approximate||item.kind==='range'||!count(item.english_available))fail();
  for(const k of ['partial_english_available','shared_english_available'])if(Object.hasOwn(item,k)&&!count(item[k]))fail();
  const cmd=item.read_with;if(!object(cmd)||Object.keys(cmd).sort().join(',')!=='tool,uid'||cmd.tool!=='get_text'||cmd.uid!==item.id)fail();
  const whole=item.english_available>0,scoped=(item.partial_english_available||0)+(item.shared_english_available||0)>0;
  if(selection.availability==='linked'&&!whole&&!scoped||selection.availability==='whole'&&!whole||selection.availability==='scoped'&&(whole||!scoped)||selection.availability==='none'&&(whole||scoped))fail();
  if(Object.hasOwn(item,'source_context')){const context=item.source_context;if(!object(context)||Object.keys(context).sort().join(',')!=='citation,id,kind,title'||context.kind!=='containing_group'||!id(context.id)||!belongs(context.id,item.collection_id)||context.id===item.id||!text(context.citation)||!text(context.title)||!whole)fail();}
  seen.add(item.id);
 }
 return data;
}
