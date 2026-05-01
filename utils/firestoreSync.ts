import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { GlucoseEntry, InsulinEntry, UserProfile, AppSettings, SavedMeal } from '../store/glucoseStore';

const getUid = () => auth().currentUser?.uid;

// ── Glucose History ───────────────────────────────────────────────────────────

export const syncGlucoseEntry = async (entry: GlucoseEntry) => {
  const uid = getUid();
  if (!uid) return;
  await firestore().collection('users').doc(uid).collection('glucoseHistory').doc(entry.id).set(entry);
};

export const deleteGlucoseEntry = async (id: string) => {
  const uid = getUid();
  if (!uid) return;
  await firestore().collection('users').doc(uid).collection('glucoseHistory').doc(id).delete();
};

export const fetchGlucoseHistory = async (): Promise<GlucoseEntry[]> => {
  const uid = getUid();
  if (!uid) return [];
  const snap = await firestore().collection('users').doc(uid).collection('glucoseHistory').orderBy('timestamp', 'desc').get();
  return snap.docs.map(d => d.data() as GlucoseEntry);
};

// ── Insulin Log ───────────────────────────────────────────────────────────────

export const syncInsulinEntry = async (entry: InsulinEntry) => {
  const uid = getUid();
  if (!uid || !entry.id) return;
  await firestore().collection('users').doc(uid).collection('insulinLog').doc(entry.id).set(entry);
};

export const fetchInsulinLog = async (): Promise<InsulinEntry[]> => {
  const uid = getUid();
  if (!uid) return [];
  const snap = await firestore().collection('users').doc(uid).collection('insulinLog').orderBy('timestamp', 'desc').get();
  return snap.docs.map(d => d.data() as InsulinEntry);
};

// ── Saved Meals ───────────────────────────────────────────────────────────────

export const syncSavedMeal = async (meal: SavedMeal) => {
  const uid = getUid();
  if (!uid) return;
  await firestore().collection('users').doc(uid).collection('savedMeals').doc(meal.id).set(meal);
};

export const deleteSavedMeal = async (id: string) => {
  const uid = getUid();
  if (!uid) return;
  await firestore().collection('users').doc(uid).collection('savedMeals').doc(id).delete();
};

export const fetchSavedMeals = async (): Promise<SavedMeal[]> => {
  const uid = getUid();
  if (!uid) return [];
  const snap = await firestore().collection('users').doc(uid).collection('savedMeals').orderBy('date', 'desc').get();
  return snap.docs.map(d => d.data() as SavedMeal);
};

// ── Profile & Settings ────────────────────────────────────────────────────────

export const syncProfile = async (profile: UserProfile) => {
  const uid = getUid();
  if (!uid) return;
  await firestore().collection('users').doc(uid).set({ profile }, { merge: true });
};

export const syncSettings = async (settings: Partial<AppSettings>) => {
  const uid = getUid();
  if (!uid) return;
  await firestore().collection('users').doc(uid).set({ settings }, { merge: true });
};

export const fetchUserData = async () => {
  const uid = getUid();
  if (!uid) return null;
  const doc = await firestore().collection('users').doc(uid).get();
  return doc.exists() ? doc.data() : null;
};

export const checkFirebasePremium = async (): Promise<boolean> => {
  const uid = getUid();
  if (!uid) return false;
  try {
    const doc = await firestore().collection('users').doc(uid).get();
    return doc.exists() ? (doc.data()?.isPremium === true) : false;
  } catch {
    return false;
  }
};

// ── Caregiver codes — Option 4: caregiverData collection ─────────────────────

export type CaregiverCodeType = 'temporary' | 'permanent';

export interface ActiveCaregiverCodes {
  temporary: string | null;
  permanent: string | null;
}

// ── Generate a caregiver code ─────────────────────────────────────────────────

export const generateCaregiverCode = async (
  patientName: string,
  patientAddress: string,
  type: CaregiverCodeType,
  history: GlucoseEntry[],
  insulinEntries: InsulinEntry[],
  savedMeals: SavedMeal[],
): Promise<string> => {
  const uid = getUid();
  if (!uid) throw new Error('Not signed in');

  const db = firestore();

  // Find and delete existing codes of this type
  const existing = await db
    .collection('inviteCodes')
    .where('patientUid', '==', uid)
    .where('codeType', '==', type)
    .get();

  for (const d of existing.docs) {
    const oldCode = d.id;
    await _deleteCollection(db, `caregiverData/${oldCode}/glucoseHistory`);
    await _deleteCollection(db, `caregiverData/${oldCode}/insulinLog`);
    await _deleteCollection(db, `caregiverData/${oldCode}/savedMeals`);
    await db.collection('caregiverData').doc(oldCode).delete();
    await d.ref.delete();
  }

  // Generate unique 6-digit code
  let code = '';
  let attempts = 0;
  while (attempts < 5) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    const snap = await db.collection('inviteCodes').doc(code).get();
    if (!snap.exists()) break;
    attempts++;
  }
  if (!code) throw new Error('Could not generate a unique code. Please try again.');

  const expiresAt = type === 'temporary'
    ? firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
    : null;

  // Fetch patient's own premium status to embed in caregiverData
  const userDoc = await db.collection('users').doc(uid).get();
  const isPremium = userDoc.exists() ? (userDoc.data()?.isPremium === true) : false;

  // Write inviteCode doc
  const invitePayload: Record<string, any> = {
    patientUid: uid, patientName,
    patientAddress: patientAddress ?? '',
    codeType: type,
    createdAt: firestore.FieldValue.serverTimestamp(),
  };
  if (expiresAt) invitePayload.expiresAt = expiresAt;
  await db.collection('inviteCodes').doc(code).set(invitePayload);

  // Write caregiverData/{code} root document — includes isPremium
  const cgPayload: Record<string, any> = {
    patientUid: uid, patientName, codeType: type,
    isPremium,
    createdAt: firestore.FieldValue.serverTimestamp(),
  };
  if (expiresAt) cgPayload.expiresAt = expiresAt;
  await db.collection('caregiverData').doc(code).set(cgPayload);

  // Bulk-write patient data into subcollections
  await _bulkWrite(db, `caregiverData/${code}/glucoseHistory`, history);
  await _bulkWrite(db, `caregiverData/${code}/insulinLog`, insulinEntries);
  await _bulkWrite(db, `caregiverData/${code}/savedMeals`, savedMeals);

  return code;
};

