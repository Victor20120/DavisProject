const BASE_URL = 'http://localhost:8000';

export interface MedResult {
  med_name: string;
  dosage: string;
  plain_english: string;
  conflicts: string[];
  take_with_food: boolean;
}

export async function scanPillBottle(base64Image: string): Promise<MedResult> {
  const res = await fetch(`${BASE_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: base64Image }),
  });
  if (!res.ok) throw new Error('Scan failed');
  return res.json();
}
