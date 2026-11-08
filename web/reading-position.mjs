/** A source-pinned locator only. Never source text, completion evidence or English consent. */
const string=(x,max)=>typeof x==='string'&&x.length>0&&x.length<=max&&!/[\u0000-\u001f\u007f<>]/.test(x);
const integer=x=>Number.isSafeInteger(x)&&x>=0&&x<=100000;
const source=x=>typeof x==='string'&&/^[a-zA-Z0-9._-]{1,100}$/.test(x);
export function readingPosition(context, offset, ref, revision) {
 if(!context||!integer(offset)||!string(ref,400)||!source(revision)||Object.keys(context).some(k=>!['uid','book','kind','plan','day'].includes(k))||Boolean(context.uid)===Boolean(context.book)||!string(context.uid||context.book,300)||/https?:|javascript:|data:/i.test(context.uid||context.book)||context.kind!==undefined&&!['post','commentary'].includes(context.kind)||context.book&&context.kind||context.plan!==undefined&&(!context.uid||context.kind||!/^[a-z0-9-]{1,60}$/.test(context.plan)||!Number.isSafeInteger(context.day)||context.day<1||context.day>400)||context.day!==undefined&&context.plan===undefined)throw Error('This reading position has unsupported source or reference metadata.');
 return '#read?'+new URLSearchParams({...context,offset,ref,source:revision});
}
export function assertPositionPin(args,data) {
 if(!args.has('source'))return;
 if(args.getAll('source').length!==1||!source(args.get('source'))||!string(args.get('ref'),400)||!/^\d+$/.test(args.get('offset')||'')||!integer(Number(args.get('offset'))))throw Error('The saved reading position is incomplete. Open its source from the Library; no nearby passage was substituted.');
 if(data.source?.commit!==args.get('source')){const error=Error('The source revision changed since this reading position was saved. Review the current source explicitly before continuing; no replacement wording was displayed.');error.code='READING_SOURCE_CHANGED';throw error;}
}
