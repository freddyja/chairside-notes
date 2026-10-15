const T={en:{tabRecord:'Record',tabPatients:'Patients',tabDirectory:'Directory',tabSettings:'Settings',hero:'Just talk. Your notes write themselves.',sub:'Dictate after each visit, lecture or office update. Get a clean SOAP note, a quick summary and the full transcript — filed under the right patient.',f1:'Hands-free',f1d:'Tap once, talk naturally, tap to finish.',f2:'SOAP + summary',f2d:'Structured clinical notes and key takeaways.',f3:'By patient',f3d:"Every note lives on the patient's timeline.",privacy:'🔒 Your notes stay on this device (stored in your browser). Nothing is uploaded unless you add your own AI key in Settings. Export a backup regularly.',type:'Note type',visit:'Patient visit',lecture:'Lecture',office:'Office update',patient:'Patient',newPatient:'+ New patient',choose:'— choose —',tapStart:'Tap to start talking',tapStop:'Listening… tap to finish',transcript:'Transcript (you can also type or paste)',generate:'Generate note',noSpeech:'Voice dictation is not supported in this browser. Use Chrome, Edge or Safari — or type/paste below.',name:'Name',dob:'Date of birth',phone:'Phone',notes:'Notes',save:'Save',cancel:'Cancel',del:'Delete',edit:'Edit',print:'Print / PDF',search:'Search patients and notes…',all:'All',noNotes:'No notes yet.',noPatients:'No patients yet.',summary:'Summary',S:'Subjective',O:'Objective',A:'Assessment',P:'Plan',saved:'Saved',needPatient:'Choose a patient for a visit note',empty:'Say or type something first',export:'Export backup (JSON)',import:'Import backup',imported:'Backup imported',aiTitle:'Optional: your own AI key',aiDesc:'For better SOAP notes. Stored only on this device and sent only to the provider you choose. The app works fully without it.',provider:'Provider',key:'API key',model:'Model (optional)',base:'Base URL (OpenAI-compatible)',aiFail:'AI failed, used built-in sorter: ',sure:'Delete this?',back:'← Back',newNote:'New note for this patient',title:'Title',patients:'patients',notesN:'notes',data:'Data & backup',lang:'Language'},
es:{tabRecord:'Grabar',tabPatients:'Pacientes',tabDirectory:'Directorio',tabSettings:'Ajustes',hero:'Solo habla. Tus notas se escriben solas.',sub:'Dicta después de cada visita, clase o aviso de oficina. Recibe una nota SOAP limpia, un resumen y la transcripción completa — archivada con el paciente correcto.',f1:'Manos libres',f1d:'Toca una vez, habla, toca para terminar.',f2:'SOAP + resumen',f2d:'Notas clínicas estructuradas y puntos clave.',f3:'Por paciente',f3d:'Cada nota vive en la línea de tiempo del paciente.',privacy:'🔒 Tus notas se quedan en este dispositivo (en tu navegador). No se sube nada salvo que agregues tu propia clave de IA en Ajustes. Exporta un respaldo seguido.',type:'Tipo de nota',visit:'Visita de paciente',lecture:'Clase',office:'Aviso de oficina',patient:'Paciente',newPatient:'+ Nuevo paciente',choose:'— elegir —',tapStart:'Toca para hablar',tapStop:'Escuchando… toca para terminar',transcript:'Transcripción (también puedes escribir o pegar)',generate:'Generar nota',noSpeech:'El dictado por voz no funciona en este navegador. Usa Chrome, Edge o Safari — o escribe/pega abajo.',name:'Nombre',dob:'Fecha de nacimiento',phone:'Teléfono',notes:'Notas',save:'Guardar',cancel:'Cancelar',del:'Borrar',edit:'Editar',print:'Imprimir / PDF',search:'Buscar pacientes y notas…',all:'Todas',noNotes:'Aún no hay notas.',noPatients:'Aún no hay pacientes.',summary:'Resumen',S:'Subjetivo',O:'Objetivo',A:'Evaluación',P:'Plan',saved:'Guardado',needPatient:'Elige un paciente para una nota de visita',empty:'Primero di o escribe algo',export:'Exportar respaldo (JSON)',import:'Importar respaldo',imported:'Respaldo importado',aiTitle:'Opcional: tu propia clave de IA',aiDesc:'Para mejores notas SOAP. Se guarda solo en este dispositivo y se envía solo al proveedor que elijas. La app funciona completa sin ella.',provider:'Proveedor',key:'Clave API',model:'Modelo (opcional)',base:'URL base (compatible con OpenAI)',aiFail:'La IA falló, se usó el ordenador interno: ',sure:'¿Borrar esto?',back:'← Atrás',newNote:'Nueva nota para este paciente',title:'Título',patients:'pacientes',notesN:'notas',data:'Datos y respaldo',lang:'Idioma'}};
let lang=localStorage.lang||'en';const t=k=>T[lang][k]||k;
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(m){const e=$('#toast');e.textContent=m;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',2600)}
// IndexedDB
let db;function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open('chairside',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('patients',{keyPath:'id'});d.createObjectStore('notes',{keyPath:'id'})};r.onsuccess=()=>{db=r.result;res()};r.onerror=()=>rej(r.error)})}
const tx=(s,m='readonly')=>db.transaction(s,m).objectStore(s);
const all=s=>new Promise(r=>{const q=tx(s).getAll();q.onsuccess=()=>r(q.result)});
const put=(s,v)=>new Promise(r=>{const q=tx(s,'readwrite').put(v);q.onsuccess=()=>r()});
const del=(s,id)=>new Promise(r=>{const q=tx(s,'readwrite').delete(id);q.onsuccess=()=>r()});
const get=(s,id)=>new Promise(r=>{const q=tx(s).get(id);q.onsuccess=()=>r(q.result)});
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const fmt=d=>new Date(d).toLocaleString(lang==='es'?'es-US':'en-US',{dateStyle:'medium',timeStyle:'short'});
// Speech
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null,recOn=false,finalText='';
function startRec(){if(!SR){toast(t('noSpeech'));return}
  const ta=$('#tr');finalText=ta.value?ta.value.trim()+' ':'';rec=new SR();rec.continuous=true;rec.interimResults=true;rec.lang=lang==='es'?'es-US':'en-US';
  rec.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)finalText+=r[0].transcript.trim()+'. ';else interim+=r[0].transcript}ta.value=finalText+interim};
  rec.onerror=e=>{if(e.error==='not-allowed'){recOn=false;toast('Mic blocked');paintMic()}};
  rec.onend=()=>{if(recOn){try{rec.start()}catch(_){}}else{$('#tr')&&($('#tr').value=finalText.trim())}};
  recOn=true;rec.start();paintMic()}
