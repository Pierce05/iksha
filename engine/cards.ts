import type { Source } from '../contracts/types';
// Process cards (PRD §7.4). Text is paraphrased; every source is verified:false until Person A checks the page (§15 [VERIFY] list).
// Wording rule: "does not match the standard flow described by SEBI" — never "impossible", "scam", "fraud", "safe".
const src = (name: string, url = 'https://www.sebi.gov.in'): Source => ({ name, url, date: '', verified: false });
export const SEBI_CHECK_HANDOFF_URL = ''; // TODO(A): fill after verifying SEBI Check URL; B opens it in a new tab.

export interface FindingText { title_en: string; title_hi: string; why_en: string; why_hi: string; settle_en?: string; settle_hi?: string; source: Source }
export const CARD_TEXT = {
  P1_IPO_UPI: {
    title_en: 'Asked to pay someone else for IPO allotment', title_hi: 'IPO अलॉटमेंट के लिए किसी और को पैसे भेजने को कहा गया है',
    why_en: 'In a normal IPO application you bid from your own UPI ID and approve a mandate that blocks money in your own account. Paying a third party for allotment does not match the standard flow described by SEBI.',
    why_hi: 'सामान्य IPO आवेदन में आप अपनी ही UPI ID से बोली लगाते हैं और आपके अपने खाते में पैसे रोके जाते हैं। अलॉटमेंट के लिए किसी तीसरे व्यक्ति को पैसे भेजना SEBI की बताई सामान्य प्रक्रिया से मेल नहीं खाता।',
    settle_en: 'Apply only from your own broker or bank app, with your own UPI ID.', settle_hi: 'आवेदन सिर्फ़ अपने ब्रोकर या बैंक के ऐप से, अपनी ही UPI ID से करें।',
    source: src('SEBI: applying for IPOs through UPI'),
  },
  P2_PAYEE_UNVERIFIED: {
    title_en: 'Payment destination could not be verified', title_hi: 'जिसे पैसे भेजने को कहा गया है, उसकी जाँच नहीं हो सकी',
    why_en: 'This payment ID does not follow the validated-handle pattern SEBI describes for registered brokers and funds. Validated handles are an extra check, not a rule, so this alone proves nothing.',
    why_hi: 'यह पेमेंट ID उस वैलिडेटेड पैटर्न जैसी नहीं है जो SEBI ने रजिस्टर्ड ब्रोकर और फंड के लिए बताया है। यह एक अतिरिक्त जाँच है, नियम नहीं, इसलिए सिर्फ़ इससे कुछ साबित नहीं होता।',
    settle_en: 'Search this ID on SEBI Check before paying. If it is not listed, do not pay.', settle_hi: 'पैसे भेजने से पहले इस ID को SEBI Check पर खोजें। सूची में न मिले तो पैसे न भेजें।',
    source: src('SEBI Check / validated UPI handles'),
  },
  P2_PAYEE_FORMAT_ONLY: {
    title_en: 'Payee looks like a validated handle, but that is not enough', title_hi: 'पेमेंट ID वैलिडेटेड जैसी दिखती है, पर यह काफ़ी नहीं',
    why_en: 'The handle format looks like the one used for registered brokers, but anyone can copy a format. It does not show that this person works for that firm.',
    why_hi: 'ID का रूप रजिस्टर्ड ब्रोकर वाली ID जैसा है, पर रूप कोई भी नक़ल कर सकता है। इससे यह साबित नहीं होता कि यह व्यक्ति उस कंपनी का है।',
    settle_en: 'Confirm the exact ID on SEBI Check.', settle_hi: 'यही ID SEBI Check पर जाँचें।',
    source: src('SEBI Check / validated UPI handles'),
  },
  P3_SEBI_NAMED_CLAIMS: {
    title_en: 'Offer matches claims SEBI has named as warning signs', title_hi: 'ऑफ़र उन दावों जैसा है जिन्हें SEBI ने चेतावनी के संकेत बताया है',
    why_en: 'SEBI\'s advisory names guaranteed IPO allotment, institutional trading accounts, discounted IPO/block deals and anchor access as warning signs. This message matches those signals.',
    why_hi: 'SEBI की एडवाइज़री में पक्का IPO अलॉटमेंट, इंस्टीट्यूशनल ट्रेडिंग खाता, सस्ता IPO/ब्लॉक डील और एंकर एक्सेस को चेतावनी के संकेत बताया गया है। यह संदेश उन संकेतों से मेल खाता है।',
    settle_en: 'No registered broker can guarantee allotment. Ask your own broker.', settle_hi: 'कोई रजिस्टर्ड ब्रोकर अलॉटमेंट की गारंटी नहीं दे सकता। अपने ब्रोकर से पूछें।',
    source: src('SEBI advisory, Aug 2025 (IPO allotment claims)'),
  },
  P4_WITHDRAWAL_FEE: {
    title_en: 'Asked to pay a fee or tax to take out your own money', title_hi: 'अपना ही पैसा निकालने के लिए फ़ीस या टैक्स माँगा गया है',
    why_en: 'Genuine platforms do not need a new deposit to release your own funds. This matches the withdrawal-blocked stage SEBI describes for fake trading apps.',
    why_hi: 'असली प्लेटफ़ॉर्म आपका अपना पैसा निकालने के लिए नया पैसा जमा नहीं करवाते। यह उस चरण से मेल खाता है जो SEBI ने नकली ट्रेडिंग ऐप के लिए बताया है।',
    settle_en: 'Do not pay. Ask your bank and call 1930 if money has already moved.', settle_hi: 'पैसे न भेजें। पैसे जा चुके हों तो बैंक को बताएँ और 1930 पर कॉल करें।',
    source: src('SEBI: fake trading apps guidance'),
  },
  P5_CHANNEL_CALL: {
    title_en: 'Caller number is not in the 1600 series', title_hi: 'कॉल करने वाला नंबर 1600 सीरीज़ का नहीं है',
    why_en: 'Registered firms use 1600-series numbers for service calls to existing clients. The number given does not match that pattern. Caller ID can be faked, so do not rely on it either way.',
    why_hi: 'रजिस्टर्ड कंपनियाँ अपने मौजूदा ग्राहकों को सर्विस कॉल के लिए 1600 सीरीज़ के नंबर इस्तेमाल करती हैं। दिया गया नंबर इस पैटर्न से मेल नहीं खाता। कॉलर ID नक़ली हो सकती है, इसलिए उस पर भरोसा न करें।',
    settle_en: 'Hang up and call the number on the firm\'s official page.', settle_hi: 'कॉल काटें और कंपनी के आधिकारिक पेज वाले नंबर पर ख़ुद कॉल करें।',
    source: src('SEBI: 1600-series calling rule'),
  },
  P5_CHANNEL_CALL_UNSEEN: {
    title_en: 'A call is mentioned but the number could not be checked', title_hi: 'कॉल की बात है, पर नंबर की जाँच नहीं हो सकी',
    why_en: 'The message talks about a call from a desk or team, but no number we could check was shared.',
    why_hi: 'संदेश में किसी डेस्क या टीम की कॉल की बात है, पर जाँचने लायक कोई नंबर नहीं मिला।',
    settle_en: 'Note the caller\'s number and check whether it is in the 1600 series.', settle_hi: 'कॉल करने वाले का नंबर देखें और जाँचें कि वह 1600 सीरीज़ का है या नहीं।',
    source: src('SEBI: 1600-series calling rule'),
  },
  P6_REG_EASY: {
    title_en: 'A SEBI registration number is quoted', title_hi: 'SEBI रजिस्ट्रेशन नंबर बताया गया है',
    why_en: 'Anyone can copy a real registration number. Even if the number exists, it only shows that a firm exists, not that this sender is that firm. We do not count it as a good sign.',
    why_hi: 'असली रजिस्ट्रेशन नंबर कोई भी कॉपी कर सकता है। नंबर सही हो तब भी इतना ही पता चलता है कि कंपनी है, यह नहीं कि भेजने वाला वही कंपनी है। हम इसे अच्छा संकेत नहीं मानते।',
    settle_en: 'Find the firm on SEBI\'s intermediary page and use the contact details listed there, not numbers from the chat.', settle_hi: 'SEBI के इंटरमीडियरी पेज पर कंपनी खोजें और वहाँ दिए संपर्क का इस्तेमाल करें, चैट के नंबर का नहीं।',
    source: src('SEBI: intermediary search'),
  },
  P6_IDENTITY_CHANNEL: {
    title_en: 'Payment, link or contact is not tied to the firm named', title_hi: 'पेमेंट, लिंक या संपर्क उस कंपनी से जुड़ा नहीं दिखता जिसका नाम लिया गया',
    why_en: 'The message names a registered firm, but nothing shows that the payment ID, link or number it gives belongs to that firm.',
    why_hi: 'संदेश किसी रजिस्टर्ड कंपनी का नाम लेता है, पर ऐसा कुछ नहीं दिखता कि दी गई पेमेंट ID, लिंक या नंबर उसी कंपनी का है।',
    settle_en: 'Check the firm\'s contact on SEBI\'s intermediary page. Do not use numbers from the chat.', settle_hi: 'SEBI के इंटरमीडियरी पेज पर कंपनी का संपर्क जाँचें। चैट वाले नंबर का इस्तेमाल न करें।',
    source: src('SEBI: intermediary search'),
  },
  P6_URL_FLAGS: {
    title_en: 'A link looks unusual', title_hi: 'एक लिंक सामान्य नहीं दिखता',
    why_en: 'The link hides its destination, is not secure (no https), or its web address resembles a known broker\'s name but is a different address.',
    why_hi: 'लिंक अपनी असली जगह छिपाता है, सुरक्षा वाला (https) नहीं है, या उसका पता किसी जाने-माने ब्रोकर के नाम जैसा है पर अलग पता है।',
    settle_en: 'Do not open it from the chat. Type the firm\'s official address yourself.', settle_hi: 'चैट से लिंक न खोलें। कंपनी का आधिकारिक पता ख़ुद टाइप करें।',
    source: src('SEBI: investor caution on links'),
  },
  P7_FAKE_ENV: {
    title_en: 'Profit screens, balances or testimonials inside the chat', title_hi: 'चैट में मुनाफ़े की स्क्रीन, बैलेंस या तारीफ़ें हैं',
    why_en: 'Screenshots, balances and testimonials shown in a chat or an unknown app can be made up. They are not evidence of real returns.',
    why_hi: 'चैट या अनजान ऐप में दिखाए गए स्क्रीनशॉट, बैलेंस और तारीफ़ें बनाई जा सकती हैं। ये असली मुनाफ़े का सबूत नहीं हैं।',
    settle_en: 'Real returns show up in your own bank or broker statement, not in screenshots.', settle_hi: 'असली मुनाफ़ा आपके अपने बैंक या ब्रोकर के स्टेटमेंट में दिखता है, स्क्रीनशॉट में नहीं।',
    source: src('SEBI: fake trading apps guidance'),
  },
  P7_APK: {
    title_en: 'App shared as an APK file or outside an app store', title_hi: 'ऐप APK फ़ाइल के रूप में या ऐप स्टोर के बाहर भेजा गया है',
    why_en: 'Genuine broker apps come from official app stores or the firm\'s own verified page. An APK link from a chat does not match that.',
    why_hi: 'असली ब्रोकर ऐप आधिकारिक ऐप स्टोर या कंपनी के अपने जाँचे हुए पेज से आते हैं। चैट में आया APK लिंक इससे मेल नहीं खाता।',
    settle_en: 'Check SEBI\'s list of authorised apps. Do not install from chat links.', settle_hi: 'SEBI की अधिकृत ऐप सूची देखें। चैट के लिंक से कुछ इंस्टॉल न करें।',
    source: src('SEBI: authorised trading apps list'),
  },
  P7_REMOTE: {
    title_en: 'Asked to install a screen-sharing or remote-access app', title_hi: 'स्क्रीन दिखाने या फ़ोन चलाने वाला ऐप इंस्टॉल करने को कहा गया है',
    why_en: 'An investing service has no need to see or control your phone. This request does not match the standard flow.',
    why_hi: 'निवेश की किसी सेवा को आपका फ़ोन देखने या चलाने की ज़रूरत नहीं होती। यह माँग सामान्य प्रक्रिया से मेल नहीं खाती।',
    settle_en: 'Do not install it. Tell your bank if you already did.', settle_hi: 'इंस्टॉल न करें। कर चुके हों तो बैंक को बताएँ।',
    source: src('I4C / RBI caution on remote-access apps'),
  },
} satisfies Record<string, FindingText>;

