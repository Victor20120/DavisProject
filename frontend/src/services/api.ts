import type { MedData } from '../types';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string;

const SCAN_PROMPT = `You are a medication assistant for elderly users.
The user has photographed their pill bottle label.
Extract all visible text and identify the medication.

Respond ONLY in this JSON format, no extra text, no markdown backticks:
{
  "common_name": "casual name most people know e.g. Blood Pressure Pill",
  "generic_name": "medical name e.g. Lisinopril",
  "dosage": "e.g. 10mg",
  "form": "e.g. Oral tablet",
  "drug_class": "e.g. ACE Inhibitor",
  "active_ingredient": "e.g. Lisinopril 10mg",
  "common_effects": "e.g. Dizziness, dry cough",
  "manufacturer": "e.g. Lupin Pharma",
  "how_to_take": "plain English rewrite of bottle instructions, 2-3 sentences max, simple words only",
  "frequency": "e.g. Once daily",
  "take_with_food": true,
  "conflicts": ["known interaction warnings as strings, empty array if none"]
}`;

export async function scanPillBottle(base64Image: string, mediaType = 'image/jpeg'): Promise<MedData> {
  if (!ANTHROPIC_KEY) {
    throw new Error('Anthropic API key not set. Add VITE_ANTHROPIC_API_KEY to your .env file.');
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':                              ANTHROPIC_KEY,
      'anthropic-version':                      '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type':                           'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type:       'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data:       base64Image,
              },
            },
            { type: 'text', text: SCAN_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Claude API error: ${res.status}`);
  }

  const payload = await res.json() as { content: { type: string; text: string }[] };
  const text = payload.content.find(c => c.type === 'text')?.text ?? '';
  console.log('[Pill Pal] Raw Claude response:', text);

  try {
    return JSON.parse(text) as MedData;
  } catch {
    // Sometimes Claude wraps in backticks despite instructions — strip them
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as MedData;
  }
}
