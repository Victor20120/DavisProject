import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { app } from './config';
import type { MedData } from '../types';

export const db = getFirestore(app);

// ─── Schema ───────────────────────────────────────────────────────────────────
//
//  users/{uid}/
//    profile:   { displayName, email, createdAt }
//    meds/{genericName}: MedData + { notes, reminderTime, savedAt }
//    family/{memberId}: { name, relation, email, joinedAt }

// ─── User profile ─────────────────────────────────────────────────────────────

export async function saveUserProfile(uid: string, data: { displayName: string; email: string }) {
  await setDoc(doc(db, 'users', uid, 'profile', 'data'), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

// ─── Medications ──────────────────────────────────────────────────────────────

export async function saveMed(uid: string, med: MedData, notes = '', reminderTime = '') {
  await setDoc(doc(db, 'users', uid, 'meds', med.generic_name), {
    ...med,
    notes,
    reminderTime,
    savedAt: serverTimestamp(),
  });
}

export async function getMed(uid: string, genericName: string): Promise<(MedData & { notes: string; reminderTime: string }) | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'meds', genericName));
  return snap.exists() ? (snap.data() as MedData & { notes: string; reminderTime: string }) : null;
}

export async function updateMedNotes(uid: string, genericName: string, notes: string) {
  await updateDoc(doc(db, 'users', uid, 'meds', genericName), { notes });
}

export async function updateMedReminderTime(uid: string, genericName: string, reminderTime: string) {
  await updateDoc(doc(db, 'users', uid, 'meds', genericName), { reminderTime });
}

// Real-time listener — calls cb whenever the user's med list changes
export function onMedsChanged(
  uid: string,
  cb: (meds: (MedData & { notes: string; reminderTime: string })[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, 'users', uid, 'meds'), snap => {
    const meds = snap.docs.map(d => d.data() as MedData & { notes: string; reminderTime: string });
    cb(meds);
  });
}

// ─── Family ───────────────────────────────────────────────────────────────────

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  email: string;
  joinedAt: unknown;
}

export async function addFamilyMember(uid: string, member: Omit<FamilyMember, 'id' | 'joinedAt'>) {
  const ref = doc(collection(db, 'users', uid, 'family'));
  await setDoc(ref, { ...member, id: ref.id, joinedAt: serverTimestamp() });
}

export async function removeFamilyMember(uid: string, memberId: string) {
  await deleteDoc(doc(db, 'users', uid, 'family', memberId));
}

export function onFamilyChanged(uid: string, cb: (members: FamilyMember[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users', uid, 'family'), snap => {
    cb(snap.docs.map(d => d.data() as FamilyMember));
  });
}

// ─── Demo seed data ───────────────────────────────────────────────────────────

const DEMO_MEDS: MedData[] = [
  {
    common_name: 'Blood Pressure Pill',
    generic_name: 'Lisinopril',
    dosage: '10mg',
    form: 'Oral tablet',
    drug_class: 'ACE Inhibitor',
    active_ingredient: 'Lisinopril 10mg',
    common_effects: 'Dizziness, dry cough, headache',
    manufacturer: 'Lupin Pharma',
    how_to_take: 'Take once daily, with or without food. Best taken at the same time each day. Do not stop without asking your doctor.',
    frequency: 'Once daily',
    take_with_food: false,
    conflicts: ['May reduce effectiveness when taken with Ibuprofen'],
  },
  {
    common_name: 'Pain Reliever',
    generic_name: 'Ibuprofen',
    dosage: '400mg',
    form: 'Oral tablet',
    drug_class: 'NSAID',
    active_ingredient: 'Ibuprofen 400mg',
    common_effects: 'Stomach upset, nausea',
    manufacturer: 'Advil',
    how_to_take: 'Take with food or milk to reduce stomach upset. Do not exceed 3 doses per day.',
    frequency: 'Every 6 hrs as needed',
    take_with_food: true,
    conflicts: ['May reduce effectiveness of Lisinopril'],
  },
  {
    common_name: 'Diabetes Pill',
    generic_name: 'Metformin',
    dosage: '500mg',
    form: 'Oral tablet',
    drug_class: 'Biguanide',
    active_ingredient: 'Metformin HCl 500mg',
    common_effects: 'Nausea, diarrhea',
    manufacturer: 'Teva Pharmaceuticals',
    how_to_take: 'Take with meals to reduce stomach upset. Swallow whole with a full glass of water.',
    frequency: 'Twice daily',
    take_with_food: true,
    conflicts: [],
  },
];

// Seeds the 3 demo meds into a new user's account
export async function seedDemoData(uid: string) {
  const defaultTimes: Record<string, string> = {
    Lisinopril: '08:00',
    Ibuprofen:  '',
    Metformin:  '08:00',
  };
  await Promise.all(
    DEMO_MEDS.map(med => saveMed(uid, med, '', defaultTimes[med.generic_name] ?? ''))
  );
}

// Seeds demo family members for a new user
export async function seedFamilyData(uid: string) {
  const members = [
    { name: 'Sarah', relation: 'Daughter', email: '' },
    { name: 'James', relation: 'Son',      email: '' },
  ];
  await Promise.all(members.map(m => addFamilyMember(uid, m)));
}

// ─── Reminders (stored as single JSON doc) ────────────────────────────────────

export async function saveAllReminders(uid: string, reminders: object) {
  await setDoc(doc(db, 'users', uid, 'settings', 'reminders'), { data: JSON.stringify(reminders) });
}

export async function loadAllReminders(uid: string): Promise<object | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'reminders'));
  if (!snap.exists()) return null;
  try { return JSON.parse((snap.data() as { data: string }).data); } catch { return null; }
}
