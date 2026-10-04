// SACH experience layer. Findings, privacy receipt and mode all come from the ledger (D6).
const E = window.SACHEngine,
  CFG = window.SACH_CONFIG || {},
  DEV = new URLSearchParams(location.search).has('dev');
const S = {
  lang: (navigator.language || 'hi').startsWith('en') ? 'en' : 'hi',
  screen: 'pause',
  raw: '',
  situation: null,
  ledger: null,
  offline: false,
  sebi: null,
  msg: '',
  noVoice: false,
};
const L = () => S.lang,
  tr = (a) => a[L() === 'hi' ? 0 : 1],
  t = (k) => tr(U[k]);
const DEMOS = {},
  KEYS = ['kavita', 'praveen', 'control-a', 'control-b'];
const f = (o, k) => (o && (o[k + '_' + L()] || o[k + '_en'])) || '';
const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/\s*\[VERIFY\]/g, '')
    .replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
    ); // D7: never render [VERIFY]
const go = (s) => {
  S.screen = s;
  render();
  window.scrollTo(0, 0);
};
const list = (x) => [].concat(x == null ? [] : x).join(', ') || '—';

// ---- run: /api/check (3 s) -> SACHEngine.checkOffline -> error. Never a canned fixture (D5).
async function run() {
  if (!S.raw.trim()) {
    S.msg = t('empty');
    return go('input');
  }
  if (S.raw.length > 8000) {
    S.msg = t('toolong');
    return go('input');
  }
  S.msg = '';
  S.offline = false;
  S.noVoice = false;
  go('checking');
  let l = null;
  try {
    const p = E.prepare(S.raw, L()); // ASSUMED shape: {redacted_text, signals}
    const body = {
      redacted_text: p.redacted,
      signals: p.signals,
      situation: S.situation,
      lang: L(),
    };
    if (S.sebi) body.sebi_check = S.sebi;
    const c = new AbortController(),
      to = setTimeout(() => c.abort(), 3000);
    const r = await fetch('/api/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: c.signal,
    });
    clearTimeout(to);
    if (!r.ok) throw new Error('http ' + r.status);
    l = await r.json();
    if (!l || !l.header) throw new Error('bad ledger');
  } catch (e) {
    try {
      l = E.checkOffline(S.raw, L(), S.situation);
      S.offline = true;
    } catch (e2) {
      l = null;
    }
  }
  if (!l) return go('error');
  S.ledger = l;
  go('result');
}

// ---- views
const renderTop = () =>
  `<header><span class="logo">SACH</span><button class="sm" aria-label="Language" onclick="S.lang=L()==='hi'?'en':'hi';render()">${L() === 'hi' ? 'EN' : 'हिं'}</button></header>`;
