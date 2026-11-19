/** SYNTHETIC fixture only. Explicit memory-backed sessionStorage avoids real quota claims. */
export function capacityFixture(actualMark, maxBytes = 16 * 1024 * 1024) {
 const first = {...actualMark, note: '\u0000'.repeat(4000)};
 const entries = Array.from({length: 500}, (_, i) => ({bookmark: i === 0 ? first : i === 1 ? {...first, note: '\u0000'.repeat(3999) + 'x'} : {uid:'mn'+(i+1000),ref:'mn'+(i+1000)+'/1',title:'Synthetic capacity reference',note:'\u0000'.repeat(4000),offset:0,source_commit:'synthetic-revision'},draft:''}));
 const encode = value => JSON.stringify({version:1,entries:value});
 const byteLength = value => new TextEncoder().encode(value).byteLength;
 const baseBytes = byteLength(encode(entries)), n = Math.floor((maxBytes-baseBytes)/(entries.length*6));
 if(n<1 || n>=4000)throw Error('Unexpected synthetic fixture capacity');
 for(const entry of entries)entry.draft='\u0000'.repeat(n);
 const raw=encode(entries), latest='\u0000'.repeat(4000), changed=entries.map((e,i)=>i===0?{...e,draft:latest}:e);
 if(byteLength(raw)>maxBytes || byteLength(encode(changed))<=maxBytes)throw Error('Fixture does not cross exact capacity');
 return {mark:first,entries,raw,latest,metadata:{synthetic_only:true,entries:entries.length,max_bytes:maxBytes,raw_bytes:byteLength(raw),older_draft_characters:n,latest_draft_characters:latest.length,distinct_same_identity_bases:2}};
}
