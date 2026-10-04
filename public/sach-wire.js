/* sach-wire.js: loads AFTER the mockup's inline script. Replaces its canned data layer with SACHEngine + /api/check (D3-D7).
   It only reassigns the mockup's global functions (go, render, runCheck, speechIn, toggleVoice, stopVoice, setCase, trustText, incident, openSheet, renderToolbar). */
(function(){
'use strict';
const E=window.SACHEngine,CFG=window.SACH_CONFIG||{},DEV=new URLSearchParams(location.search).has('dev');
const BRAND=CFG.BRAND||{hi:'ईक्षा',en:'IKSHA'},SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const SN=['HOOK','TRUST_BUILDING','FAKE_PROOF','DEPOSIT_PUSH','WITHDRAWAL_BLOCKED'],HD=['HIGH_CONCERN','MIXED_SIGNALS','LOW_CONCERN','CANT_VERIFY'];
let RUN=0,audio=null;
/* ---- extra strings ---- */
Object.assign(UI.hi,{tooLong:'????? ???? ???? ?? (8,000 ????? ??)? ???? ?????? ??????',mic0:'?? ???????? ??? ????? ????? ?????? ???? ??? ????? ????? ?????',novoice:'?? ???? ??? ????? ????? ???? ????? ????? ???? ??? ??????',
 offB:'????? ?? ???? ????? ???? ?? ???? ?????? ?????? ?? ??? (rules only)? ????? ????? ?? ???? ????',unsrc:'????? ?? ?????? ???? (dev)'});
Object.assign(UI.en,{tooLong:'Message is too long (up to 8,000 characters). Please pick a shorter part.',mic0:'Voice input is not available in this browser. Please paste instead.',novoice:'No Hindi voice found on this phone. Please read the text.',
 offB:'Could not reach the server. This check used rules only, so results may be limited.',unsrc:'unverified source (dev)'});
/* ---- demo inputs only: example buttons fill the textbox, then the normal path runs (D5) ---- */
setCase=function(id){const r=(typeof D!=='undefined'&&D.raw)||{};S.caseId=id;S.raw=r[id]||'';S.orig=S.raw;S.ledger=null;S.empty=false;S.sit='PREVENTION'};
S.theme='auto';S.ledger=null;S.raw='';S.orig='';
/* ---- normalise engine ledger to what the screens read ---- */
function clean(l){l=JSON.parse(JSON.stringify(l).replace(/\s*\[VERIFY\]/g,'')); // D7: [VERIFY] never rendered
 if(!HD.includes(l.header))l.header='CANT_VERIFY';
 l.items=(l.items||[]).filter(x=>x&&x.id&&x.label);l.items.forEach(x=>{if(!x.forgeability)x.forgeability='easy'});
 const a=l.action_requested=l.action_requested||{text_hi:'',text_en:''};
 if(typeof a.amount==='string')a.amount=/\d/.test(a.amount)?Number(a.amount.replace(/[^\d.]/g,'')):null;
 if(l.stage){if(!l.stage.index)l.stage.index=SN.indexOf(l.stage.name)+1;if(!l.stage.index)l.stage=null}
 l.next_steps=(l.next_steps||[]).filter(id=>DEV||UI.en['n_'+id]);
 const p=l.privacy||{};l.privacy={on_device:[].concat(p.on_device||[]),sent:[].concat(p.sent||[]),to:String(p.to||'—'),stored:String(p.stored||'none')};
 return l}
/* ---- run: /api/check (3 s) -> SACHEngine.checkOffline + notice -> error. Never a canned ledger (D5) ---- */
runCheck=async function(){
 const id=++RUN;S.off=false;S.err=false;S.tooLong=false;
 if(!S.raw.trim()){S.empty=true;return go('input')}
 if(S.raw.length>8000){S.tooLong=true;return go('input')}
 go('checking');const tick=i=>{const e=$$('.ck li')[i];if(e)e.classList.add('on')},t0=Date.now();let l=null,shown=S.raw;
 try{const p=E.prepare(S.raw,S.lang);shown=p.redacted_text||p.redacted||S.raw;tick(0);       // A engine: prepare -> {redacted, report, signals}
  const body={redacted_text:shown,signals:p.signals,situation:S.sit,lang:S.lang};if(S.sebi)body.sebi_check=S.sebi;
  const c=new AbortController(),to=setTimeout(()=>c.abort(),3000);
  const r=await fetch('/api/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:c.signal});clearTimeout(to);
  if(!r.ok)throw new Error('http '+r.status);l=await r.json();if(!l||!l.header||!Array.isArray(l.items))throw new Error('bad ledger');
 }catch(e){if(DEV)console.warn('api path failed',e);l=null;
  try{l=E.checkOffline(S.raw,S.lang,S.sit);S.off=true}catch(e2){l=null}}
 await new Promise(r=>setTimeout(r,Math.max(0,350-(Date.now()-t0)))); // avoid a one-frame flash only
 if(id!==RUN)return;tick(1);tick(2);
 if(!l){S.err=true;return go('error')}
 S.ledger=clean(l);S.raw=shown;S.orig=shown; // highlights index into the redacted text (that is what is displayed)
 go('result')};
const _go=go;go=function(s){if(s!=='checking')RUN++;return _go(s)};
/* ---- voice in: real recognition only, no faked transcript ---- */
let speechRec=null;
speechIn=function(){
 if(!SR||S.listen)return;
 S.listen=true;
 render();

 const r=new SR();
 speechRec=r;
 let active=true;

 const done=()=>{
  if(!active)return;
  active=false;
  if(speechRec===r)speechRec=null;
  if(S.listen){
   S.listen=false;
   if(S.screen==='input')render();
  }
 };

 r.lang=S.lang==='hi'?'hi-IN':'en-IN';
 r.continuous=false;
 r.interimResults=false;
 r.onresult=e=>{
  const result=e.results&&e.results[0]&&e.results[0][0];
  if(result){
   S.raw=result.transcript;
   S.empty=false;
  }
 };
 r.onerror=done;
 r.onend=done;

 try{
  r.start();
 }catch(e){
  done();
 }
};
/* ---- voice out: /api/tts first, then browser voice, else say so ---- */
stopVoice=function(q){S.voice=false;clearTimeout(S.vt);try{audio&&audio.pause()}catch(e){}try{speechSynthesis.cancel()}catch(e){}if(!q)voiceBtn()};
function vnote(k){const v=$('#vd');if(v){const p=document.createElement('p');p.className='nt';p.setAttribute('role','alert');p.textContent=T(k,S.lang);v.appendChild(p)}}
toggleVoice=async function(){if(S.voice)return stopVoice();const txt=voiceText();S.voice=true;voiceBtn();S.vt=setTimeout(()=>stopVoice(),30000);
 try{const r=await fetch('/api/tts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:txt,lang:S.lang})});
  if(r.ok){audio=new Audio(URL.createObjectURL(await r.blob()));audio.onended=()=>stopVoice();return audio.play()}}catch(e){}
 if(!('speechSynthesis' in window)){stopVoice();return}
 if(S.lang==='hi'&&!speechSynthesis.getVoices().some(v=>v.lang.toLowerCase().startsWith('hi'))){stopVoice();return vnote('novoice')}
 const u=new SpeechSynthesisUtterance(txt);u.lang=S.lang==='hi'?'hi-IN':'en-IN';u.onend=()=>stopVoice();speechSynthesis.cancel();speechSynthesis.speak(u)};
/* ---- trust card / incident / share via engine (D3), mockup builders as fallback ---- */
const _tt=trustText,_inc=incident;
trustText=function(L,l,who){try{const b=E.buildTrustCard(eff(),l);if(typeof b==='string'&&b)return T('gr_'+who,l)+',\n'+b}catch(e){}return _tt(L,l,who)};
incident=function(L,raw,l){const base=_inc(L,raw,l);try{const o=E.buildIncident(eff(),E.prepare(raw,l).signals)||{};['date','amount','payee','platform','claim'].forEach(k=>{if(o[k]!=null&&o[k]!=='')base[k]=String(o[k])});
 if(o.urls)base.urls=[].concat(o.urls).join(', ');const r=o.registration_numbers||o.reg;if(r)base.reg=[].concat(r).join(', ')}catch(e){}return base};
document.addEventListener('click',e=>{ // capture phase: runs before the mockup's handler
 const sh=e.target.closest('[data-act=share]');
 if(sh&&E&&E.waShareUrl){e.stopPropagation();const t=$('#tt');if(t)open(E.waShareUrl(t.textContent),'_blank','noopener');return}
 if(e.target.closest('[data-act=toSit]')){const t=$('#ta');if(t&&t.value.length>8000){e.stopPropagation();S.raw=t.value;S.tooLong=true;render()}else S.tooLong=false}},true);
document.addEventListener('input',e=>{if(e.target.id==='ta'&&S.tooLong&&e.target.value.length<=8000){S.tooLong=false;const n=$('.bn.tl');if(n)n.remove()}});
/* ---- sheets: use configured SEBI Check URL ---- */
const _os=openSheet;openSheet=function(h){return _os(CFG.SEBI_CHECK_URL?h.replace(/https:\/\/www\.sebi\.gov\.in/g,CFG.SEBI_CHECK_URL):h)};
renderToolbar=function(){};
/* ---- post-render fixes ---- */
const css=document.createElement('style');css.textContent='#pt,.pt{display:none!important}.band,.band+.bl{display:none}.hd{padding-right:16px}';document.head.appendChild(css);
const _r=render;render=function(top){_r(top);post()};
function post(){const l=S.lang,A=$('#app');if(!A)return;const t=$('#pt');if(t)t.remove();
 $$('.wm span').forEach(n=>n.textContent=BRAND.hi);$$('.wm small').forEach(n=>n.textContent=BRAND.en);$$('.wm').forEach(n=>n.setAttribute('aria-label',BRAND.en));
 const h3=$('.rc h3');if(h3)h3.textContent=BRAND.en+' · '+BRAND.hi;document.title=BRAND.hi+' · '+BRAND.en;
 if(!SR){$$('.ic[data-v=speak]').forEach(b=>{b.setAttribute('aria-disabled','true');b.dataset.act='none';const s=$('small',b);if(s)s.textContent=T('mic0',l)});$$('[data-act=speak]').forEach(b=>b.remove())}
 if(S.screen==='input'&&S.tooLong&&!$('.bn.tl')){const ta=$('#ta');if(ta){const p=document.createElement('p');p.className='bn er tl';p.setAttribute('role','alert');p.textContent=T('tooLong',l);ta.parentNode.insertBefore(p,ta)}}
 if(S.screen==='result'&&S.ledger)$$('.cd[data-item]',A).forEach(c=>{const it=S.ledger.items.find(x=>x.id===c.dataset.item),sd=$('div.src',c);if(!it||!sd)return; // D7
  if(it.source&&it.source.verified===true&&/^https?:/.test(it.source.url||''))sd.innerHTML=T('srcL',l)+': <a href="'+esc(it.source.url)+'" target="_blank" rel="noopener">'+esc(it.source.name)+'</a>';
  else if(DEV)sd.innerHTML=T('srcL',l)+': '+esc(it.source?it.source.name:'')+' <em>'+T('unsrc',l)+'</em>';else sd.remove()})}
addEventListener('resize',()=>{const v=innerWidth>=900?'dk':'ph';if(v!==S.vp){S.vp=v;render()}});
const q=new URLSearchParams(location.search).get('text'); // PWA share target
if(q){S.raw=q;S.orig=q;S.screen='situation'}
render();
})();