const V = {
  pause: () => {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    return `${renderTop()}<h1>${t('pause')}</h1><p class="mut">${t('sub')}</p>
 ${R ? `<button class="pri" onclick="startVoice()">${t('speak')}</button>` : `<p class="banner">${t('mic0')}</p>`}
 <button class="${R ? '' : 'pri'}" onclick="go('input')">${t('paste')}</button><button disabled aria-disabled="true">${t('shot')}</button><p id="vmsg" class="mut"></p>
 <details><summary>${t('demo')}</summary>${KEYS.map((k) => `<button onclick="demo('${k}')">${k}</button>`).join('')}</details>`;
  },
  input:
    () => `${renderTop()}<h1>${t('paste')}</h1>${S.msg ? `<p class="banner" role="alert">${esc(S.msg)}</p>` : ''}<textarea id="tx" placeholder="${esc(t('ph'))}" aria-label="${esc(t('ph'))}">${esc(S.raw)}</textarea>
 <button class="pri" onclick="S.raw=document.getElementById('tx').value.trim();S.msg='';if(!S.raw)S.msg=t('empty');else if(S.raw.length>8000)S.msg=t('toolong');S.msg?render():go('situation')">${t('go')}</button><button onclick="go('pause')">${t('back')}</button>`,
  situation: () =>
    `${renderTop()}<h1>${t('sit')}</h1>${['PREVENTION', 'ATTEMPTED', 'PAID', 'ONGOING'].map((k) => `<button class="${k === 'PREVENTION' ? 'pri' : ''}" onclick="S.situation='${k}';run()">${t('s_' + k)}</button>`).join('')}<button onclick="go('input')">${t('back')}</button>`,
  checking: () =>
    `${renderTop()}<h1>${t('checking')}</h1><div class="card" role="status">${U.steps.map((s) => `<p>⏳ ${tr(s)}</p>`).join('')}</div>`,
  error: () =>
    `${renderTop()}<h1>${t('err')}</h1><button class="pri" onclick="run()">${t('retry')}</button><button onclick="go('pause')">${t('back')}</button>`,
  result: () => {
    const l = S.ledger,
      e = l.items || [],
      a = l.action_requested || {};
    const sec = (k, fn) => {
      const x = e.filter(fn);
      return x.length ? `<h2>${t(k)}</h2>` + x.map(item).join('') : '';
    };
    const note =
      l.header === 'LOW_CONCERN'
        ? t('lowNote')
        : l.header === 'CANT_VERIFY'
          ? t('cantNote')
          : '';
    return `${renderTop()}<div class="hdr" role="status">${t('h_' + l.header) || ''}${note ? `<div class="mut" style="font-weight:400;font-size:16px">${note}</div>` : ''}</div>
 <p><span class="tag">${l.mode === 'llm' && !S.offline ? t('mode_llm') : t('mode_rules')}</span></p>${S.offline ? `<p class="banner" role="alert">${t('offline')}</p>` : ''}
 <div class="action"><small>${t('act')}</small><br>${esc(f(a, 'text'))}${a.amount ? `<br><small>${t('amt')}: ${esc(a.amount)}</small>` : ''}${a.deadline ? `<br><small>${t('dl')}: ${esc(a.deadline)}</small>` : ''}${a.secrecy ? `<br><small>⚠ ${t('sec')}</small>` : ''}</div>
 ${sec('sec_hard', (x) => x.forgeability === 'hard' && x.label !== 'COULDNT_VERIFY')}${sec('sec_easy', (x) => x.forgeability === 'easy' && x.label !== 'AI_INTERPRETATION' && x.label !== 'COULDNT_VERIFY')}
 ${sec('sec_unk', (x) => x.label === 'COULDNT_VERIFY')}${sec('sec_ai', (x) => x.label === 'AI_INTERPRETATION')}${stage(l)}
 <h2>${t('next')}</h2><div class="card"><ol>${(l.next_steps || []).map((id) => (U['n_' + id] ? `<li>${t('n_' + id)}</li>` : DEV ? `<li>[dev] ${esc(id)}</li>` : '')).join('')}</ol></div>
 ${S.sebi ? `<p class="card">${t('conf')}<b>${esc(S.sebi)}</b></p>` : ''}${l.payee ? `<button class="pri" onclick="verify()">🔍 ${t('verify')}</button>` : ''}
 <button onclick="speak()">${t('hear')}</button>${S.noVoice ? `<p class="banner">${t('novoice')}</p>` : ''}<button onclick="go('trust')">${t('trust')}</button><button onclick="go('recovery')">${t('paid')}</button>
 <button onclick="window.open(CFG.I4C_URL,'_blank','noopener')">🔎 ${t('i4c')}</button><p class="mut">${t('i4cNote')}</p>${privacy(l)}
 <button onclick="S.raw='';S.situation=null;S.sebi=null;go('pause')">${t('again')}</button>`;
  },
  trust: () => {
    const x = E.buildTrustCard(S.ledger, L());
    return `${renderTop()}<h1>${t('tcTitle')}</h1><div class="card"><pre>${esc(x)}</pre></div>
 <button class="pri" onclick="window.open(E.waShareUrl(E.buildTrustCard(S.ledger,L())),'_blank','noopener')">${t('wa')}</button><button onclick="cp(E.buildTrustCard(S.ledger,L()),this)">${t('copy')}</button><button onclick="go('result')">${t('back')}</button>`;
  },
  ret: () =>
    `${renderTop()}<h1>${t('ret')}</h1>${[
      ['REGISTERED', 'r1'],
      ['NOT_FOUND', 'r2'],
      ['UNSURE', 'r3'],
    ]
      .map(
        ([v, k]) =>
          `<button onclick="S.sebi='${v}';go('result')">${t(k)}</button>`
      )
      .join('')}`,
  recovery: () => {
    const x = E.incidentToText(
      E.buildIncident(S.ledger, E.prepare(S.raw, L()).signals),
      L()
    );
    return `${renderTop()}<h1>${t('rec')}</h1><div class="card"><ol>${U.recSteps.map((s) => `<li>${tr(s)}</li>`).join('')}</ol></div>
 <a class="btn pri" href="tel:1930">📞 1930</a><p class="mut">${t('recNote')}</p><h2>${t('inc')}</h2><textarea id="inc" style="min-height:160px">${esc(x)}</textarea>
 <button onclick="cp(document.getElementById('inc').value,this)">${t('copy')}</button><button onclick="window.open(E.waShareUrl(document.getElementById('inc').value),'_blank','noopener')">${t('wa')}</button><button onclick="go('result')">${t('back')}</button>`;
  },
};
function item(x) {
  const s = x.source,
    cls =
      x.label === 'AI_INTERPRETATION'
        ? 'ai'
        : x.label === 'COULDNT_VERIFY'
          ? 'unk'
          : x.forgeability;
  const link = s
    ? s.verified === true
      ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`
      : DEV
        ? `<span>⚠ ${t('unver')}: ${esc(s.name)}</span>`
        : ''
    : ''; // D7
  return `<div class="card ${cls}"><span class="chip ${x.label}">${t('lbl_' + x.label)}</span><span class="tag">${x.label === 'AI_INTERPRETATION' ? 'AI' : tr(U[x.forgeability])}</span>${x.rephrased_by_ai ? ` <span class="tag">${t('reworded')}</span>` : ''}
 <p style="margin:4px 0"><b>${esc(f(x, 'title'))}</b></p><p class="mut" style="margin:4px 0">${esc(f(x, 'why'))}</p>
 ${f(x, 'settle') ? `<p style="margin:4px 0">💡 <b>${t('settle')}</b>${esc(f(x, 'settle'))}</p>` : ''}${link ? `<p class="mut" style="margin:4px 0">${t('src')}: ${link}</p>` : ''}</div>`;
}
function stage(l) {
  const g = l.stage;
  if (!g) return '';
  const idx =
    g.index ||
    [
      'HOOK',
      'TRUST_BUILDING',
      'FAKE_PROOF',
      'DEPOSIT_PUSH',
      'WITHDRAWAL_BLOCKED',
    ].indexOf(g.name) + 1;
  const seen = Array.isArray(g.progression) ? g.progression : [idx];
  return `<h2>${t('stage')}</h2><div class="strip" role="list">${U.stages.map((s, i) => `<div role="listitem" class="${seen.includes(i + 1) ? 'seen' : ''} ${i + 1 === idx ? 'on' : ''}">${i + 1}<br>${tr(s)}</div>`).join('')}</div>
 <p class="mut">${esc(f(g, 'name'))}. ${esc(f(g, 'because'))} ${t('stageNote')}</p>
 ${(l.timeline || []).length ? `<div class="tl">${l.timeline.map((m) => `<p class="${m.is_transition || m.is_payment_ask ? 'pay' : ''}"><span class="tag">${m.stage == null ? '–' : m.stage}</span> ${esc(m.snippet)}</p>`).join('')}</div>` : ''}`;
}
function privacy(l) {
  const p = l.privacy || {};
  return `<h2>${t('priv')}</h2><div class="card"><p><b>${t('pv_dev')}:</b> ${esc(list(p.on_device))}</p><p><b>${t('pv_sent')}:</b> ${esc(list(p.sent))}</p><p><b>${t('pv_to')}:</b> ${esc(list(p.to))}</p><p><b>${t('pv_st')}:</b> ${esc(list(p.stored))}</p></div>`;
}

// ---- helpers
function spoken() {
  const l = S.ledger;
  return [t('h_' + l.header), f(l.action_requested, 'text')]
    .concat(
      (l.items || [])
        .filter((x) => x.label !== 'AI_INTERPRETATION')
        .slice(0, 2)
        .map((x) => f(x, 'title'))
    )
    .join('. ');
}
let audio;
async function speak() {
  const txt = spoken();
  try {
    const r = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: txt, lang: L() }),
    });
    if (r.ok) {
      audio && audio.pause();
      audio = new Audio(URL.createObjectURL(await r.blob()));
      return audio.play();
    }
  } catch (e) {} // 501 or failure -> browser voice
  if (!('speechSynthesis' in window)) return;
  const want = L() === 'hi' ? 'hi' : 'en';
  if (
    !speechSynthesis
      .getVoices()
      .some((v) => v.lang.toLowerCase().startsWith(want)) &&
    L() === 'hi'
  ) {
    S.noVoice = true;
    return render();
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(txt);
  u.lang = L() === 'hi' ? 'hi-IN' : 'en-IN';
  speechSynthesis.speak(u);
}
function startVoice() {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition,
    m = document.getElementById('vmsg');
  if (!R) {
    m.textContent = t('mic0');
    return;
  }
  const r = new R();
  r.lang = L() === 'hi' ? 'hi-IN' : 'en-IN';
  r.onresult = (e) => {
    S.raw = e.results[0][0].transcript;
    go('situation');
  };
  r.onerror = () => {
    m.textContent = t('mic0');
  };
  r.start();
  m.textContent = t('listen');
}
function verify() {
  cp(S.ledger.payee.value || '');
  window.open(CFG.SEBI_CHECK_URL, '_blank', 'noopener');
  alert(t('verifyNote'));
  go('ret');
}
async function cp(x, b) {
  try {
    await navigator.clipboard.writeText(x);
  } catch (e) {}
  if (b) {
    const o = b.innerHTML;
    b.textContent = t('copied');
    setTimeout(() => (b.innerHTML = o), 1200);
  }
}
async function demo(k) {
  S.raw = DEMOS[k] || '';
  go('situation');
} // fixture INPUT goes through the normal path (D5)
async function loadDemos() {
  await Promise.all(
    KEYS.map(async (k) => {
      try {
        DEMOS[k] = await (await fetch('fixtures/inputs/' + k + '.txt')).text();
      } catch (e) {}
    })
  );
}
function render() {
  document.documentElement.lang = L();
  const a = document.getElementById('app');
  a.innerHTML = V[S.screen]();
  const h = a.querySelector('h1,.hdr');
  if (h && S.screen !== 'pause') {
    h.tabIndex = -1;
    h.focus({ preventScroll: true });
  }
}
async function boot() {
  const q = new URLSearchParams(location.search).get('text');
  if (q) {
    S.raw = q;
    S.screen = 'situation';
  }
  render();
  loadDemos();
}
boot();
