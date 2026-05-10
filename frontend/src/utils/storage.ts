const P = 'pillpal';

export function loadNotes(genericName: string): string {
  return localStorage.getItem(`${P}_notes_${genericName}`) ?? '';
}
export function saveNotes(genericName: string, notes: string) {
  localStorage.setItem(`${P}_notes_${genericName}`, notes);
}

export function loadReminderTime(genericName: string): string {
  return localStorage.getItem(`${P}_reminder_${genericName}`) ?? '';
}
export function saveReminderTime(genericName: string, time: string) {
  localStorage.setItem(`${P}_reminder_${genericName}`, time);
}

export interface MedEdits {
  common_name?: string;
  how_to_take?: string;
  frequency?: string;
}
export function loadMedEdits(genericName: string): MedEdits {
  try {
    const s = localStorage.getItem(`${P}_edits_${genericName}`);
    if (s) return JSON.parse(s) as MedEdits;
  } catch {}
  return {};
}
export function saveMedEdits(genericName: string, edits: MedEdits) {
  localStorage.setItem(`${P}_edits_${genericName}`, JSON.stringify(edits));
}
