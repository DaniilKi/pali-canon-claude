/** Daily selections are supplied by the existing engine, never generated or personalized here. */
const text = x => typeof x === 'string' && x.trim().length > 0;
export function validateDaily(data,{date,kind}) {
  const instant=typeof data?.date==='string'?new Date(data.date+'T00:00:00Z'):null;
  if(!instant||!Number.isFinite(instant.getTime())||!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||instant.toISOString().slice(0,10)!==data.date||data.date.startsWith('0000')||(date!==undefined&&data.date!==date)||!['verse','sutta'].includes(kind)||data.kind!==kind||!text(data.text?.id)||!text(data.text.citation)||!/^([a-z][a-z0-9.-]*)$/.test(data.text.id)||data.read_with?.tool!=='get_text'||data.read_with.uid!==data.text.id||!text(data.how_chosen)||!Number.isInteger(data.rotation?.position)||!Number.isInteger(data.rotation?.of)||data.rotation.position<1||data.rotation.position>data.rotation.of||!text(data.source?.pali?.name)||!text(data.source.pali.commit)||!text(data.source.pali.attribution)||!text(data.source.pali.terms))throw Error('The daily selection is incomplete or does not match the requested date, kind and source. No other reading was substituted.');
  if(data.notes!==undefined&&(!Array.isArray(data.notes)||data.notes.some(n=>typeof n!=='string')))throw Error('The daily source notes are incomplete.');
  if(data.chapter!==undefined&&data.chapter!==null){const range=typeof data.chapter.id==='string'&&data.chapter.id.match(/^dhp(\d+)-(\d+)$/),verse=Number(data.text.id.slice(3));if(kind!=='verse'||!range||!text(data.chapter.citation)||verse<Number(range[1])||verse>Number(range[2]))throw Error('The daily chapter context does not match the selected verse.');}
  if(kind==='verse') {
    if(!/^dhp\d+$/.test(data.text.id)||!Array.isArray(data.pali)||!data.pali.length||data.pali.length>100||data.pali.some(s=>!text(s.ref)||!s.ref.startsWith(data.text.id+'/')||s.type!=='verse'||!text(s.text))||new Set(data.pali.map(s=>s.ref)).size!==data.pali.length)throw Error('The daily verse lacks its exact referenced source text. No verse was displayed.');
  } else if(!text(data.first_line)||!Number.isInteger(data.segments)||data.segments<1)throw Error('The daily discourse opening is incomplete. No full discourse was inferred from it.');
  return data;
}
