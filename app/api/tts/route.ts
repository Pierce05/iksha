export const runtime = 'nodejs';
// Sarvam TTS. [VERIFY] endpoint, model and speaker names against Sarvam docs before demo.
// Without a key (or on any failure) returns 501 {fallback:"speechSynthesis"} so the client uses browser speechSynthesis hi-IN.
export async function POST(req: Request) {
  const { text, lang } = await req.json().catch(() => ({}));
  const key = process.env.SARVAM_API_KEY;
  if (!key || typeof text !== 'string' || !text) return Response.json({ fallback: 'speechSynthesis' }, { status: 501 });
  try {
    const r = await fetch('https://api.sarvam.ai/text-to-speech', { method: 'POST', headers: { 'content-type': 'application/json', 'api-subscription-key': key },
      body: JSON.stringify({ inputs: [text.slice(0, 500)], target_language_code: lang === 'en' ? 'en-IN' : 'hi-IN' }), signal: AbortSignal.timeout(4000) });
    const j: any = await r.json(); const b64 = j?.audios?.[0];
    if (!r.ok || !b64) throw new Error('tts');
    return new Response(Buffer.from(b64, 'base64'), { headers: { 'content-type': 'audio/wav', 'cache-control': 'no-store' } });
  } catch { return Response.json({ fallback: 'speechSynthesis' }, { status: 501 }); }
}
