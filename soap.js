// Local heuristic SOAP sorter (EN/ES dental vocabulary)
const SOAP_KW={
S:/\b(complain\w*|reports?|states?|says|said|feels?|felt|pain|hurts?|ache|aching|sensitiv\w*|sore|bleed\w* when|history|since|weeks?|days? ago|worried|concern\w*|patient (?:wants|notes|mentions)|chief complaint|dolor|molestia|sensibilidad|refiere|dice|siente|paciente (?:quiere|menciona))\b/i,
O:/\b(exam\w*|observ\w*|noted|found|present|visible|x-?rays?|radiograph\w*|bitewings?|pa\b|periapical|pano\w*|probing|pocket\w*|\d+ ?mm|bop|bleeding on probing|mobility|recession|calculus|plaque|caries|decay|lesion|fracture\w*|crack\w*|swelling|percussion|palpation|cold test|vital\w*|bp\b|blood pressure|tooth #?\d+|#\d+|mesial|distal|occlusal|buccal|lingual|facial|radiograf\w*|caries|bolsa\w*|sangrado|movilidad|diente)\b/i,
A:/\b(diagnos\w*|assess\w*|impression|consistent with|likely|suspect\w*|probable|rule out|r\/o|gingivitis|periodontitis|pulpitis|irreversible|reversible|necro\w*|abscess|stage [i1-4v]+|grade [abc]|prognosis|diagn[oó]stic\w*|probable|absceso|gingivitis|periodontitis)\b/i,
P:/\b(plan|will|schedule\w*|recall|follow[- ]?up|return|next (?:visit|appointment)|recommend\w*|refer\w*|prescri\w*|rx|amoxicillin|ibuprofen|chlorhexidine|fluoride|sealant|crown|filling|composite|amalgam|root canal|rct|extract\w*|implant|scaling|srp|root planing|cleaning|prophy|night ?guard|bridge|veneer|whitening|instruct\w*|ohi|cita|seguimiento|recomend\w*|receta\w*|corona|empaste|endodoncia|extracci[oó]n|limpieza|volver|regresar)\b/i};
function splitSentences(t){return t.replace(/\s+/g,' ').split(/(?<=[.!?])\s+|\s*\n\s*|\s+(?=(?:subjective|objective|assessment|plan)\s*:\b)/i).map(s=>s.trim()).filter(s=>s.length>2)}
function cap(s){s=s.trim();if(!s)return s;s=s[0].toUpperCase()+s.slice(1);return /[.!?]$/.test(s)?s:s+'.'}
function classify(s){
  const ex=s.match(/^(subjective|objective|assessment|plan|subjetivo|objetivo|evaluaci[oó]n|plan)\s*[:-]\s*/i);
  if(ex){const k=ex[1][0].toUpperCase();return {k:k==='E'?'A':k,s:s.slice(ex[0].length)}}
  const sc={S:0,O:0,A:0,P:0};for(const k in SOAP_KW){const m=s.match(new RegExp(SOAP_KW[k].source,'gi'));if(m)sc[k]+=m.length}
  if(/^(we|i)'?ll\b|\bwill\b|\bnext\b/i.test(s))sc.P+=1.5;
  if(/\b(patient|pt|he|she|they)\b.*\b(says|reports|complains|feels)\b/i.test(s))sc.S+=1.5;
  const best=Object.entries(sc).sort((a,b)=>b[1]-a[1])[0];return {k:best[1]>0?best[0]:null,s}}
function localSoap(text,type){
  const out={S:[],O:[],A:[],P:[]};const sents=splitSentences(text);let last='S';
  for(const raw of sents){let {k,s}=classify(raw);k=k||last;out[k].push(cap(s));last=k}
  const soap={subjective:out.S.join(' '),objective:out.O.join(' '),assessment:out.A.join(' '),plan:out.P.join(' ')};
  return {soap,summary:localSummary(sents,type)}}
function localSummary(sents,type){
  if(!sents.length)return '';
  const imp=/\b(tooth|#\d+|caries|crown|root canal|extract|pain|diagnos|plan|follow|refer|prescri|schedule|important|remember|deadline|key|must|need|meeting|staff|policy|diente|dolor|cita|importante)\b/i;
  const scored=sents.map((s,i)=>({s,i,v:(s.match(new RegExp(imp.source,'gi'))||[]).length+(/\d/.test(s)?.5:0)+(i===0?.7:0)}));
  const n=Math.min(5,Math.max(2,Math.ceil(sents.length/3)));
  return scored.sort((a,b)=>b.v-a.v).slice(0,n).sort((a,b)=>a.i-b.i).map(x=>'• '+cap(x.s)).join('\n')}
async function aiSoap(text,type,cfg,lang){
  const sys=`You are a dental clinical scribe. Given a dictated ${type} transcript, return ONLY JSON: {"subjective":"","objective":"","assessment":"","plan":"","summary":"bullet list with • lines"}. For lectures/office updates use the fields loosely (S=context, O=facts, A=key points, P=action items). Write in ${lang==='es'?'Spanish':'English'}. Do not invent facts.`;
  let r,j,txt;
  if(cfg.provider==='anthropic'){
    r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':cfg.key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:cfg.model||'claude-3-5-haiku-latest',max_tokens:1500,system:sys,messages:[{role:'user',content:text}]})});
    j=await r.json();if(!r.ok)throw new Error(j.error?.message||r.status);txt=j.content[0].text;
  }else{
    const base=(cfg.base||'https://api.openai.com/v1').replace(/\/$/,'');
    r=await fetch(base+'/chat/completions',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+cfg.key},body:JSON.stringify({model:cfg.model||'gpt-4o-mini',messages:[{role:'system',content:sys},{role:'user',content:text}]})});
    j=await r.json();if(!r.ok)throw new Error(j.error?.message||r.status);txt=j.choices[0].message.content;}
  const o=JSON.parse(txt.slice(txt.indexOf('{'),txt.lastIndexOf('}')+1));
  return {soap:{subjective:o.subjective||'',objective:o.objective||'',assessment:o.assessment||'',plan:o.plan||''},summary:o.summary||''}}
