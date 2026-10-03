const S={live:false,lang:(navigator.language||'hi').startsWith('en')?'en':'hi',screen:'pause',text:'',situation:null,ledger:null,redact:null,sebi:null,rec:null};
const L=()=>S.lang, tr=(a)=>a[L()==='hi'?0:1];

const t=(k)=>tr(U[k]);
let FX={},DEMOS={};
// ===== mock redaction (A owns the real one) =====
function redact(x){const r={};let o=x;
 o=o.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g,()=>(r.id=(r.id||0)+1,'[ID]'));
 o=o.replace(/\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g,()=>(r.phone=(r.phone||0)+1,'[PHONE]'));
 o=o.replace(/[\w.\-]+@[\w\-]+\.[a-z]{2,}\b/gi,()=>(r.email=(r.email||0)+1,'[EMAIL]'));
 o=o.replace(/(otp[^\d]{0,12})\d{4,6}/gi,(m,a)=>(r.otp=(r.otp||0)+1,a+'[OTP]'));
 return{redacted:o,report:r}}

function pick(x){const s=x.toLowerCase();
 if(/withdraw|\bnikal|\btax\b|\.apk\b|\bprofit\b/.test(s))return'praveen';
 if(/ipo|allot|upi|@|guarantee|pay|bhej/.test(s))return'kavita';
 if(/statement|notice|dear customer|bank|contribution/.test(s))return'control-a';return'control-b'}