// ── Sync new entry to all active caregiver codes ──────────────────────────────

export const syncEntryToCaregiverData = async (
  collection: 'glucoseHistory' | 'insulinLog' | 'savedMeals',
  entry: { id: string; [key: string]: any },
): Promise<void> => {
  const uid = getUid();
  if (!uid) return;
  const db = firestore();
  const snap = await db.collection('inviteCodes').where('patientUid', '==', uid).get();
  if (snap.empty) return;
  const now = new Date();
  const batch = db.batch();
  snap.docs.forEach(doc => {
    const data = doc.data();
    if (data.codeType === 'temporary' && data.expiresAt) {
      if (data.expiresAt.toDate() < now) return;
    }
    const ref = db.collection('caregiverData').doc(doc.id).collection(collection).doc(entry.id);
    batch.set(ref, entry);
  });
  await batch.commit();
};

// ── Revoke a caregiver code ───────────────────────────────────────────────────

export const revokeCaregiverCode = async (code: string): Promise<void> => {
  const db = firestore();
  await _deleteCollection(db, `caregiverData/${code}/glucoseHistory`);
  await _deleteCollection(db, `caregiverData/${code}/insulinLog`);
  await _deleteCollection(db, `caregiverData/${code}/savedMeals`);
  await db.collection('caregiverData').doc(code).delete();
  await db.collection('inviteCodes').doc(code).delete();
};

// ── Fetch patient's own active codes ─────────────────────────────────────────

export const fetchActiveCaregiverCodes = async (): Promise<ActiveCaregiverCodes> => {
  const uid = getUid();
  if (!uid) return { temporary: null, permanent: null };
  const snap = await firestore().collection('inviteCodes').where('patientUid', '==', uid).get();
  const result: ActiveCaregiverCodes = { temporary: null, permanent: null };
  const now = new Date();
  snap.docs.forEach(doc => {
    const data = doc.data();
    const type: CaregiverCodeType = data.codeType ?? 'temporary';
    if (type === 'temporary' && data.expiresAt) {
      if (data.expiresAt.toDate() < now) return;
    }
    result[type] = doc.id;
  });
  return result;
};

// ── Redeem a caregiver code ───────────────────────────────────────────────────
// Returns { code, patientName, isPremium }

export const redeemCaregiverCode = async (
  code: string,
): Promise<{ code: string; patientName: string; isPremium: boolean }> => {
  const db = firestore();
  const doc = await db.collection('caregiverData').doc(code.trim()).get();
  if (!doc.exists()) throw new Error('invalid');
  const data = doc.data()!;
  if (data.codeType === 'temporary' && data.expiresAt) {
    if (data.expiresAt.toDate() < new Date()) throw new Error('expired');
  }
  return {
    code: code.trim(),
    patientName: data.patientName,
    isPremium: data.isPremium ?? false,
  };
};

// ── Caregiver data readers ────────────────────────────────────────────────────

export const fetchCaregiverHistory = async (code: string): Promise<GlucoseEntry[]> => {
  const snap = await firestore()
    .collection('caregiverData').doc(code)
    .collection('glucoseHistory')
    .orderBy('timestamp', 'desc')
    .get();
  return snap.docs.map(d => d.data() as GlucoseEntry);
};

export const fetchCaregiverInsulinLog = async (code: string): Promise<InsulinEntry[]> => {
  const snap = await firestore()
    .collection('caregiverData').doc(code)
    .collection('insulinLog')
    .orderBy('timestamp', 'desc')
    .get();
  return snap.docs.map(d => d.data() as InsulinEntry);
};

export const fetchCaregiverMeals = async (code: string): Promise<SavedMeal[]> => {
  const snap = await firestore()
    .collection('caregiverData').doc(code)
    .collection('savedMeals')
    .orderBy('date', 'desc')
    .get();
  return snap.docs.map(d => d.data() as SavedMeal);
};

// ── Internal helpers ──────────────────────────────────────────────────────────

const _bulkWrite = async (
  db: ReturnType<typeof firestore>,
  collectionPath: string,
  docs: { id: string; [key: string]: any }[],
): Promise<void> => {
  if (docs.length === 0) return;
  const parts = collectionPath.split('/');
  const BATCH_SIZE = 400;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(doc => {
      const ref = db.collection(parts[0]).doc(parts[1]).collection(parts[2]).doc(doc.id);
      batch.set(ref, doc);
    });
    await batch.commit();
  }
};

const _deleteCollection = async (
  db: ReturnType<typeof firestore>,
  collectionPath: string,
): Promise<void> => {
  const parts = collectionPath.split('/');
  const snap = await db.collection(parts[0]).doc(parts[1]).collection(parts[2]).get();
  if (snap.empty) return;
  const BATCH_SIZE = 400;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    snap.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
};