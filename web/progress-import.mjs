/** Restore self-reported local metadata, never scripture or verified completion. */
export const MAX_PROGRESS_BYTES = 16 * 1024 * 1024;
export const MAX_PROGRESS_MARKS = 1600;
const object = x => x && typeof x === 'object' && !Array.isArray(x);
const exact = (x, keys) => object(x) && Object.keys(x).length === keys.length && keys.every(k => Object.hasOwn(x,k));
const integer = (x,min,max) => Number.isSafeInteger(x) && x >= min && x <= max;
const key = x => x.name + ':' + x.day;
/** Shape/signature validation only; this does not recognize plans or certify assignments. */
export function parseProgressMetadata(text) {
  const fail = () => { throw Error('This is not a supported reading-progress export. No marks were restored.'); };
  let data; try { data=JSON.parse(text); } catch { fail(); }
  if (!exact(data,['format','progress']) || data.format !== 'pali-library-reading-progress-v1' || !Array.isArray(data.progress) || data.progress.length > MAX_PROGRESS_MARKS) fail();
  const seen=new Set();
  return data.progress.map(mark => {
    if (!exact(mark,['name','day','signature']) || typeof mark.name !== 'string' || !/^[a-z0-9-]{1,60}$/.test(mark.name) || !integer(mark.day,1,400) || typeof mark.signature !== 'string' || mark.signature.length > 12000 || seen.has(key(mark))) fail();
    seen.add(key(mark)); let s; try { s=JSON.parse(mark.signature); } catch { fail(); }
    if (!exact(s,['name','day','source','readings']) || s.name !== mark.name || s.day !== mark.day || typeof s.source !== 'string' || !/^[a-zA-Z0-9._-]{1,100}$/.test(s.source) || !Array.isArray(s.readings) || !s.readings.length || s.readings.length > 20) fail();
    const ids = new Set();
    for (const r of s.readings) {
      if (!exact(r,['id','offset','limit','part','of']) || typeof r.id !== 'string' || !/^[a-z][a-z0-9.-]{0,299}$/.test(r.id) || ids.has(r.id) || !integer(r.offset,0,100000) || !(r.limit === null || integer(r.limit,1,100000)) || !(r.part === null && r.of === null || integer(r.part,1,400) && integer(r.of,r.part,400) && r.limit !== null)) fail();
      ids.add(r.id);
    }
    // Canonicalize field order/whitespace only; never replace the saved source or assignment.
    const signature=JSON.stringify({name:s.name,day:s.day,source:s.source,readings:s.readings.map(r=>({id:r.id,offset:r.offset,limit:r.limit,part:r.part,of:r.of}))});
    return {name:mark.name,day:mark.day,signature};
  });
}
export function parseProgress(text, catalog) {
  const progress = parseProgressMetadata(text), plans = new Map(catalog.map(p => [p.name,p.days]));
  if (progress.some(mark => !plans.has(mark.name) || !integer(mark.day,1,plans.get(mark.name)))) throw Error('This is not a supported reading-progress export. No marks were restored.');
  return progress;
}
export function mergeProgress(existing,incoming) {
  const byKey=new Map(existing.map(x=>[key(x),x])), added=incoming.filter(x=>!byKey.has(key(x))), duplicates=incoming.filter(x=>byKey.get(key(x))?.signature === x.signature).length, conflicts=incoming.length-added.length-duplicates;
  if (existing.length + added.length > MAX_PROGRESS_MARKS) throw Error('These marks exceed the 1,600-mark limit. Export your current progress before changing it. Nothing was restored.');
  return {progress:[...existing,...added],added:added.length,duplicates,conflicts};
}
