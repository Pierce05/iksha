import { runCheck } from '../../../engine/pipeline';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  let body: any; try { body = await req.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  if (typeof body?.redacted_text !== 'string' || !['PREVENTION', 'ATTEMPTED', 'PAID', 'ONGOING'].includes(body.situation))
    return Response.json({ error: 'bad request' }, { status: 400 });
  // No content logging, by design (privacy receipt promises "stored: none").
  return Response.json(await runCheck({ ...body, lang: body.lang === 'en' ? 'en' : 'hi' }), { headers: { 'cache-control': 'no-store' } });
}
