/** A source-pinned locator only. Never source text, completion evidence or English consent. */
const string=(x,max)=>typeof x==='string'&&x.length>0&&x.length<=max&&!/[\u0000-\u001f\u007f<>]/.test(x);
const integer=x=>Number.isSafeInteger(x)&&x>=0&&x<=100000;
const source=x=>typeof x==='string'&&/^[a-zA-Z0-9._-]{1,100}$/.test(x);
/** Locator revisions may change while the authentic edition commit stays fixed. */
export function sourceRevision(data) {
 const mapped=Boolean(data.source&&Object.hasOwn(data.source,'locator_revision'));
 const value=mapped?data.source.locator_revision:data.source?.commit;
 if((mapped||value!==undefined)&&!source(value))throw Error('The source has invalid reading-position revision metadata.');
 return value;
}
/** Shared source selection grammar for paragraph locators and transient page routes. */
export function assertReadingContext(context) {
 if(!context||Object.keys(context).some(k=>!['uid','book','kind','plan','day'].includes(k))||Boolean(context.uid)===Boolean(context.book)||!string(context.uid||context.book,300)||/https?:|javascript:|data:/i.test(context.uid||context.book)||context.kind!==undefined&&!['post','commentary'].includes(context.kind)||context.book&&context.kind||context.plan!==undefined&&(!context.uid||context.kind||!/^[a-z0-9-]{1,60}$/.test(context.plan)||!Number.isSafeInteger(context.day)||context.day<1||context.day>400)||context.day!==undefined&&context.plan===undefined)throw Error('This reading position has unsupported source or reference metadata.');
}
export function readingPosition(context, offset, ref, revision) {
 assertReadingContext(context);
 if(!integer(offset)||!string(ref,400)||!source(revision))throw Error('This reading position has unsupported source or reference metadata.');
 return '#read?'+new URLSearchParams({...context,offset,ref,source:revision});
}
export function assertPositionPin(args,data) {
 if(!args.has('source'))return;
 if(args.getAll('source').length!==1||!source(args.get('source'))||!string(args.get('ref'),400)||!/^\d+$/.test(args.get('offset')||'')||!integer(Number(args.get('offset'))))throw Error('The saved reading position is incomplete. Open its source from the Library; no nearby passage was substituted.');
 if(sourceRevision(data)!==args.get('source')){const error=Error('The source or citation mapping revision changed since this reading position was saved. Review the current source explicitly before continuing; no replacement wording was displayed.');error.code='READING_SOURCE_CHANGED';throw error;}
}
/** Recognize only the locator grammar this reader understands; never consent, note or arbitrary URL fields. */
export function isReadingLocator(href) {
 try {
  if(typeof href!=='string'||href.length>8192||!href.startsWith('#read?'))return false;
  const args=new URLSearchParams(href.slice(6)),keys=[...args.keys()];
  if(keys.some(k=>!['uid','book','kind','plan','day','offset','ref','source'].includes(k))||new Set(keys).size!==keys.length)return false;
  const context=Object.fromEntries(['uid','book','kind','plan'].filter(k=>args.has(k)).map(k=>[k,args.get(k)]));if(args.has('day'))context.day=Number(args.get('day'));
  if(args.has('offset')&&!/^\d+$/.test(args.get('offset')))return false;
  readingPosition(context,args.has('offset')?Number(args.get('offset')):0,args.has('ref')?args.get('ref'):'legacy/1',args.has('source')?args.get('source'):'legacy');
  if(args.has('source'))assertPositionPin(args,{source:{commit:args.get('source')}});
  return true;
 }catch{return false;}
}
