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

// ─── Invitations ──────────────────────────────────────────────────────────────

export interface Invitation {
  token: string;
  inviterUid: string;
  inviterName: string;
  name: string;
  relation: string;
  phone: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: unknown;
}

export async function createInvitation(
  inviterUid: string,
  inviterName: string,
  data: { name: string; relation: string; phone: string },
): Promise<string> {
  const token = crypto.randomUUID();
  const payload = { token, inviterUid, inviterName, ...data, status: 'pending', createdAt: serverTimestamp() };
  await setDoc(doc(db, 'invitations', token), payload);
  await setDoc(doc(db, 'users', inviterUid, 'invites', token), payload);
  return token;
}

export async function getInvitation(token: string): Promise<Invitation | null> {
  const snap = await getDoc(doc(db, 'invitations', token));
  return snap.exists() ? (snap.data() as Invitation) : null;
}

export async function acceptInvitation(token: string, inviterUid: string, name: string, relation: string): Promise<void> {
  await updateDoc(doc(db, 'invitations', token), { status: 'accepted' });
  await updateDoc(doc(db, 'users', inviterUid, 'invites', token), { status: 'accepted' });
  const memberId = token; // use token as stable ID for this family member slot
  await setDoc(doc(db, 'users', inviterUid, 'family', memberId), {
    id: memberId,
    name,
    relation,
    email: '',
    joinedAt: serverTimestamp(),
  });
}

export async function declineInvitation(token: string, inviterUid: string): Promise<void> {
  await updateDoc(doc(db, 'invitations', token), { status: 'declined' });
  await updateDoc(doc(db, 'users', inviterUid, 'invites', token), { status: 'declined' });
}

export function onInvitesChanged(uid: string, cb: (invites: Invitation[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users', uid, 'invites'), snap => {
    cb(snap.docs.map(d => d.data() as Invitation));
  });
}

export async function storeFamilyPushSubscription(inviterUid: string, token: string, sub: object): Promise<void> {
  await setDoc(doc(db, 'users', inviterUid, 'familyPush', token), sub);
}

export const db = getFirestore(app);

// ─── Schema ───────────────────────────────────────────────────────────────────
//
//  users/{uid}/
//    profile:   { displayName, email, createdAt }
//    meds/{genericName}: MedData + { notes, reminderTime, savedAt }
//    family/{memberId}: { name, relation, email, joinedAt }

// ─── User profile ─────────────────────────────────────────────────────────────

export async function saveUserProfile(uid: string, data: { displayName: string; email: string }) {
  // Create the top-level users/{uid} document so the backend can list users
  await setDoc(doc(db, 'users', uid), { createdAt: serverTimestamp() }, { merge: true });
  await setDoc(doc(db, 'users', uid, 'profile', 'data'), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export interface DetailedMed {
  name: string;
  dosage: string;
  frequency: string;
}

export interface HealthProfile {
  displayName: string;
  email: string;
  age: string;
  sex: string;
  weightLbs: string;
  conditions: string[];           // predefined + custom
  currentMeds: string[];          // simple name list (onboarding legacy)
  currentMedsDetailed?: DetailedMed[]; // full med cards from Profile page
  allergies: string[];
  otherAllergies: string;
  lifestyle: string[];            // legacy
  diet: string;                   // legacy
  // Structured lifestyle — used for tailored advice generation
  alcoholUse?: string;            // 'none' | 'occasionally' | 'daily'
  tobaccoUse?: string;            // 'non-smoker' | 'former' | 'current'
  exerciseLevel?: string;         // 'sedentary' | 'light' | 'moderate' | 'active'
  dietRestrictions?: string[];    // ['Low sodium', 'Vegan', ...]
  grapefruitConsumer?: boolean;
  takesSupplements?: boolean;
  reminderPref: string;
  reminderEmail: string;
  onboardingComplete: boolean;
}

export async function saveHealthProfile(uid: string, profile: HealthProfile) {
  await setDoc(doc(db, 'users', uid, 'profile', 'data'), {
    ...profile,
    onboardingComplete: true,
    updatedAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<HealthProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'profile', 'data'));
  return snap.exists() ? (snap.data() as HealthProfile) : null;
}

// ─── Medications ──────────────────────────────────────────────────────────────

// Firestore doc IDs cannot contain '/' — replace with '-' to keep names readable
function toDocId(genericName: string): string {
  return genericName.replace(/\//g, '-').trim();
}

export async function saveMed(uid: string, med: MedData, notes = '', reminderTime = '') {
  await setDoc(doc(db, 'users', uid, 'meds', toDocId(med.generic_name)), {
    ...med,
    notes,
    reminderTime,
    savedAt: serverTimestamp(),
  });
}

export async function getMed(uid: string, genericName: string): Promise<(MedData & { notes: string; reminderTime: string }) | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'meds', toDocId(genericName)));
  return snap.exists() ? (snap.data() as MedData & { notes: string; reminderTime: string }) : null;
}

export async function updateMedNotes(uid: string, genericName: string, notes: string) {
  await updateDoc(doc(db, 'users', uid, 'meds', toDocId(genericName)), { notes });
}

export async function removeMed(uid: string, genericName: string) {
  await deleteDoc(doc(db, 'users', uid, 'meds', toDocId(genericName)));
}

export async function updateMedReminderTime(uid: string, genericName: string, reminderTime: string) {
  await updateDoc(doc(db, 'users', uid, 'meds', toDocId(genericName)), { reminderTime });
}

export async function markMedTaken(uid: string, genericName: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  await updateDoc(doc(db, 'users', uid, 'meds', toDocId(genericName)), {
    lastTakenAt: serverTimestamp(),
    lastTakenDate: today,
  });
}

// Read another user's meds (for family members to see status)
export function onFamilyMedStatus(
  inviterUid: string,
  cb: (meds: (MedData & { notes: string; reminderTime: string; lastTakenDate?: string })[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, 'users', inviterUid, 'meds'), snap => {
    cb(snap.docs.map(d => d.data() as MedData & { notes: string; reminderTime: string; lastTakenDate?: string }));
  });
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

// ─── Simple health settings (age / gender / weight for AI context) ─────────────

export interface HealthSettings {
  age:        string;
  gender:     string;
  weight:     string;
  weightUnit: 'lbs' | 'kg';
}

export async function saveHealthSettings(uid: string, s: HealthSettings) {
  await setDoc(doc(db, 'users', uid, 'profile', 'health'), s);
}

export async function loadHealthSettings(uid: string): Promise<HealthSettings | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'profile', 'health'));
  return snap.exists() ? (snap.data() as HealthSettings) : null;
}
