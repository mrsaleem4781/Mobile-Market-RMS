/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';

import firebaseConfig from '../firebase-applet-config.json';
import { AppUser, Transaction, Shop, Market, AuditLog } from '../types';

// Detect whether we are in placeholder mode or have a real remote Firebase profile
export const isRealFirebase = 
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes('placeholder') && 
  firebaseConfig.projectId !== 'placeholder-offline-first-project';

let app;
let auth: any;
let db: any;
let googleProvider: any;

if (isRealFirebase) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error("Firebase Initialization Failed: ", error);
  }
}

// Error type definitions matching the Skill requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuth = auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid || null,
      email: currentAuth?.currentUser?.email || null,
      emailVerified: currentAuth?.currentUser?.emailVerified || null,
      isAnonymous: currentAuth?.currentUser?.isAnonymous || null,
      tenantId: currentAuth?.currentUser?.tenantId || null,
      providerInfo: currentAuth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Payload: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connectivity according to the critical guideline
export async function testConnection(): Promise<boolean> {
  if (!isRealFirebase || !db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase indicates client is currently offline.");
    }
    return false;
  }
}

// Global functions wrapped with proper error handlers
export const firebaseService = {
  isConfigured(): boolean {
    return isRealFirebase && auth !== null && db !== null;
  },

  async loginWithGoogle(): Promise<FirebaseUser | null> {
    if (!this.isConfigured()) {
      throw new Error("Cloud sync is not configured. Please complete steps in the settings panel first.");
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Google Login Failed:", error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    if (!this.isConfigured()) return;
    await signOut(auth);
  },

  onAuthChanged(callback: (user: FirebaseUser | null) => void) {
    if (!this.isConfigured()) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  },

  // Firestore operations wrapped with skill-compliant error handlers

  async saveUserProfile(user: AppUser): Promise<void> {
    const path = `users/${user.id}`;
    if (!this.isConfigured()) return;
    try {
      await setDoc(doc(db, 'users', user.id), user);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getUserProfile(uid: string): Promise<AppUser | null> {
    const path = `users/${uid}`;
    if (!this.isConfigured()) return null;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data() as AppUser) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async syncTransactionToCloud(transaction: Transaction): Promise<void> {
    const path = `transactions/${transaction.id}`;
    if (!this.isConfigured()) return;
    try {
      // Stripping potential base64 images if too large, but storing small photos is fine (Firestore document 1MB limit).
      // Standardize sync marker
      const cloudPayload = {
        ...transaction,
        syncStatus: 'synced' as const,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'transactions', transaction.id), cloudPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async syncAuditLogToCloud(log: AuditLog): Promise<void> {
    const path = `auditLogs/${log.id}`;
    if (!this.isConfigured()) return;
    try {
      await setDoc(doc(db, 'auditLogs', log.id), log);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async syncShopToCloud(shop: Shop): Promise<void> {
    const path = `shops/${shop.id}`;
    if (!this.isConfigured()) return;
    try {
      await setDoc(doc(db, 'shops', shop.id), shop);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async syncMarketToCloud(market: Market): Promise<void> {
    const path = `markets/${market.id}`;
    if (!this.isConfigured()) return;
    try {
      await setDoc(doc(db, 'markets', market.id), market);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async fetchAllTransactionsFromCloud(): Promise<Transaction[]> {
    const path = `transactions`;
    if (!this.isConfigured()) return [];
    try {
      const q = query(collection(db, 'transactions'));
      const querySnap = await getDocs(q);
      const list: Transaction[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as Transaction);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async fetchAllUsersFromCloud(): Promise<AppUser[]> {
    const path = `users`;
    if (!this.isConfigured()) return [];
    try {
      const q = query(collection(db, 'users'));
      const querySnap = await getDocs(q);
      const list: AppUser[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as AppUser);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async fetchAllShopsFromCloud(): Promise<Shop[]> {
    const path = `shops`;
    if (!this.isConfigured()) return [];
    try {
      const q = query(collection(db, 'shops'));
      const querySnap = await getDocs(q);
      const list: Shop[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as Shop);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async fetchAllMarketsFromCloud(): Promise<Market[]> {
    const path = `markets`;
    if (!this.isConfigured()) return [];
    try {
      const q = query(collection(db, 'markets'));
      const querySnap = await getDocs(q);
      const list: Market[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as Market);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async fetchAllAuditLogsFromCloud(): Promise<AuditLog[]> {
    const path = `auditLogs`;
    if (!this.isConfigured()) return [];
    try {
      const q = query(collection(db, 'auditLogs'));
      const querySnap = await getDocs(q);
      const list: AuditLog[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as AuditLog);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }
};
export { auth, db };
