import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { GlucoseEntry, InsulinEntry, UserProfile, AppSettings } from '../store/glucoseStore';

const getUid = () => auth().currentUser?.uid;

// ── Glucose History ───────────────────────────────────────────────────────────

export const syncGlucoseEntry = async (entry: GlucoseEntry) => {
  const uid = getUid();
  if (!uid) return;
  await firestore()
    .collection('users')
    .doc(uid)
    .collection('glucoseHistory')
    .doc(entry.id)
    .set(entry);
};

export const deleteGlucoseEntry = async (id: string) => {
  const uid = getUid();
  if (!uid) return;
  await firestore()
    .collection('users')
    .doc(uid)
    .collection('glucoseHistory')
    .doc(id)
    .delete();
};

export const fetchGlucoseHistory = async (): Promise<GlucoseEntry[]> => {
  const uid = getUid();
  if (!uid) return [];
  const snap = await firestore()
    .collection('users')
    .doc(uid)
    .collection('glucoseHistory')
    .orderBy('timestamp', 'desc')
    .get();
  return snap.docs.map(d => d.data() as GlucoseEntry);
};

// ── Insulin Log ───────────────────────────────────────────────────────────────

export const syncInsulinEntry = async (entry: InsulinEntry) => {
  const uid = getUid();
  if (!uid || !entry.id) return;
  await firestore()
    .collection('users')
    .doc(uid)
    .collection('insulinLog')
    .doc(entry.id)
    .set(entry);
};

export const fetchInsulinLog = async (): Promise<InsulinEntry[]> => {
  const uid = getUid();
  if (!uid) return [];
  const snap = await firestore()
    .collection('users')
    .doc(uid)
    .collection('insulinLog')
    .orderBy('timestamp', 'desc')
    .get();
  return snap.docs.map(d => d.data() as InsulinEntry);
};

// ── Profile & Settings ────────────────────────────────────────────────────────

export const syncProfile = async (profile: UserProfile) => {
  const uid = getUid();
  if (!uid) return;
  await firestore()
    .collection('users')
    .doc(uid)
    .set({ profile }, { merge: true });
};

export const syncSettings = async (settings: Partial<AppSettings>) => {
  const uid = getUid();
  if (!uid) return;
  await firestore()
    .collection('users')
    .doc(uid)
    .set({ settings }, { merge: true });
};

export const fetchUserData = async () => {
  const uid = getUid();
  if (!uid) return null;
  const doc = await firestore()
    .collection('users')
    .doc(uid)
    .get();
  return doc.exists() ? doc.data() : null;
};