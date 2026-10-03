import type { Message } from '../contracts/types';
// WhatsApp export headers: "[12/10/26, 11:47 pm] Name: text" and "12/10/2026, 23:47 - Name: text"
export const HEADER_RE = /^(\[?\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s?(?:[ap]\.?m\.?)?\]?\s*[-–]?\s*)([^:\n]{1,40}?):\s?(.*)$/i;

export function parseChat(text: string): Message[] {
  const out: Message[] = [];
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const m = HEADER_RE.exec(line);
    if (m) out.push({ index: out.length, sender: m[2].trim(), time: m[1].replace(/[\[\]\-–]/g, '').trim(), text: m[3] });
    else if (out.length && line.trim()) out[out.length - 1].text += '\n' + line; // continuation line
  }
  // Fall back to one message if this isn't a real export (need >=2 messages).
  return out.length >= 2 ? out : [{ index: 0, sender: 'Sender A', text: text.trim() }];
}
export const isChatExport = (text: string) => parseChat(text).length >= 2;
