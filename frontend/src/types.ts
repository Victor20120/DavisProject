// Gemini JSON contract — shared between frontend and backend
export interface MedData {
  common_name: string;
  generic_name: string;
  dosage: string;
  form: string;
  drug_class: string;
  active_ingredient: string;
  common_effects: string;
  manufacturer: string;
  how_to_take: string;
  frequency: string;
  take_with_food: boolean;
  conflicts: string[];
}

export interface ConflictResult {
  has_conflict: boolean;
  conflicts: {
    drug_a: string;
    drug_b: string;
    severity: 'mild' | 'moderate' | 'severe';
    description: string;
  }[];
}

export interface ScannedMed {
  id: string;
  data: MedData;
  scannedAt: Date;
  reminderTime?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  lastDoseTaken: boolean;
  lastDoseTime?: string;
}
