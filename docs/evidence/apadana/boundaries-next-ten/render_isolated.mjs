// Execute only finite existing pure renderer/helper declarations against
// original source data. No application imports, lazy load, server or network.
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const dir='/tmp/pali-next-ten-evidence-nov26/source-oracle';
const root='/tmp/pali-next-ten-boundaries-nov26';
const digest=raw=>createHash('sha256').update(raw).digest('hex');
const raw=readFileSync(`${dir}/ISOLATED_RENDER_INPUT.json`);
const input=JSON.parse(raw);
const canon=readFileSync(`${root}/src/canon.mjs`,'utf8');
const editions=readFileSync(`${root}/src/editions.mjs`,'utf8');
const declaration=(source,name)=>{
  const match=source.match(new RegExp(`(?:export )?const ${name} = [\\s\\S]*?;`));
  if(!match)throw Error(`Missing finite declaration ${name}`);
  return match[0].replace(/^export /,'');
};
const fn=(source,name)=>{
  const marker=`function ${name}(`,start=source.indexOf(marker);
  if(start<0||source.indexOf(marker,start+1)>=0)throw Error(`Finite exact function required: ${name}`);
  const end=source.indexOf('\n}',start);
  if(end<0)throw Error('Function end missing');
  return source.slice(start,end+2);
};
const pieces=[
  ...['ROMAN','HEADING','CENTRE_HEADING','VERSE','VERSE_CITED','PTS_ABBR'].map(n=>declaration(canon,n)),
  ...['EDITIONS','SCOPE_LABEL'].map(n=>declaration(editions,n)),
  fn(canon,'ptsLabel'),fn(editions,'editionIndex'),fn(editions,'editionLabel'),fn(canon,'renderUnitSegments'),
];
// The exact original helpers are evaluated without import/require/process/fs or
// timers. Cached edition ambiguity comes from all original current markers.
const frozenBefore=JSON.stringify(input.canon);
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
freeze(input);
const context=vm.createContext({input});
const run=pieces.join('\n\n')+`
const snapshot={canon:input.canon,editions:{needsBook:new Set(input.needsBook)}};
globalThis.result={
 old:input.old_units.map(unit=>({id:unit.id,segments:renderUnitSegments(unit,snapshot,{includeNotes:true,includeSourcePositions:true})})),
 proposed:input.proposed_units.map(unit=>({id:unit.id,segments:renderUnitSegments(unit,snapshot,{includeNotes:true,includeSourcePositions:true})}))
};`;
new vm.Script(run,{filename:'finite-existing-reader-segmentation-only.mjs'}).runInContext(context,{timeout:10000});
if(JSON.stringify(input.canon)!==frozenBefore)throw Error('Source data mutated');
const metadata=segment=>{
 const {text,...rest}=segment;
 const noteText=rest.variant_readings;
 delete rest.variant_readings;
 return {...rest,text_sha256:digest(text),text_utf16_length:text.length,
   notes_sha256:digest(JSON.stringify(noteText||[])),note_count:(noteText||[]).length,
   ...(noteText?{note_text_sha256:noteText.map(digest)}:{})};
};
const observed=JSON.parse(JSON.stringify(context.result));
for(const phase of ['old','proposed'])for(const unit of observed[phase])unit.segments=unit.segments.map(metadata);
const output={schema:'isolated-existing-reader-next10-source-position-diagnostic-v1',
 provenance:'Exact finite declarations extracted from existing current canon/editions sources; no application module imported or lazy loader invoked.',
 source_preseal_before_renderer:input.presealed_source_report_sha256,
 input_sha256:digest(raw),canon_source_sha256:digest(canon),editions_source_sha256:digest(editions),
 exact_extracted_code_sha256:digest(pieces.join('\n\n')),
 extracted_declarations:pieces.map(p=>({first_line:p.split('\n')[0],sha256:digest(p)})),
 original_source_unchanged:true,VM_timeout_ms:10000,VM_filesystem_network_process_interfaces:false,...observed};
const serialized=JSON.stringify(output,null,2)+'\n';
writeFileSync(`${dir}/ISOLATED_RENDER_POSITIONS.json`,serialized,{flag:'wx'});
console.log(JSON.stringify({status:'SOURCE_POSITION_DIAGNOSTIC_COMPLETE',output_sha256:digest(serialized),counts:{old:observed.old.map(u=>[u.id,u.segments.length]),proposed:observed.proposed.map(u=>[u.id,u.segments.length])}}));