// ===== helpers =====
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const go=(s)=>{S.screen=s;render();window.scrollTo(0,0)};
function say(txt){if(!('speechSynthesis' in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(txt);u.lang=L()==='hi'?'hi-IN':'en-IN';speechSynthesis.speak(u)} // fallback; /api/tts later
function nextSteps(){const m={PREVENTION:[['Ruk jayein. Paise na bhejein.','Pause. Do not send money.'],['Payee ko SEBI Check par verify karein.','Verify the payee on SEBI Check.'],['Kisi bharosemand se poochein.','Ask someone you trust.']],
 ATTEMPTED:[['Jawab na dein; number aur link block/report karein (I4C aur telecom report).','Do not engage; block and report the number and link (I4C, telecom).'],['Screenshot sambhal kar rakhein.','Keep screenshots.']],
 PAID:[['Abhi samay bahut zaroori hai. Neeche "Paise de diye?" kholein.','Time matters. Open "Already paid?" below.'],['1930 par turant call karein.','Call 1930 right away.']],
 ONGOING:[['Aur paise na bhejein. Paisa nikalne ke liye fee na dein.','Stop paying. Never pay a fee to withdraw.'],['1930 par call karein, phir neeche recovery steps dekhein.','Call 1930, then see the recovery steps below.']]};
 return m[S.situation||'PREVENTION']}
function trustCard(l){const a=l.act?tr(l.act):'';const top=l.items[0]?tr(l.items[0].t):'';
 return L()==='hi'?`Mujhe yeh investment sandesh aaya hai. ${a} SACH ko yeh mila: ${top||'koi bada sanket nahi'}. Kya aap mere saath check kar sakte ho, paise bhejne se pehle?`
 :`I received this investment message. ${a} SACH noted: ${top||'no major signal'}. Can you check it with me before I send any money?`}
function incident(l){const p=l.payee?l.payee.value:'—';return (L()==='hi'?`Taareekh: ${new Date().toLocaleDateString()}\nPayee: ${p}\nDaava: ${l.items[0]?tr(l.items[0].t):'—'}\nPlatform: WhatsApp/Telegram\nRaashi: (bharein)\nLink: (bharein)`:`Date: ${new Date().toLocaleDateString()}\nPayee: ${p}\nClaim: ${l.items[0]?tr(l.items[0].t):'—'}\nPlatform: WhatsApp/Telegram\nAmount: (fill in)\nLinks: (fill in)`)}
async function share(txt){const u='https://wa.me/?text='+encodeURIComponent(txt);window.open(u,'_blank','noopener')}
async function cp(txt,btn){try{await navigator.clipboard.writeText(txt)}catch(e){}if(btn){const o=btn.innerHTML;btn.textContent=t('copied');setTimeout(()=>btn.innerHTML=o,1200)}}

// ===== views =====
const top=()=>`<header><span class="logo">SACH</span><span style="display:flex;gap:8px"><button class="sm" aria-label="Language" onclick="S.lang=L()==='hi'?'en':'hi';render()">${L()==='hi'?'EN':'हिं'}</button></span></header>`;
const V={
pause:()=>`${top()}<h1>${t('pause')}</h1><p class="mut">${t('sub')}</p>
 <button class="pri" onclick="startVoice()">${t('speak')}</button><button onclick="go('input')">${t('paste')}</button><button disabled aria-disabled="true" style="opacity:.55">${t('shot')}</button>
 <p id="vmsg" class="mut"></p>
 <details><summary>${t('demo')}</summary>${Object.keys(DEMOS).map(k=>`<button onclick="S.text=DEMOS['${k}'];go('situation')">${k}</button>`).join('')}</details>`,
input:()=>`${top()}<h1>${t('paste')}</h1><textarea id="tx" maxlength="8000" placeholder="${esc(t('ph'))}" aria-label="${esc(t('ph'))}">${esc(S.text)}</textarea>
 <button class="pri" onclick="S.text=document.getElementById('tx').value.trim();if(S.text)go('situation')">${t('go')}</button><button onclick="go('pause')">${t('back')}</button>`,
situation:()=>`${top()}<h1>${t('sit')}</h1>${['PREVENTION','ATTEMPTED','PAID','ONGOING'].map(k=>`<button class="${k==='PREVENTION'?'pri':''}" onclick="S.situation='${k}';run()">${t('s_'+k)}</button>`).join('')}<button onclick="go('input')">${t('back')}</button>`,
checking:()=>`${top()}<h1>${t('checking')}</h1><div class="card">${U.steps.map(s=>`<p>⏳ ${tr(s)}</p>`).join('')}</div>`,
result:()=>{const l=S.ledger,e=l.items,low=l.header==='LOW_CONCERN';
 const sec=(k,f)=>{const a=e.filter(f);return a.length?`<h2>${t(k)}</h2>`+a.map(item).join(''):''};
 return `${top()}<div class="hdr" role="status">${t('h_'+l.header)}${low?`<div class="mut" style="font-weight:400;font-size:16px">${t('lowNote')}</div>`:''}</div>
 <div class="action"><small>${t('act')}</small><br>${esc(tr(l.act))}</div>
 ${sec('sec_hard',x=>x.forgeability==='hard'&&x.label!=='COULDNT_VERIFY')}${sec('sec_easy',x=>x.forgeability==='easy'&&x.label!=='AI_INTERPRETATION'&&x.label!=='COULDNT_VERIFY')}
 ${sec('sec_unk',x=>x.label==='COULDNT_VERIFY')}${sec('sec_ai',x=>x.label==='AI_INTERPRETATION')}
 ${l.stage?stage(l):''}
 <h2>${t('next')}</h2><div class="card"><ol>${nextSteps().map(x=>`<li>${tr(x)}</li>`).join('')}</ol></div>
 ${S.sebi?`<p class="card">${t('conf')}<b>${S.sebi}</b></p>`:''}
 ${l.payee?`<button class="pri" onclick="verify()">🔍 ${t('verify')}</button>`:''}
 <button onclick="say(speakText())">${t('hear')}</button><button onclick="go('trust')">${t('trust')}</button><button onclick="go('recovery')">${t('paid')}</button>
 <button onclick="window.open(I4C_URL,'_blank','noopener')">🔎 ${t('i4c')}</button><p class="mut">${t('i4cNote')}</p>
 ${privacy()}<button onclick="S.text='';S.situation=null;S.sebi=null;go('pause')">${t('again')}</button>`},
trust:()=>{const x=trustCard(S.ledger);return `${top()}<h1>${t('tcTitle')}</h1><div class="card"><pre id="tc">${esc(x)}</pre></div>
 <button class="pri" onclick="share(trustCard(S.ledger))">${t('wa')}</button><button onclick="cp(trustCard(S.ledger),this)">${t('copy')}</button><button onclick="go('result')">${t('back')}</button>`},
ret:()=>`${top()}<h1>${t('ret')}</h1><button onclick="S.sebi=t('r1');go('result')">${t('r1')}</button><button onclick="S.sebi=t('r2');go('result')">${t('r2')}</button><button onclick="S.sebi=t('r3');go('result')">${t('r3')}</button>`,
recovery:()=>`${top()}<h1>${t('rec')}</h1><div class="card"><ol>${U.recSteps.map(s=>`<li>${tr(s)}</li>`).join('')}</ol></div>
 <a class="btn pri" href="tel:1930">📞 1930</a><p class="mut">${t('recNote')}</p><h2>${t('inc')}</h2>
 <textarea id="inc" style="min-height:160px">${esc(incident(S.ledger))}</textarea>
 <button onclick="cp(document.getElementById('inc').value,this)">${t('copy')}</button><button onclick="share(document.getElementById('inc').value)">${t('wa')}</button><button onclick="go('result')">${t('back')}</button>`};
function item(x){const cls=x.label==='AI_INTERPRETATION'?'ai':x.label==='COULDNT_VERIFY'?'unk':x.forgeability;
 return `<div class="card ${cls}"><span class="chip ${x.label}">${t('lbl_'+x.label)}</span><span class="tag">${x.label==='AI_INTERPRETATION'?'AI':tr(U[x.forgeability])}</span>
 <p style="margin:4px 0"><b>${esc(tr(x.t))}</b></p><p class="mut" style="margin:4px 0">${esc(tr(x.w))}</p>
 ${x.s?`<p style="margin:4px 0">💡 <b>${t('settle')}</b>${esc(tr(x.s))}</p>`:''}${x.source?`<p class="mut" style="margin:4px 0">${t('src')}: <a href="${x.source.url}" target="_blank" rel="noopener">${esc(x.source.name)}</a></p>`:''}</div>`}
function stage(l){return `<h2>${t('stage')}</h2><div class="strip" role="list">${U.stages.map((s,i)=>`<div role="listitem" class="${i+1===l.stage?'on':''}">${i+1}<br>${tr(s)}</div>`).join('')}</div>
 <p class="mut">${esc(tr(l.because))} ${t('stageNote')}</p>
 ${l.timeline?`<div class="tl">${l.timeline.map(m=>`<p class="${m.is_payment_ask?'pay':''}"><span class="tag">${m.stage}</span> ${esc(m.snippet)} <span class="tag">${esc(tr(U.stages[m.stage-1]))}</span></p>`).join('')}</div>`:''}`}
function privacy(){const r=S.redact||{},n=Object.keys(r).map(k=>`${k}×${r[k]}`).join(', ')||'—';
 return `<h2>${t('priv')}</h2><div class="card"><p><b>${t('pv_dev')}:</b> ${L()==='hi'?'redaction, jaankari nikalna':'redaction, signal extraction'} (${esc(n)})</p>
 <p><b>${t('pv_sent')}:</b> ${!S.live?(L()==='hi'?'Kuch nahi':'Nothing'):'1 redacted text'}</p><p><b>${t('pv_to')}:</b> ${!S.live?'—':'LLM provider'}</p><p><b>${t('pv_st')}:</b> ${t('none')}</p>${!S.live?`<p class="mut">${t('mock')}</p>`:''}</div>`}
function speakText(){const l=S.ledger;return `${t('h_'+l.header)}. ${tr(l.act)}. ${l.items.filter(x=>x.label!=='AI_INTERPRETATION').slice(0,2).map(x=>tr(x.t)).join('. ')}`}
function verify(){cp(S.ledger.payee.value);window.open(SEBI_CHECK_URL,'_blank','noopener');alert(t('verifyNote'));go('ret')}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){go('checking');const rd=redact(S.text);S.redact=rd.report;let l=null;S.live=false;
 if(!USE_MOCK){try{const c=new AbortController();setTimeout(()=>c.abort(),3000);
  const r=await fetch('/api/check',{method:'POST',headers:{'content-type':'application/json'},signal:c.signal,body:JSON.stringify({redacted_text:rd.redacted,signals:{},situation:S.situation,lang:L()})});
  l=adapt(await r.json());S.live=true}catch(e){l=null}}
 if(!l){await sleep(900);l=FX[pick(rd.redacted)]} // offline/LLM-down fallback: swap for engine checkRules() when A ships it
 S.ledger=l;go('result')}
const adapt=j=>({header:j.header,act:[j.action_requested.text_hi,j.action_requested.text_en],stage:j.stage?j.stage.index:0,because:j.stage?[j.stage.because_hi,j.stage.because_en]:['',''],payee:j.payee,timeline:j.timeline,
 items:j.items.map(x=>({id:x.id,label:x.label,forgeability:x.forgeability,t:[x.title_hi,x.title_en],w:[x.why_hi,x.why_en],s:x.settle_hi?[x.settle_hi,x.settle_en]:null,source:x.source}))});
const KEYS=['kavita','praveen','control-a','control-b'];
async function loadFx(){await Promise.all(KEYS.map(async k=>{FX[k]=adapt(await (await fetch('fixtures/ledgers/'+k+'.json')).json());DEMOS[k]=await (await fetch('fixtures/inputs/'+k+'.txt')).text()}))}
async function boot(){try{await loadFx()}catch(e){document.getElementById('app').textContent='Serve over http, e.g. python3 -m http.server 8080';return}
 const q=new URLSearchParams(location.search).get('text'); // PWA share target
 if(q){S.text=q;S.screen='situation'}render()}
function startVoice(){const R=window.SpeechRecognition||window.webkitSpeechRecognition,m=document.getElementById('vmsg');
 if(!R){m.textContent=t('mic0');return}const r=new R();r.lang='hi-IN';r.onresult=e=>{S.text=e.results[0][0].transcript;go('situation')};r.onerror=()=>{m.textContent=t('mic0')};r.start();m.textContent=t('listen')}
function render(){document.documentElement.lang=L();document.getElementById('app').innerHTML=V[S.screen]()}
boot();
