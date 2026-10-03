import type { PhraseClass } from '../contracts/types';
// EN + Hinglish + Devanagari. No \b around Devanagari (JS \b is ASCII-only).
export const PHRASES: Record<PhraseClass, RegExp[]> = {
  guaranteed: [/guarantee[ds]?\b|assured\s+(?:returns?|profit|allot\w*)|100\s?%\s?(?:sure|certain|pakka|profit|allot\w*)|pakka\s+(?:allot\w*|profit|munafa)|sure[- ]?shot/i, /पक्का|गारंटी|गारंटीड/],
  insider: [/insider|\boperators?\b|big\s+players?|inside\s+(?:info|news|tip)/i, /ऑपरेटर|इनसाइडर/],
  institutional: [/institutional\s+(?:account|quota|trading|client)|anchor\s+(?:book|investor|access|quota)|block\s+deal|discount(?:ed)?\s+(?:ipo|block|shares?|allot\w*)|pre-?ipo\s+(?:discount|shares?)/i, /इंस्टीट्यूशनल|एंकर/],
  secrecy: [/don'?t\s+tell|do\s+not\s+tell|kisi\s+ko\s+(?:mat|na)\s+bata\w*|mat\s+batana|ghar\s+m(?:ein|e)\s+(?:mat|na)|keep\s+(?:it\s+)?(?:a\s+)?secret|confidential/i, /किसी\s+को\s+(?:मत|न)\s+बता\w*|मत\s+बताना|घर\s+में\s+(?:मत|न)/],
  vip: [/\bvip\b|selected\s+members?|you\s+(?:have\s+been|are)\s+selected|aap\s+select|chune\s+gaye|exclusive\s+(?:group|members?)/i, /सेलेक्ट|चुने\s+गए|चुनी\s+गई|वीआईपी/],
  withdrawal_fee: [
    /(?:fee|tax|charges?|gst|commission|deposit|processing)[^.\n]{0,50}?(?:withdraw|release|nikal)/i,
    /(?:withdraw\w*|release|nikal\w*)[^.\n]{0,50}?(?:fee|tax|charges?|gst|deposit)/i,
    /(?:फीस|फ़ीस|टैक्स|चार्ज|जमा)[^.\n।]{0,40}?(?:निकाल|विड्रॉ|निकासी)/, /(?:निकाल\w*|विड्रॉ\w*|निकासी)[^.\n।]{0,40}?(?:फीस|फ़ीस|टैक्स|चार्ज|जमा)/],
  profit_claim: [/profit|munafa|returns?\b|your\s+account\s+shows|balance\s+(?:shows|is)|withdrawal\s+(?:ready|available)|dikh\s+raha/i, /मुनाफ|दिख\s+रहा/],
  testimonial: [/testimonial|screenshot|proof\b|withdraw(?:al)?\s+successful|profit\s+hua|munafa\s+hua|thank\s*you\s+sir/i, /मुनाफ़?ा\s+हुआ|प्रूफ|स्क्रीनशॉट/],
  ipo: [/\bipo\b|\ballot\w*/i, /आईपीओ|अलॉटमेंट|एलॉटमेंट/],
  broker_adv: [/\bbrokers?\b|\badvis(?:or|er|ory)\b|\bpms\b|research\s+analyst|portfolio|\btips?\b|trading\s+(?:account|app)|demat/i, /ब्रोकर|सलाह|ट्रेडिंग/],
  call_claim: [/call\s+from|calling\s+from|will\s+call\s+you|our\s+desk|desk\s+se|call\s+karenge/i, /हमारे\s+डेस्क|कॉल\s+करेंगे/],
  firm_claim: [/sebi\s+(?:regist\w*|reg\.?|approved|licensed|certified)|registered\s+with\s+sebi|\bIN[AHZ]\d{9}\b/i, /सेबी\s+(?:रजिस्टर्ड|पंजीकृत)/],
  tip_call: [/(?:buy|sell)\s+[\w&\s]{0,30}(?:target|sl\b|stop\s?loss)|target\s*[:\-]?\s*\d+|stop\s?loss\s*[:\-]?\s*\d+|\b\d+\s*(?:ce|pe)\b/i],
  join: [/welcome|\bjoin(?:ed)?\b|added\s+you|invite|group\s+link/i, /जुड़ें|जुड़िए|ग्रुप\s+में/],
  free_tips: [/free\s+(?:tips?|calls?|signals?)|daily\s+tips?/i, /फ्री\s+टिप/],
};
export const DEADLINE_RE = [/today\s+only|aaj\s+hi|last\s+\d+\s+slots?|limited\s+slots?|only\s+\d+\s+slots?|within\s+\d+\s+(?:minutes?|hours?)|abhi\s+(?:bhejo|bhej|karo)|expires?\s+(?:today|soon)/gi, /आज\s+ही|आखिरी\s+\d+|अभी\s+(?:भेज|करें)/g];
export const PAY_VERB = /\b(?:send|transfer|deposit|pay|bhej(?:o|iye|iyega|na|\s?do)?|daal(?:o|iye|na|a)?|jama)\b|भेज|जमा|डाल|ट्रांसफर|भुगतान/i;
export const REMOTE_RE = /anydesk|teamviewer|quick\s?support|screen\s?share|install\s+(?:this\s+)?app/i;
export const PSP_SUFFIXES = new Set(['ybl','ibl','axl','okaxis','oksbi','okhdfcbank','okicici','paytm','apl','upi','sbi','hdfcbank','icici','axisbank','postbank','pnb','fbl','ptyes','ptaxis','pthdfc','ptsbi','airtel','jio','freecharge','kotak','barodampay','cnrb','idfcbank','indus','rbl','yesbank']);
// Brand seed list: public broker/regulator names -> their real registrable domains (extend freely).
export const BRANDS: Record<string, string[]> = {
  zerodha: ['zerodha.com'], groww: ['groww.in'], upstox: ['upstox.com'], angelone: ['angelone.in'],
  icicidirect: ['icicidirect.com'], hdfcsec: ['hdfcsec.com'], kotak: ['kotak.com', 'kotaksecurities.com'],
  sharekhan: ['sharekhan.com'], motilaloswal: ['motilaloswal.com'], paytmmoney: ['paytmmoney.com'],
  '5paisa': ['5paisa.com'], sebi: ['sebi.gov.in'], nseindia: ['nseindia.com'], bseindia: ['bseindia.com'], nsdl: ['nsdl.co.in'],
};