function stopRec(){recOn=false;rec&&rec.stop();paintMic()}
function paintMic(){const b=$('#mic');if(!b)return;b.classList.toggle('rec',recOn);b.textContent=recOn?'⏹':'🎙️';$('#micL').textContent=recOn?t('tapStop'):t('tapStart')}
// Views
let view='home',param=null,filter='all',query='';
function go(v,p){if(recOn)stopRec();view=v;param=p;render();scrollTo(0,0)}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>go(b.dataset.v));
$('#langBtn').onclick=()=>{lang=lang==='en'?'es':'en';localStorage.lang=lang;render()};
const typeBadge=ty=>`<span class="badge ${ty}">${t(ty)}</span>`;
async function render(){document.documentElement.lang=lang;$('#langBtn').textContent=lang==='en'?'ES':'EN';
  document.querySelectorAll('[data-t]').forEach(e=>e.textContent=t(e.dataset.t));
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===view||(view==='patient'&&b.dataset.v==='patients')||(view==='note'&&b.dataset.v==='directory')));
  $('#app').innerHTML=await V[view](param);(A[view]||(()=>{}))(param)}
const V={
async home(pre){const ps=(await all('patients')).sort((a,b)=>a.name.localeCompare(b.name));
return `<h1>${t('hero')}</h1><p class="muted">${t('sub')}</p>
<div class="feat"><div class="card"><b>${t('f1')}</b><div class="muted">${t('f1d')}</div></div><div class="card"><b>${t('f2')}</b><div class="muted">${t('f2d')}</div></div><div class="card"><b>${t('f3')}</b><div class="muted">${t('f3d')}</div></div></div>
<div class="card"><div class="row"><div><label>${t('type')}</label><select id="ty"><option value="visit">${t('visit')}</option><option value="lecture">${t('lecture')}</option><option value="office">${t('office')}</option></select></div>
<div id="pw"><label>${t('patient')}</label><select id="pt"><option value="">${t('choose')}</option>${ps.map(p=>`<option value="${p.id}" ${p.id===pre?'selected':''}>${esc(p.name)}</option>`).join('')}<option value="__new">${t('newPatient')}</option></select></div></div>
<label>${t('title')}</label><input id="ti" placeholder="${t('title')}">
${SR?'':`<p class="privacy">${t('noSpeech')}</p>`}
<button id="mic" class="mic">🎙️</button><p id="micL" class="center muted">${t('tapStart')}</p>
<label>${t('transcript')}</label><textarea id="tr" style="min-height:140px"></textarea>
<button id="gen" style="width:100%">✨ ${t('generate')}</button></div><p class="privacy">${t('privacy')}</p>`},
async patients(){const ps=(await all('patients')).sort((a,b)=>a.name.localeCompare(b.name)),ns=await all('notes');
return `<div class="row"><h1 style="flex:3">${t('tabPatients')}</h1><button id="np" style="flex:0 0 auto">${t('newPatient')}</button></div>
<input id="pq" placeholder="${t('search')}"><div class="card" id="pl">${ps.length?ps.map(p=>`<a class="item" data-n="${esc(p.name.toLowerCase())}" onclick="go('patient','${p.id}')"><b>${esc(p.name)}</b><div class="muted">${ns.filter(n=>n.patientId===p.id).length} ${t('notesN')}${p.dob?' · '+esc(p.dob):''}</div></a>`).join(''):`<p class="muted">${t('noPatients')}</p>`}</div>`},
async patient(id){const p=await get('patients',id);if(!p)return '';const ns=(await all('notes')).filter(n=>n.patientId===id).sort((a,b)=>b.created-a.created);
return `<button class="ghost" onclick="go('patients')">${t('back')}</button><div class="card"><h1>${esc(p.name)}</h1>
<label>${t('name')}</label><input id="pn" value="${esc(p.name)}"><div class="row"><div><label>${t('dob')}</label><input id="pd" type="date" value="${esc(p.dob)}"></div><div><label>${t('phone')}</label><input id="pp" value="${esc(p.phone)}"></div></div>
<label>${t('notes')}</label><textarea id="pm">${esc(p.memo)}</textarea><div class="row"><button id="ps">${t('save')}</button><button class="danger" id="pdel">${t('del')}</button></div></div>
<button style="width:100%" onclick="go('home','${id}')">🎙️ ${t('newNote')}</button><h2>Timeline</h2>
<div class="card">${ns.length?ns.map(noteItem).join(''):`<p class="muted">${t('noNotes')}</p>`}</div>`},
async directory(){const ps=await all('patients'),pm=Object.fromEntries(ps.map(p=>[p.id,p.name]));let ns=(await all('notes')).sort((a,b)=>b.created-a.created);
const q=query.toLowerCase();ns=ns.filter(n=>(filter==='all'||n.type===filter)&&(!q||JSON.stringify([n,pm[n.patientId]]).toLowerCase().includes(q)));
const mp=q?ps.filter(p=>p.name.toLowerCase().includes(q)):[];
return `<h1>${t('tabDirectory')}</h1><p class="muted">${ps.length} ${t('patients')} · ${(await all('notes')).length} ${t('notesN')}</p>
<input id="dq" placeholder="${t('search')}" value="${esc(query)}"><div class="row">${['all','visit','lecture','office'].map(f=>`<button class="${filter===f?'':'ghost'}" data-f="${f}">${t(f)}</button>`).join('')}</div>
${mp.length?`<div class="card">${mp.map(p=>`<a class="item" onclick="go('patient','${p.id}')">👤 <b>${esc(p.name)}</b></a>`).join('')}</div>`:''}
<div class="card">${ns.length?ns.map(n=>noteItem(n,pm)).join(''):`<p class="muted">${t('noNotes')}</p>`}</div>`},
async note(id){const n=await get('notes',id);if(!n)return '';const p=n.patientId?await get('patients',n.patientId):null;
const f=(k,lab,v)=>`<label>${lab}</label><textarea data-k="${k}">${esc(v)}</textarea>`;
return `<div class="noprint"><button class="ghost" onclick="history.length&&go(${p?`'patient','${p.id}'`:`'directory'`})">${t('back')}</button></div>
<div class="card"><div>${typeBadge(n.type)}<span class="muted">${fmt(n.created)}</span></div><h1>${esc(n.title||t(n.type))}</h1>${p?`<p><b>${t('patient')}:</b> ${esc(p.name)}</p>`:''}
<input data-k="title" value="${esc(n.title)}" placeholder="${t('title')}" class="noprint">
<h2>${t('summary')}</h2>${f('summary',' ',n.summary)}<h2>SOAP</h2>${f('subjective','S — '+t('S'),n.soap.subjective)}${f('objective','O — '+t('O'),n.soap.objective)}${f('assessment','A — '+t('A'),n.soap.assessment)}${f('plan','P — '+t('P'),n.soap.plan)}
<h2>${t('transcript')}</h2>${f('transcript',' ',n.transcript)}
<div class="row noprint"><button id="ns">💾 ${t('save')}</button><button class="ghost" onclick="print()">🖨️ ${t('print')}</button><button class="danger" id="nd">${t('del')}</button></div></div>`},
async settings(){const c=JSON.parse(localStorage.ai||'{}');
return `<h1>${t('tabSettings')}</h1><div class="card"><h2>${t('lang')}</h2><div class="row"><button class="${lang==='en'?'':'ghost'}" onclick="lang='en';localStorage.lang='en';render()">English</button><button class="${lang==='es'?'':'ghost'}" onclick="lang='es';localStorage.lang='es';render()">Español</button></div></div>
<div class="card"><h2>${t('data')}</h2><p class="privacy">${t('privacy')}</p><div class="row"><button id="ex">⬇️ ${t('export')}</button><label class="ghost" style="background:#ccfbf1;color:#0f766e;padding:10px 14px;border-radius:12px;text-align:center;cursor:pointer">⬆️ ${t('import')}<input id="im" type="file" accept="application/json" hidden></label></div></div>
<div class="card"><h2>${t('aiTitle')}</h2><p class="muted">${t('aiDesc')}</p><label>${t('provider')}</label><select id="ap"><option value="">—</option><option value="openai" ${c.provider==='openai'?'selected':''}>OpenAI-compatible</option><option value="anthropic" ${c.provider==='anthropic'?'selected':''}>Anthropic</option></select>
<label>${t('key')}</label><input id="ak" type="password" value="${esc(c.key)}" autocomplete="off"><label>${t('model')}</label><input id="am" value="${esc(c.model)}" placeholder="gpt-4o-mini / claude-3-5-haiku-latest"><label>${t('base')}</label><input id="ab" value="${esc(c.base)}" placeholder="https://api.openai.com/v1"><button id="as">${t('save')}</button></div>`}};
function noteItem(n,pm={}){return `<a class="item" onclick="go('note','${n.id}')">${typeBadge(n.type)}<b>${esc(n.title||t(n.type))}</b>${pm[n.patientId]?' · '+esc(pm[n.patientId]):''}<div class="muted">${fmt(n.created)} — ${esc((n.summary||n.transcript).replace(/•/g,'').slice(0,110))}</div></a>`}
async function newPatient(){const name=prompt(t('name'));if(!name||!name.trim())return null;const p={id:uid(),name:name.trim(),dob:'',phone:'',memo:'',created:Date.now()};await put('patients',p);return p}
const A={
home(){const ty=$('#ty'),pw=$('#pw'),pt=$('#pt');ty.onchange=()=>pw.style.visibility=ty.value==='visit'?'visible':'hidden';
  pt.onchange=async()=>{if(pt.value==='__new'){const p=await newPatient();if(p){pt.insertAdjacentHTML('afterbegin',`<option value="${p.id}">${esc(p.name)}</option>`);pt.value=p.id}else pt.value=''}};
  $('#mic').onclick=()=>recOn?stopRec():startRec();
  $('#gen').onclick=async()=>{if(recOn)stopRec();const text=$('#tr').value.trim();if(!text)return toast(t('empty'));
    if(ty.value==='visit'&&!pt.value)return toast(t('needPatient'));
    $('#gen').disabled=true;$('#gen').textContent='…';let r;const c=JSON.parse(localStorage.ai||'{}');
    if(c.provider&&c.key){try{r=await aiSoap(text,ty.value,c,lang)}catch(e){toast(t('aiFail')+e.message)}}
    r=r||localSoap(text,ty.value);
    const n={id:uid(),type:ty.value,patientId:ty.value==='visit'?pt.value:(pt.value&&pt.value!=='__new'?pt.value:null),title:$('#ti').value.trim(),transcript:text,soap:r.soap,summary:r.summary,created:Date.now()};
    await put('notes',n);toast(t('saved'));go('note',n.id)}},
patients(){$('#np').onclick=async()=>{const p=await newPatient();if(p)go('patient',p.id)};$('#pq').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('#pl .item').forEach(i=>i.style.display=i.dataset.n.includes(q)?'':'none')}},
patient(id){$('#ps').onclick=async()=>{const p=await get('patients',id);Object.assign(p,{name:$('#pn').value.trim()||p.name,dob:$('#pd').value,phone:$('#pp').value,memo:$('#pm').value});await put('patients',p);toast(t('saved'));render()};
  $('#pdel').onclick=async()=>{if(!confirm(t('sure')))return;for(const n of await all('notes'))if(n.patientId===id)await del('notes',n.id);await del('patients',id);go('patients')}},