export const STAGES = {
  1: { name: 'HOOK', hi: 'शुरुआती लालच', en: 'Hook' },
  2: { name: 'TRUST_BUILDING', hi: 'भरोसा बनाना', en: 'Trust-building' },
  3: { name: 'FAKE_PROOF', hi: 'झूठा सबूत या ऐप', en: 'Fake proof or app' },
  4: { name: 'DEPOSIT_PUSH', hi: 'पैसे जमा करवाना', en: 'Deposit push' },
  5: { name: 'WITHDRAWAL_BLOCKED', hi: 'निकासी रोकना', en: 'Withdrawal blocked or fee' },
} as const;
export const STAGE_REASON: Record<string, { en: string; hi: string }> = {
  withdrawal_fee: { en: 'it asks for a fee or tax to take money out', hi: 'पैसा निकालने के लिए फ़ीस या टैक्स माँगा गया है' },
  payment_ask: { en: 'it asks you to send money', hi: 'पैसे भेजने को कहा गया है' },
  fake_proof: { en: 'it shows profits, testimonials or an app link as proof', hi: 'सबूत के तौर पर मुनाफ़ा, तारीफ़ें या ऐप लिंक दिखाए गए हैं' },
  expert_call: { en: 'it gives trading calls to build trust', hi: 'भरोसा बनाने के लिए ट्रेडिंग कॉल दी गई हैं' },
  hook: { en: 'it uses an offer or group invite to draw you in', hi: 'आपको खींचने के लिए ऑफ़र या ग्रुप का न्योता है' },
};
