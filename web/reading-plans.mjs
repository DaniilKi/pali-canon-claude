/** Validate engine schedules and browser-local marks; never invent a reading or completion. */
const nameOK = n => typeof n === 'string' && /^[a-z0-9-]{1,60}$/.test(n);
const text = x => typeof x === 'string' && x.trim().length > 0;
export function planCatalog(data) {
  if (!Array.isArray(data?.plans) || !data.plans.length || data.plans.length > 20 || new Set(data.plans.map(p => p.name)).size !== data.plans.length || data.plans.some(p => !nameOK(p.name) || !text(p.title) || !text(p.description) || !Number.isInteger(p.days) || p.days < 1 || p.days > 400)) throw Error('The reading-plan catalogue is incomplete. No plan was substituted.');
  return data.plans;
}
export function planDay(data, name, day) {
  if (!nameOK(name) || data?.name !== name || data.day !== day || !Number.isInteger(day) || day < 1 || !Number.isInteger(data.days) || data.days < day || data.days > 400 || !text(data.title) || !text(data.source?.pali?.commit) || !text(data.source.pali.attribution) || !text(data.source.pali.terms) || !Array.isArray(data.readings) || !data.readings.length || data.readings.length > 20) throw Error('The selected plan day is incomplete or changed. No reading was substituted.');
  for (const r of data.readings) {
    const a = r.get_text;
    if (!text(r.id) || !text(r.citation) || !a || a.uid !== r.id || Object.keys(a).some(k => !['uid','offset','limit'].includes(k)) || (a.offset !== undefined && (!Number.isInteger(a.offset) || a.offset < 0 || a.offset > 100000)) || (a.limit !== undefined && (!Number.isInteger(a.limit) || a.limit < 1 || a.limit > 100000)) || (a.offset !== undefined && a.limit === undefined) || (r.part !== undefined && (!Number.isInteger(r.part) || !Number.isInteger(r.of) || r.part < 1 || r.part > r.of || a.limit === undefined))) throw Error('The plan contains an unsupported reading span. No reading was substituted.');
  }
  if (new Set(data.readings.map(r=>r.id)).size !== data.readings.length) throw Error('The plan contains ambiguous duplicate reading selections.');
  return data;
}
export function daySignature(data) {
  return JSON.stringify({ name:data.name, day:data.day, source:data.source.pali.commit, readings:data.readings.map(r=>({ id:r.id, offset:r.get_text.offset ?? 0, limit:r.get_text.limit ?? null, part:r.part ?? null, of:r.of ?? null })) });
}
export function cleanProgress(value) {
  if (!Array.isArray(value)) return [];
  const seen=new Set();
  return value.filter(x=>{const key=x?.name+':'+x?.day;if(!x || !nameOK(x.name) || !Number.isInteger(x.day) || x.day<1 || x.day>400 || typeof x.signature!=='string' || x.signature.length>12000 || seen.has(key))return false;seen.add(key);return true;}).slice(0,1600);
}
export function planWindow(data, uid, requestedOffset) {
  const reading=data.readings.find(r=>r.id===uid);if(!reading)throw Error('This text is not in the selected plan day.');
  const start=reading.get_text.offset ?? 0, end=reading.get_text.limit === undefined ? null : start+reading.get_text.limit;
  const offset=requestedOffset ?? start;
  if(!Number.isInteger(offset)||offset<start||(end!==null&&offset>=end))throw Error('This reading position is outside the selected plan day. Return to the plan to open its assigned span.');
  return {start,end,offset,limit:end===null?30:Math.min(30,end-offset)};
}
export function validatePlanPage(data, plan, uid, window) {
  if(data.text_id!==uid || data.source?.commit!==plan.source.pali.commit || data.offset!==window.offset || !Array.isArray(data.segments) || data.returned!==data.segments.length || !data.returned || data.returned>window.limit || (window.end!==null && data.returned!==window.limit))throw Error('The Pāli response does not match the selected plan span and source revision. No plan passage was displayed.');
}
