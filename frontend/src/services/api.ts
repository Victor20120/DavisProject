import type { MedData } from '../types';

const BASE_URL = 'http://localhost:8000';

export async function scanPillBottle(base64Image: string, mediaType = 'image/jpeg'): Promise<MedData> {
  const res = await fetch(`${BASE_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: base64Image, media_type: mediaType }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail ?? `Scan failed: ${res.status}`);
  }

  const data = await res.json() as MedData;
  console.log('[Pill Pal] Scan response:', data);
  return data;
}
