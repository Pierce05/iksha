// DoD checks from PRD 16/17.6. Run: node scripts/check.mjs
import fs from 'fs';let bad=0;const fail=m=>{console.log('FAIL',m);bad++};
const dir='public/fixtures/ledgers/';
for(const f of fs.readdirSync(dir)){const L=JSON.parse(fs.readFileSync(dir+f,'utf8'));
 if(f.startsWith('control')&&L.header==='HIGH_CONCERN')fail(f+' control rated High');
 for(const x of L.items){if(!x.label||!x.forgeability)fail(f+' '+x.id+' missing label/forgeability');
  if(x.label!=='AI_INTERPRETATION'&&!x.source)fail(f+' '+x.id+' no source');
  if(/reg/i.test(x.id)&&(x.label==='VERIFIED'||x.forgeability!=='easy'))fail(f+' reg number must be easy-to-fake, never positive')}}
const banned=/\b(scam|scammer|fraud|fraudster|safe|impossible)\b|\d\s?%|\bscore\b|checked by \d+|\d+ (people|log)/i;
for(const f of ['public/ui-strings.js','public/app.js',...fs.readdirSync(dir).map(x=>dir+x)]){const t=fs.readFileSync(f,'utf8');
 t.split('\n').forEach((l,i)=>{if(banned.test(l)&&!/^\s*\/\//.test(l))fail(f+':'+(i+1)+' banned wording: '+l.trim().slice(0,70))})}
console.log(bad?bad+' problem(s)':'All checks passed');process.exit(bad?1:0)
