/** Exact ordinary-version comparison guards. No source retrieval or scope approval. */
import {validateEnglishPage} from './translation-policy.mjs';

const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const own=(x,key)=>Object.hasOwn(x,key);
const text=x=>typeof x==='string'&&x.trim().length>0;
const uid=x=>typeof x==='string'&&x.trim()===x&&/^[a-z][a-z0-9.-]{0,199}$/.test(x);
const sha=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const clone=x=>JSON.parse(JSON.stringify(x));
const failure=()=>{throw Error('The comparison selection or source response is invalid. No comparison translation was displayed.');};
const sourceId=x=>typeof x==='string'&&x.trim()===x&&!/[\x00-\x1f\x7f]/.test(x)&&x.length<=200&&!x.includes('..')&&!/\.html?$/.test(x)&&(
  /^dt:[A-Za-z0-9_./-]+$/.test(x)||
  /^ati:\/(?:tipitaka|lib|ptf|noncanon)\/[a-z0-9/._-]+$/.test(x)||
  /^aj:[A-Za-z0-9_./ -]+$/.test(x)&&x.trim()===x
);

export function comparisonChoices(choices,requestedId){
  if(!uid(requestedId)||!Array.isArray(choices))failure();
  const seen=new Set(),ordinary=[];
  for(const choice of choices){
    if(!object(choice))failure();
    if(text(choice.translation_id)){
      if(seen.has(choice.translation_id))failure();
      seen.add(choice.translation_id);
    }
    // Presence is decisive, including null/undefined or inherited declarations.
    if('translation_scope' in choice||choice.whole_unit_coverage===false)continue;
    if(!sourceId(choice.translation_id)||!text(choice.translator)||choice.translator.length>300
      ||own(choice,'whole_unit_coverage')&&choice.whole_unit_coverage!==true)failure();
    ordinary.push(clone(choice));
  }
  return ordinary;
}

export function comparisonSelection(ids,choices,requestedId){
  const ordinary=comparisonChoices(choices,requestedId);
  if(!Array.isArray(ids)||ids.length<2||ids.length>4||new Set(ids).size!==ids.length
    ||ids.some(id=>!sourceId(id)||!ordinary.some(choice=>choice.translation_id===id)))failure();
  return [...ids];
}

const requestKeys=new Set(['uid','translation','offset','limit','prefix_sha256']);
function request(args,requestedId,choice,expectedLimit){
  if(!object(args)||Object.keys(args).some(key=>!requestKeys.has(key))||args.uid!==requestedId
    ||args.translation!==choice.translation_id||!sourceId(args.translation)
    ||!Number.isSafeInteger(args.limit)||args.limit<500||args.limit>30000
    ||expectedLimit!==undefined&&args.limit!==expectedLimit)failure();
  const offset=own(args,'offset')?args.offset:0;
  if(!Number.isSafeInteger(offset)||offset<0||offset>2000000
    ||offset===0&&own(args,'prefix_sha256')||offset>0&&!sha(args.prefix_sha256))failure();
  return offset;
}

/** Return a cloned same-column continuation, or null, before exposing any wording. */
export function validateComparisonPage(data,args,context){
  if(!object(context)||!uid(context.uid)||context.accepted!=null)failure();
  const ordinary=comparisonChoices(context.choices,context.uid);
  const choice=ordinary.find(choice=>choice.translation_id===args?.translation);
  if(!choice)failure();
  const offset=request(args,context.uid,choice);
  if(!object(data)||data.translation_id!==args.translation)throw Error('A different English source was returned for this comparison column. No translation was displayed.');
  if(data.translator!==choice.translator||data.limit!==args.limit||!sha(data.prefix_sha256)
    ||offset>0&&data.prefix_sha256!==args.prefix_sha256||'translation_scope' in data||data.whole_unit_coverage===false
    ||typeof data.text!=='string'||data.text.length>args.limit||offset+data.text.length>2000000
    ||!own(data,'next_offset')||data.next_offset!==null&&!Number.isSafeInteger(data.next_offset))failure();
  // Restrict the existing guard to this requested edition: listed ATI fallback
  // versions cannot silently replace a DT column, even when separately selected.
  const next=validateEnglishPage(data,args,{uid:context.uid,choices:[choice],accepted:null});
  if(next===null)return null;
  if(!object(data.continue_with)||Object.keys(data.continue_with).sort().join(',')!=='arguments,name')failure();
  const nextOffset=request(next,context.uid,choice,args.limit);
  if(data.text.length!==args.limit||nextOffset!==offset+data.text.length)failure();
  return clone(next);
}
