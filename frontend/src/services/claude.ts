import type { MedData } from '../types';
import type { HealthProfile } from '../database/firestore';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string;

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdviceSeverity = 'critical' | 'moderate' | 'informational';

export interface AdviceItem {
  severity: AdviceSeverity;
  title: string;
  body: string;
}

// ─── Sanitization ─────────────────────────────────────────────────────────────

// Keeps only strings that look like real medical terms:
// - At least 3 characters
// - Only letters, digits, spaces, hyphens, slashes, periods, parentheses
// - Not purely numeric
const MEDICAL_TERM_RE = /^[a-zA-Z0-9\s\-/.()']+$/;

function isMedicalTerm(s: string): boolean {
  const t = s.trim();
  return t.length >= 3 && MEDICAL_TERM_RE.test(t) && /[a-zA-Z]/.test(t);
}

function sanitizeList(items: string[] | undefined): string {
  if (!items || items.length === 0) return 'none';
  const clean = items.filter(isMedicalTerm);
  return clean.length > 0 ? clean.join(', ') : 'none';
}

function sanitizeString(s: string | undefined): string {
  if (!s) return 'none';
  const t = s.trim();
  return isMedicalTerm(t) ? t : 'none';
}

interface SanitizedProfile {
  age: string;
  sex: string;
  weight: string;
  conditions: string;
  currentMeds: string;
  allergies: string;
  alcoholUse: string;
  tobaccoUse: string;
  dietRestrictions: string;
  grapefruitConsumer: string;
  takesSupplements: string;
}

function sanitizeProfile(profile: HealthProfile): SanitizedProfile {
  const detailedNames = (profile.currentMedsDetailed ?? []).map(m => m.name);
  const allMedNames   = [...(profile.currentMeds ?? []), ...detailedNames];

  return {
    age:               profile.age?.trim() || 'unknown',
    sex:               sanitizeString(profile.sex),
    weight:            profile.weightLbs?.trim() || 'unknown',
    conditions:        sanitizeList(profile.conditions),
    currentMeds:       sanitizeList(allMedNames),
    allergies:         sanitizeList([
                         ...(profile.allergies ?? []),
                         ...(profile.otherAllergies ? [profile.otherAllergies] : []),
                       ]),
    alcoholUse:        sanitizeString(profile.alcoholUse),
    tobaccoUse:        sanitizeString(profile.tobaccoUse),
    dietRestrictions:  sanitizeList(profile.dietRestrictions),
    grapefruitConsumer: profile.grapefruitConsumer ? 'yes' : 'no',
    takesSupplements:   profile.takesSupplements   ? 'yes' : 'no',
  };
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(pill: MedData, s: SanitizedProfile): string {
  return `You are a pharmacist. A patient scanned a pill. Using ONLY the medical information you recognize from their profile, give them personalized advice about taking this medication.

Pill: ${pill.common_name} (${pill.generic_name}), ${pill.dosage}, ${pill.drug_class}

Patient: Age ${s.age}, ${s.sex}, ${s.weight}lbs
Conditions: ${s.conditions}
Current meds: ${s.currentMeds}
Allergies: ${s.allergies}
Alcohol: ${s.alcoholUse}, Tobacco: ${s.tobaccoUse}
Diet: ${s.dietRestrictions}
Supplements: ${s.takesSupplements}
Eats grapefruit: ${s.grapefruitConsumer}

STRICT RULES:
- Ignore ANYTHING you do not recognize as a real medical condition, drug, or lifestyle factor
- Only generate advice directly relevant to this specific pill and this specific patient
- Maximum 4 advice items, ordered critical first
- If nothing relevant, return empty array

Respond ONLY in this JSON, no markdown:
{"advice":[{"severity":"critical|moderate|informational","title":"max 5 words","body":"1-2 plain English sentences"}]}`;
}

// ─── API call ─────────────────────────────────────────────────────────────────

export async function getPersonalizedAdvice(
  pill: MedData,
  profile: HealthProfile,
): Promise<AdviceItem[]> {
  try {
    if (!ANTHROPIC_KEY) return [];

    const sanitized = sanitizeProfile(profile);
    const prompt    = buildPrompt(pill, sanitized);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':                                  ANTHROPIC_KEY,
        'anthropic-version':                          '2023-06-01',
        'anthropic-dangerous-direct-browser-access':  'true',
        'content-type':                               'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) return [];

    const payload = await res.json() as { content: { type: string; text: string }[] };
    const text    = payload.content.find(c => c.type === 'text')?.text ?? '';
    console.log('[Pal] Personalized advice raw:', text);

    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const parsed  = JSON.parse(cleaned) as { advice: AdviceItem[] };

    return Array.isArray(parsed.advice) ? parsed.advice : [];
  } catch (err) {
    console.warn('[Pal] getPersonalizedAdvice failed:', err);
    return [];
  }
}