directory(){const d=$('#dq');d.oninput=()=>{query=d.value;clearTimeout(d._t);d._t=setTimeout(async()=>{await render();const e=$('#dq');e.focus();e.setSelectionRange(e.value.length,e.value.length)},250)};document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{filter=b.dataset.f;render()})},
note(id){$('#ns').onclick=async()=>{const n=await get('notes',id);document.querySelectorAll('[data-k]').forEach(e=>{const k=e.dataset.k;if(['subjective','objective','assessment','plan'].includes(k))n.soap[k]=e.value;else n[k]=e.value});n.updated=Date.now();await put('notes',n);toast(t('saved'))};
  $('#nd').onclick=async()=>{if(!confirm(t('sure')))return;await del('notes',id);go('directory')}},
settings(){$('#as').onclick=()=>{localStorage.ai=JSON.stringify({provider:$('#ap').value,key:$('#ak').value.trim(),model:$('#am').value.trim(),base:$('#ab').value.trim()});toast(t('saved'))};
  $('#ex').onclick=async()=>{const b=new Blob([JSON.stringify({app:'chairside',version:1,exported:new Date().toISOString(),patients:await all('patients'),notes:await all('notes')},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='chairside-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click()};
  $('#im').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());for(const p of d.patients||[])await put('patients',p);for(const n of d.notes||[])await put('notes',n);toast(t('imported'))}catch(x){toast('Error: '+x.message)}}}};
// Service worker + auto-update
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{let last=0;const chk=()=>{if(Date.now()-last<30000)return;last=Date.now();reg.update().catch(()=>{})};chk();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')chk()})});
  let reloaded=false;const had=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!had||reloaded||recOn)return;reloaded=true;location.reload()})}
openDB().then(render);
