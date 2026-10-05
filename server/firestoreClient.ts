import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  Firestore,
} from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

let dbInstance: Firestore | null = null;
let cachedConfig: { projectId: string; firestoreDatabaseId: string; apiKey: string; [key: string]: any } | null = null;

export function getFirebaseConfig() {
  if (cachedConfig) return cachedConfig;
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, 'utf8');
    cachedConfig = JSON.parse(raw);
    return cachedConfig!;
  }
  throw new Error('firebase-applet-config.json not found');
}

export function getDb(): Firestore {
  if (!dbInstance) {
    const cfg = getFirebaseConfig();
    const app = getApps().length > 0 ? getApp() : initializeApp(cfg);
    dbInstance = getFirestore(app, cfg.firestoreDatabaseId);
  }
  return dbInstance;
}

export async function firestoreGetDoc(collectionPath: string, docId: string): Promise<Record<string, any> | null> {
  const db = getDb();
  const docRef = doc(db, collectionPath, docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function firestoreSetDoc(collectionPath: string, docId: string, data: Record<string, any>): Promise<void> {
  const db = getDb();
  const docRef = doc(db, collectionPath, docId);
  const { id: _ignoredId, ...rest } = data;
  await setDoc(docRef, rest, { merge: true });
}

export async function firestoreDeleteDoc(collectionPath: string, docId: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, collectionPath, docId);
  await deleteDoc(docRef);
}

export async function firestoreQuery(
  collectionPath: string,
  filterField?: string,
  filterValue?: any,
  tenantId?: string
): Promise<Record<string, any>[]> {
  const db = getDb();
  const colRef = collection(db, collectionPath);
  const constraints: any[] = [];
  if (tenantId) {
    constraints.push(where('tenantId', '==', tenantId));
  }
  if (filterField && filterValue !== undefined) {
    constraints.push(where(filterField, '==', filterValue));
  }
  const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
