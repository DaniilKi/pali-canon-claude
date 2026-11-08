/** Local export restoration only. This validates a file shape, not scripture or source authenticity. */
export const MAX_IMPORT_BYTES = 16 * 1024 * 1024;
const keys = new Set(['uid','ref','title','note','offset','source_commit']);
const string = (x,max) => typeof x === 'string' && x.length > 0 && x.length <= max && !/[\u0000-\u001f\u007f]/.test(x);
const object = x => x && typeof x === 'object' && !Array.isArray(x);
const identity = x => JSON.stringify([x.uid,x.ref]);
export function parseBookmarks(text) {
  let data;try { data=JSON.parse(text); } catch { throw Error('Choose a valid JSON bookmark export. Nothing was imported.'); }
  if(!object(data)||data.format!=='pali-library-v1'||Object.keys(data).some(k=>!['format','saved'].includes(k))||!Array.isArray(data.saved)||data.saved.length>500)throw Error('This is not a supported Pāli Library bookmark export (maximum 500 passages). Nothing was imported.');
  const seen=new Set();
  return data.saved.map(x=>{
    if(!object(x)||Object.keys(x).some(k=>!keys.has(k))||!string(x.uid,300)||!string(x.ref,400)||!string(x.title,1000)||!(/^[a-z][a-z0-9.-]*$/.test(x.uid)||/^(book|post|commentary-ref|commentary):[^\r\n]+$/.test(x.uid))||/https?:|javascript:|data:|[<>]/i.test(x.uid)||(x.note!==undefined&&(typeof x.note!=='string'||x.note.length>4000))||(x.offset!==undefined&&(!Number.isSafeInteger(x.offset)||x.offset<0||x.offset>100000))||(x.source_commit!==undefined&&!string(x.source_commit,100)))throw Error('A bookmark has unsupported fields or invalid reference, note, position or revision metadata. Nothing was imported.');
    if(seen.has(identity(x)))throw Error('The file contains duplicate passage references. Resolve those duplicates before importing; no notes were chosen or discarded.');seen.add(identity(x));
    return {uid:x.uid,ref:x.ref,title:x.title,note:x.note ?? '',...(x.offset!==undefined?{offset:x.offset}:{}),...(x.source_commit!==undefined?{source_commit:x.source_commit}:{})};
  });
}
export function bookmarkMerge(existing,incoming) {
  const seen=new Set(existing.map(identity)),added=incoming.filter(x=>!seen.has(identity(x))),skipped=incoming.length-added.length;
  if(existing.length+added.length>500)throw Error('These new bookmarks exceed the 500-passage limit. Export/remove some saved passages, then try again. Nothing was imported.');
  return {added,skipped,saved:[...existing,...added]};
}
