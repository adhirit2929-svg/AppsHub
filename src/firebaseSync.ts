import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { db, handleFirestoreError, OperationType } from './firebase';

export const BUILTIN_FIREBASE_INFO = {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId,
};

export const VALID_BUCKETS = [
  'customApps',
  'notes',
  'stocks',
  'meditation',
  'shortcuts',
  'appPrivacy',
  'calculator',
  'nutritrack',
] as const;

export type BucketName = (typeof VALID_BUCKETS)[number];

export interface HubAccountMeta {
  username: string;
  displayName?: string;
  avatar?: string;
  accountType?: string;
  theme?: string;
  agentDataPerm?: boolean;
}

export interface CloudBucketPayload {
  items?: Record<string, unknown>[];
  settings?: Record<string, unknown>;
}

export interface SyncAccountInput {
  account: HubAccountMeta;
  buckets?: Partial<Record<BucketName, CloudBucketPayload>>;
}

export interface LoadedCloudAccount {
  accountKey: string;
  username: string;
  displayName: string;
  avatar: string;
  accountType: 'online';
  role?: 'user' | 'admin';
  theme: 'light' | 'dark';
  agentDataPerm: boolean;
  buckets: Partial<Record<BucketName, CloudBucketPayload>>;
}

export interface OnlineProfileDTO {
  ownerId: string;
  usernameKey: string;
  username: string;
  displayName: string;
  avatar: string;
  role: 'user' | 'admin';
}

export interface ParticipantMiniProfile {
  username: string;
  usernameKey: string;
  displayName: string;
  avatar: string;
  role: 'user' | 'admin';
}

export interface FriendshipDTO {
  pairId: string;
  participants: string[];
  requesterId: string;
  status: 'pending' | 'accepted';
  profiles: Record<string, ParticipantMiniProfile>;
  updatedAtMs: number;
}

export interface ChatThreadDTO {
  chatId: string;
  participants: string[];
  profiles: Record<string, ParticipantMiniProfile>;
  lastMessageText: string;
  lastMessageSenderId: string;
  lastMessageAtMs: number;
  updatedAtMs: number;
}

export interface ChatMessageDTO {
  messageId: string;
  chatId: string;
  participants: string[];
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  text: string;
  createdAtMs: number;
}

export interface OnlineAppDTO {
  appId: string;
  name: string;
  description: string;
  icon: string;
  authorUid: string;
  authorUsername: string;
  authorUsernameKey: string;
  authorDisplayName: string;
  sourceMode: 'html' | 'bundle';
  code: string;
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  status: 'pending' | 'approved' | 'rejected' | 'disabled';
  version: number;
  adminNote: string;
  reviewedByUid: string;
  hasPendingUpdate: boolean;
  pendingUpdate: Record<string, unknown>;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface SubmitOnlineAppInput {
  name: string;
  description?: string;
  icon?: string;
  sourceMode: 'html' | 'bundle';
  code?: string;
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
}

export interface ReviewOnlineAppInput {
  appId: string;
  status: 'approved' | 'rejected' | 'disabled';
  adminNote?: string;
}

export interface UpdateOnlineAppInput {
  appId: string;
  name?: string;
  description?: string;
  icon?: string;
  sourceMode?: 'html' | 'bundle';
  code?: string;
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
}

export interface AdminDashboardDTO {
  isAdmin: boolean;
  isBootstrapped: boolean;
  admins: Array<{ uid: string; usernameKey: string; username: string; grantedBy: string }>;
  invites: Array<{ usernameKey: string; targetUsername: string; invitedByUid: string }>;
  onlineProfiles: OnlineProfileDTO[];
  announcement: { message: string; active: boolean; updatedBy: string } | null;
}

export function toSafeAccountKey(username: string): string {
  const cleaned = String(username || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  if (cleaned.length >= 2) return cleaned;
  return ('acc_' + cleaned).slice(0, 40);
}

export const BOOTSTRAPPED_ADMIN_EMAIL = 'adhirit2929@gmail.com';

export function isExcludedLegacyAccount(name: string): boolean {
  const raw = String(name || '').trim().toLowerCase().replace(/^@+/, '');
  if (!raw) return false;
  return raw === 'man1234hfsuye4' || raw === 'mansuye';
}

export function makeSortedPair(uid1: string, uid2: string): { pairId: string; participants: [string, string] } {
  const participants: [string, string] = uid1 < uid2 ? [uid1, uid2] : [uid2, uid1];
  return {
    pairId: `${participants[0]}__${participants[1]}`,
    participants,
  };
}

function timestampToMs(val: unknown): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function sanitizeMeta(uid: string, accountKey: string, meta: HubAccountMeta) {
  const rawUser = String(meta.username || accountKey).trim();
  const username = (rawUser.length >= 2 ? rawUser : accountKey).slice(0, 40);
  const rawDisplay = String(meta.displayName || username).trim();
  const displayName = (rawDisplay.length >= 1 ? rawDisplay : username).slice(0, 60);
  const rawAvatar = String(meta.avatar || '');
  const avatar = rawAvatar.length <= 2048 ? rawAvatar : '';
  const theme: 'light' | 'dark' = meta.theme === 'dark' ? 'dark' : 'light';
  const agentDataPerm = typeof meta.agentDataPerm === 'boolean' ? meta.agentDataPerm : true;
  return {
    ownerId: uid,
    accountKey,
    username,
    displayName,
    avatar,
    accountType: 'online' as const,
    theme,
    agentDataPerm,
  };
}

function sanitizeMapObject(input: unknown, depth = 0): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || depth > 5) {
    return {};
  }
  const out: Record<string, unknown> = {};
  const entries = Object.entries(input as Record<string, unknown>).slice(0, 100);
  for (const [k, v] of entries) {
    if (!k || v === undefined || typeof v === 'function') continue;
    const safeKey = String(k).slice(0, 120);
    if (v === null || typeof v === 'boolean' || typeof v === 'number') {
      out[safeKey] = Number.isNaN(v) ? 0 : v;
    } else if (typeof v === 'string') {
      out[safeKey] = v.slice(0, 120000);
    } else if (Array.isArray(v)) {
      out[safeKey] = v.slice(0, 200).map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? sanitizeMapObject(item, depth + 1)
          : typeof item === 'string'
          ? item.slice(0, 2000)
          : item
      );
    } else if (typeof v === 'object') {
      out[safeKey] = sanitizeMapObject(v, depth + 1);
    }
  }
  return out;
}

function sanitizeBucketPayload(
  uid: string,
  accountKey: string,
  bucketName: BucketName,
  payload: CloudBucketPayload
) {
  const cleanItems = Array.isArray(payload.items)
    ? payload.items
        .filter((x) => x && typeof x === 'object' && !Array.isArray(x))
        .slice(0, 200)
        .map((x) => sanitizeMapObject(x))
    : undefined;
  const cleanSettings =
    payload.settings && typeof payload.settings === 'object' && !Array.isArray(payload.settings)
      ? sanitizeMapObject(payload.settings)
      : undefined;

  const docData: Record<string, unknown> = {
    ownerId: uid,
    accountKey,
    bucketName,
  };
  if (cleanItems !== undefined) docData.items = cleanItems;
  if (cleanSettings !== undefined) docData.settings = cleanSettings;
  return docData;
}

export function isBootstrappedAdminUser(user: User | null): boolean {
  return Boolean(
    user &&
    user.emailVerified &&
    user.email &&
    user.email.trim().toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL
  );
}

export async function checkIsAdmin(user: User): Promise<{ isAdmin: boolean; isBootstrapped: boolean }> {
  const isBootstrapped = isBootstrappedAdminUser(user);
  const path = `admins/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return { isAdmin: snap.exists() || isBootstrapped, isBootstrapped };
  } catch (err) {
    if (isBootstrapped) {
      return { isAdmin: true, isBootstrapped: true };
    }
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function ensureUserRootDocs(user: User): Promise<void> {
  const userPath = `users/${user.uid}`;
  const displayName = (user.displayName || user.email?.split('@')[0] || 'User').slice(0, 80);
  const photoUrl = (user.photoURL || '').slice(0, 2048);

  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        ownerId: user.uid,
        displayName,
        ...(photoUrl ? { photoUrl } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName,
        ...(photoUrl ? { photoUrl } : {}),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }

  if (user.email) {
    const infoPath = `users/${user.uid}/private/info`;
    try {
      const infoRef = doc(db, 'users', user.uid, 'private', 'info');
      const infoSnap = await getDoc(infoRef);
      const email = user.email.slice(0, 200);
      if (!infoSnap.exists()) {
        await setDoc(infoRef, {
          ownerId: user.uid,
          email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(infoRef, {
          email,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, infoPath);
    }
  }
}

export async function syncOnlineProfile(
  user: User,
  meta: HubAccountMeta
): Promise<{ ok: boolean; role: 'user' | 'admin'; usernameKey: string; usernameConflict?: boolean }> {
  if (isExcludedLegacyAccount(meta.username)) {
    return { ok: false, role: 'user', usernameKey: toSafeAccountKey(meta.username) };
  }
  const usernameKey = toSafeAccountKey(meta.username);
  const clean = sanitizeMeta(user.uid, usernameKey, meta);
  const profilePath = `onlineProfiles/${usernameKey}`;
  const adminStatus = await checkIsAdmin(user);
  let isAdmin = adminStatus.isAdmin;

  try {
    const profileRef = doc(db, 'onlineProfiles', usernameKey);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const existingData = profileSnap.data();
      if (existingData.ownerId !== user.uid) {
        return {
          ok: false,
          role: isAdmin ? 'admin' : 'user',
          usernameKey,
          usernameConflict: true,
        };
      }
    }

    if (adminStatus.isBootstrapped) {
      const adminDocPath = `admins/${user.uid}`;
      try {
        const existingAdminSnap = await getDoc(doc(db, 'admins', user.uid));
        if (!existingAdminSnap.exists()) {
          await setDoc(doc(db, 'admins', user.uid), {
            uid: user.uid,
            usernameKey,
            username: clean.username,
            grantedBy: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        isAdmin = true;
      } catch (bootErr) {
        handleFirestoreError(bootErr, OperationType.WRITE, adminDocPath);
      }
    }

    // Check if there is a pending admin invite for this username
    if (!isAdmin) {
      const invitePath = `adminInvites/${usernameKey}`;
      try {
        const inviteSnap = await getDoc(doc(db, 'adminInvites', usernameKey));
        if (inviteSnap.exists()) {
          // Ensure profile exists first so Firestore rules can verify profile ownership
          if (!profileSnap.exists()) {
            await setDoc(profileRef, {
              ownerId: user.uid,
              usernameKey,
              username: clean.username,
              displayName: clean.displayName,
              avatar: clean.avatar,
              role: 'user',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          const inviteData = inviteSnap.data();
          const adminDocPath = `admins/${user.uid}`;
          try {
            await setDoc(doc(db, 'admins', user.uid), {
              uid: user.uid,
              usernameKey,
              username: clean.username,
              grantedBy: String(inviteData.invitedByUid || user.uid).slice(0, 128),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            isAdmin = true;
          } catch (claimErr) {
            handleFirestoreError(claimErr, OperationType.WRITE, adminDocPath);
          }
        }
      } catch (invErr) {
        handleFirestoreError(invErr, OperationType.GET, invitePath);
      }
    }

    const latestSnap = await getDoc(profileRef);
    const targetRole: 'user' | 'admin' = isAdmin ? 'admin' : 'user';
    if (!latestSnap.exists()) {
      await setDoc(profileRef, {
        ownerId: user.uid,
        usernameKey,
        username: clean.username,
        displayName: clean.displayName,
        avatar: clean.avatar,
        role: targetRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const curData = latestSnap.data();
      const updateFields: Record<string, unknown> = {
        username: clean.username,
        displayName: clean.displayName,
        avatar: clean.avatar,
        updatedAt: serverTimestamp(),
      };
      if (isAdmin && curData.role !== 'admin') {
        updateFields.role = 'admin';
      }
      await updateDoc(profileRef, updateFields);
    }

    return { ok: true, role: targetRole, usernameKey };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, profilePath);
  }
}

export async function ensureHubAccountDoc(
  uid: string,
  meta: HubAccountMeta
): Promise<string> {
  if (isExcludedLegacyAccount(meta.username)) {
    return toSafeAccountKey(meta.username);
  }
  const accountKey = toSafeAccountKey(meta.username);
  const path = `users/${uid}/hubAccounts/${accountKey}`;
  const clean = sanitizeMeta(uid, accountKey, meta);

  try {
    const ref = doc(db, 'users', uid, 'hubAccounts', accountKey);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...clean,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        username: clean.username,
        displayName: clean.displayName,
        avatar: clean.avatar,
        theme: clean.theme,
        agentDataPerm: clean.agentDataPerm,
        updatedAt: serverTimestamp(),
      });
    }
    return accountKey;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncSingleBucketToCloud(
  uid: string,
  meta: HubAccountMeta,
  bucketName: BucketName,
  payload: CloudBucketPayload
): Promise<void> {
  if (!VALID_BUCKETS.includes(bucketName) || isExcludedLegacyAccount(meta.username)) return;
  const accountKey = await ensureHubAccountDoc(uid, meta);
  const path = `users/${uid}/hubAccounts/${accountKey}/buckets/${bucketName}`;
  const clean = sanitizeBucketPayload(uid, accountKey, bucketName, payload);

  try {
    const ref = doc(db, 'users', uid, 'hubAccounts', accountKey, 'buckets', bucketName);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...clean,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const updatePayload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (clean.items !== undefined) updatePayload.items = clean.items;
      if (clean.settings !== undefined) updatePayload.settings = clean.settings;
      await updateDoc(ref, updatePayload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncOnlineAccountToCloud(
  user: User,
  input: SyncAccountInput
): Promise<{ accountKey: string; role: 'user' | 'admin'; usernameConflict?: boolean }> {
  if (isExcludedLegacyAccount(input.account?.username)) {
    return { accountKey: toSafeAccountKey(input.account?.username || ''), role: 'user' };
  }
  const accountKey = await ensureHubAccountDoc(user.uid, input.account);
  const buckets = input.buckets || {};
  for (const bName of VALID_BUCKETS) {
    const bData = buckets[bName];
    if (bData) {
      await syncSingleBucketToCloud(user.uid, input.account, bName, bData);
    }
  }
  const profileRes = await syncOnlineProfile(user, input.account);
  return {
    accountKey,
    role: profileRes.role,
    usernameConflict: profileRes.usernameConflict,
  };
}

export async function loadOnlineAccountsFromCloud(
  uid: string
): Promise<LoadedCloudAccount[]> {
  const accListPath = `users/${uid}/hubAccounts`;
  let accDocs;
  try {
    const q = query(
      collection(db, 'users', uid, 'hubAccounts'),
      where('ownerId', '==', uid)
    );
    accDocs = await getDocs(q);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, accListPath);
  }

  let ownerIsAdmin = false;
  try {
    const adminSnap = await getDoc(doc(db, 'admins', uid));
    ownerIsAdmin = adminSnap.exists();
  } catch {}

  const results: LoadedCloudAccount[] = [];
  for (const accSnap of accDocs.docs) {
    const data = accSnap.data();
    const accountKey = accSnap.id;
    const rawUsername = String(data.username || accountKey);
    if (isExcludedLegacyAccount(accountKey) || isExcludedLegacyAccount(rawUsername)) {
      void deleteOnlineAccountFromCloud(uid, accountKey).catch(() => {});
      continue;
    }

    const bucketsPath = `users/${uid}/hubAccounts/${accountKey}/buckets`;
    const buckets: Partial<Record<BucketName, CloudBucketPayload>> = {};

    try {
      const bq = query(
        collection(db, 'users', uid, 'hubAccounts', accountKey, 'buckets'),
        where('ownerId', '==', uid),
        where('accountKey', '==', accountKey)
      );
      const bSnaps = await getDocs(bq);
      for (const bDoc of bSnaps.docs) {
        const bName = bDoc.id as BucketName;
        if (!VALID_BUCKETS.includes(bName)) continue;
        const bData = bDoc.data();
        buckets[bName] = {
          items: Array.isArray(bData.items) ? bData.items : undefined,
          settings:
            bData.settings && typeof bData.settings === 'object'
              ? (bData.settings as Record<string, unknown>)
              : undefined,
        };
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, bucketsPath);
    }

    let profileRole: 'user' | 'admin' = ownerIsAdmin ? 'admin' : 'user';
    try {
      const profSnap = await getDoc(doc(db, 'onlineProfiles', accountKey));
      if (profSnap.exists() && profSnap.data().role === 'admin') {
        profileRole = 'admin';
      }
    } catch {}

    results.push({
      accountKey,
      username: rawUsername,
      displayName: String(data.displayName || rawUsername),
      avatar: String(data.avatar || ''),
      accountType: 'online',
      role: profileRole,
      theme: data.theme === 'dark' ? 'dark' : 'light',
      agentDataPerm: typeof data.agentDataPerm === 'boolean' ? data.agentDataPerm : true,
      buckets,
    });
  }

  return results;
}

export async function deleteOnlineAccountFromCloud(
  uid: string,
  username: string
): Promise<void> {
  const accountKey = toSafeAccountKey(username);
  for (const bName of VALID_BUCKETS) {
    const bPath = `users/${uid}/hubAccounts/${accountKey}/buckets/${bName}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'hubAccounts', accountKey, 'buckets', bName));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, bPath);
    }
  }
  const accPath = `users/${uid}/hubAccounts/${accountKey}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'hubAccounts', accountKey));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, accPath);
  }
  const profilePath = `onlineProfiles/${accountKey}`;
  try {
    const profSnap = await getDoc(doc(db, 'onlineProfiles', accountKey));
    if (profSnap.exists() && profSnap.data().ownerId === uid) {
      await deleteDoc(doc(db, 'onlineProfiles', accountKey));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, profilePath);
  }
}

/* ---------- Admin Console APIs ---------- */

export async function fetchAdminDashboardData(user: User): Promise<AdminDashboardDTO> {
  const status = await checkIsAdmin(user);
  if (!status.isAdmin) {
    return {
      isAdmin: false,
      isBootstrapped: false,
      admins: [],
      invites: [],
      onlineProfiles: [],
      announcement: null,
    };
  }

  let admins: AdminDashboardDTO['admins'] = [];
  let invites: AdminDashboardDTO['invites'] = [];
  let onlineProfiles: OnlineProfileDTO[] = [];
  let announcement: AdminDashboardDTO['announcement'] = null;

  try {
    const aSnaps = await getDocs(collection(db, 'admins'));
    admins = aSnaps.docs.map((d) => {
      const data = d.data();
      return {
        uid: String(data.uid || d.id),
        usernameKey: String(data.usernameKey || ''),
        username: String(data.username || data.usernameKey || d.id),
        grantedBy: String(data.grantedBy || ''),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'admins');
  }

  try {
    const iSnaps = await getDocs(collection(db, 'adminInvites'));
    invites = iSnaps.docs.map((d) => {
      const data = d.data();
      return {
        usernameKey: String(data.usernameKey || d.id),
        targetUsername: String(data.targetUsername || d.id),
        invitedByUid: String(data.invitedByUid || ''),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'adminInvites');
  }

  try {
    const pSnaps = await getDocs(collection(db, 'onlineProfiles'));
    onlineProfiles = pSnaps.docs
      .map((d) => {
        const data = d.data();
        return {
          ownerId: String(data.ownerId || ''),
          usernameKey: String(data.usernameKey || d.id),
          username: String(data.username || d.id),
          displayName: String(data.displayName || data.username || d.id),
          avatar: String(data.avatar || ''),
          role: data.role === 'admin' ? 'admin' : 'user',
        };
      })
      .filter((p) => !isExcludedLegacyAccount(p.usernameKey) && !isExcludedLegacyAccount(p.username));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'onlineProfiles');
  }

  try {
    const annSnap = await getDoc(doc(db, 'systemConfig', 'announcement'));
    if (annSnap.exists()) {
      const data = annSnap.data();
      announcement = {
        message: String(data.message || ''),
        active: Boolean(data.active),
        updatedBy: String(data.updatedBy || 'Admin'),
      };
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'systemConfig/announcement');
  }

  return {
    isAdmin: true,
    isBootstrapped: status.isBootstrapped,
    admins,
    invites,
    onlineProfiles,
    announcement,
  };
}

export async function grantAdminByUsername(
  user: User,
  rawUsername: string
): Promise<{ status: 'promoted' | 'invited'; usernameKey: string; username: string }> {
  const cleanName = String(rawUsername || '').trim().replace(/^@/, '');
  const usernameKey = toSafeAccountKey(cleanName);
  if (cleanName.length < 2) {
    throw new Error('Enter a valid username (at least 2 characters).');
  }

  const profilePath = `onlineProfiles/${usernameKey}`;
  let profSnap;
  try {
    profSnap = await getDoc(doc(db, 'onlineProfiles', usernameKey));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, profilePath);
  }

  if (profSnap.exists()) {
    const pData = profSnap.data();
    const targetUid = String(pData.ownerId || '');
    const targetUsername = String(pData.username || cleanName).slice(0, 40);
    const adminPath = `admins/${targetUid}`;
    try {
      const existingAdmin = await getDoc(doc(db, 'admins', targetUid));
      if (!existingAdmin.exists()) {
        await setDoc(doc(db, 'admins', targetUid), {
          uid: targetUid,
          usernameKey,
          username: targetUsername,
          grantedBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'admins', targetUid), {
          usernameKey,
          username: targetUsername,
          grantedBy: user.uid,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, adminPath);
    }

    try {
      await updateDoc(doc(db, 'onlineProfiles', usernameKey), {
        role: 'admin',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, profilePath);
    }

    return { status: 'promoted', usernameKey, username: targetUsername };
  }

  // Friend hasn't registered yet: save pre-approved invite for their username!
  const invitePath = `adminInvites/${usernameKey}`;
  try {
    const invSnap = await getDoc(doc(db, 'adminInvites', usernameKey));
    if (!invSnap.exists()) {
      await setDoc(doc(db, 'adminInvites', usernameKey), {
        usernameKey,
        targetUsername: cleanName.slice(0, 40),
        invitedByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'adminInvites', usernameKey), {
        targetUsername: cleanName.slice(0, 40),
        invitedByUid: user.uid,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, invitePath);
  }

  return { status: 'invited', usernameKey, username: cleanName };
}

export async function revokeAdminAccess(
  _user: User,
  targetUid: string,
  usernameKey?: string
): Promise<void> {
  if (targetUid) {
    try {
      await deleteDoc(doc(db, 'admins', targetUid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `admins/${targetUid}`);
    }
  }
  if (usernameKey) {
    const safeKey = toSafeAccountKey(usernameKey);
    try {
      await deleteDoc(doc(db, 'adminInvites', safeKey));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `adminInvites/${safeKey}`);
    }
    try {
      const pSnap = await getDoc(doc(db, 'onlineProfiles', safeKey));
      if (pSnap.exists() && pSnap.data().role === 'admin') {
        await updateDoc(doc(db, 'onlineProfiles', safeKey), {
          role: 'user',
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `onlineProfiles/${safeKey}`);
    }
  }
}

export async function publishSystemAnnouncement(
  updatedBy: string,
  message: string,
  active: boolean
): Promise<void> {
  const path = 'systemConfig/announcement';
  const cleanMsg = String(message || '').trim().slice(0, 500);
  const cleanUpdater = String(updatedBy || 'Admin').trim().slice(0, 80) || 'Admin';
  try {
    const ref = doc(db, 'systemConfig', 'announcement');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        message: cleanMsg,
        updatedBy: cleanUpdater,
        active: Boolean(active && cleanMsg.length > 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        message: cleanMsg,
        updatedBy: cleanUpdater,
        active: Boolean(active && cleanMsg.length > 0),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeAnnouncement(
  onUpdate: (ann: { message: string; active: boolean; updatedBy: string } | null) => void
): Unsubscribe {
  const path = 'systemConfig/announcement';
  return onSnapshot(
    doc(db, 'systemConfig', 'announcement'),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const d = snap.data();
      onUpdate({
        message: String(d.message || ''),
        active: Boolean(d.active),
        updatedBy: String(d.updatedBy || 'Admin'),
      });
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

/* ---------- Friends & Real-Time Messaging APIs ---------- */

function buildMiniProfile(
  username: string,
  displayName: string,
  avatar: string,
  role: 'user' | 'admin'
): ParticipantMiniProfile {
  const usernameKey = toSafeAccountKey(username);
  return {
    username: String(username || usernameKey).slice(0, 40),
    usernameKey,
    displayName: String(displayName || username || usernameKey).slice(0, 60),
    avatar: String(avatar || '').slice(0, 2048),
    role: role === 'admin' ? 'admin' : 'user',
  };
}

export function subscribeFriendships(
  uid: string,
  onUpdate: (list: FriendshipDTO[]) => void
): Unsubscribe {
  const q = query(collection(db, 'friendships'), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snaps) => {
      const items: FriendshipDTO[] = snaps.docs.map((d) => {
        const data = d.data();
        return {
          pairId: String(data.pairId || d.id),
          participants: Array.isArray(data.participants) ? data.participants.map(String) : [],
          requesterId: String(data.requesterId || ''),
          status: data.status === 'accepted' ? 'accepted' : 'pending',
          profiles: (data.profiles && typeof data.profiles === 'object' ? data.profiles : {}) as Record<
            string,
            ParticipantMiniProfile
          >,
          updatedAtMs: timestampToMs(data.updatedAt) || timestampToMs(data.createdAt),
        };
      });
      items.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'friendships');
    }
  );
}

export async function addFriendByUsername(
  user: User,
  myMeta: HubAccountMeta,
  myRole: 'user' | 'admin',
  targetUsernameRaw: string
): Promise<{ status: 'requested' | 'already_friends' | 'already_pending' | 'accepted'; friend: OnlineProfileDTO }> {
  const cleanTarget = String(targetUsernameRaw || '').trim().replace(/^@/, '');
  const targetKey = toSafeAccountKey(cleanTarget);
  if (cleanTarget.length < 2) {
    throw new Error('Please enter a friend username (at least 2 characters).');
  }
  const myKey = toSafeAccountKey(myMeta.username);
  if (targetKey === myKey) {
    throw new Error('You cannot add your own username as a friend.');
  }

  let targetSnap;
  try {
    targetSnap = await getDoc(doc(db, 'onlineProfiles', targetKey));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `onlineProfiles/${targetKey}`);
  }

  if (!targetSnap.exists()) {
    throw new Error(`No Online Account found with username "@${cleanTarget}". Make sure your friend has created an Online Account and signed into cloud.`);
  }

  const tData = targetSnap.data();
  const friendProfile: OnlineProfileDTO = {
    ownerId: String(tData.ownerId || ''),
    usernameKey: String(tData.usernameKey || targetKey),
    username: String(tData.username || cleanTarget),
    displayName: String(tData.displayName || tData.username || cleanTarget),
    avatar: String(tData.avatar || ''),
    role: tData.role === 'admin' ? 'admin' : 'user',
  };

  if (friendProfile.ownerId === user.uid) {
    throw new Error(`"@${friendProfile.username}" is on your own Google Cloud session. Have your friend sign in on their own Google account/device to message between accounts!`);
  }

  const { pairId, participants } = makeSortedPair(user.uid, friendProfile.ownerId);
  const fPath = `friendships/${pairId}`;

  let existingSnap;
  try {
    existingSnap = await getDoc(doc(db, 'friendships', pairId));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, fPath);
  }

  if (existingSnap.exists()) {
    const eData = existingSnap.data();
    if (eData.status === 'accepted') {
      return { status: 'already_friends', friend: friendProfile };
    }
    if (eData.requesterId !== user.uid) {
      // Mutual add: accept their pending request right away!
      try {
        await updateDoc(doc(db, 'friendships', pairId), {
          status: 'accepted',
          updatedAt: serverTimestamp(),
        });
        return { status: 'accepted', friend: friendProfile };
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, fPath);
      }
    }
    return { status: 'already_pending', friend: friendProfile };
  }

  const myMini = buildMiniProfile(
    myMeta.username,
    myMeta.displayName || myMeta.username,
    myMeta.avatar || '',
    myRole
  );
  const friendMini = buildMiniProfile(
    friendProfile.username,
    friendProfile.displayName,
    friendProfile.avatar,
    friendProfile.role
  );

  try {
    await setDoc(doc(db, 'friendships', pairId), {
      pairId,
      participants,
      requesterId: user.uid,
      status: 'pending',
      profiles: {
        [user.uid]: myMini,
        [friendProfile.ownerId]: friendMini,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, fPath);
  }

  return { status: 'requested', friend: friendProfile };
}

export async function acceptFriendRequest(pairId: string): Promise<void> {
  const path = `friendships/${pairId}`;
  try {
    await updateDoc(doc(db, 'friendships', pairId), {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function removeFriendship(pairId: string): Promise<void> {
  const path = `friendships/${pairId}`;
  try {
    await deleteDoc(doc(db, 'friendships', pairId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeChats(
  uid: string,
  onUpdate: (chats: ChatThreadDTO[]) => void
): Unsubscribe {
  const q = query(collection(db, 'chats'), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snaps) => {
      const threads: ChatThreadDTO[] = snaps.docs.map((d) => {
        const data = d.data();
        return {
          chatId: String(data.chatId || d.id),
          participants: Array.isArray(data.participants) ? data.participants.map(String) : [],
          profiles: (data.profiles && typeof data.profiles === 'object' ? data.profiles : {}) as Record<
            string,
            ParticipantMiniProfile
          >,
          lastMessageText: String(data.lastMessageText || ''),
          lastMessageSenderId: String(data.lastMessageSenderId || ''),
          lastMessageAtMs: timestampToMs(data.lastMessageAt),
          updatedAtMs: timestampToMs(data.updatedAt) || timestampToMs(data.createdAt),
        };
      });
      threads.sort((a, b) => (b.lastMessageAtMs || b.updatedAtMs) - (a.lastMessageAtMs || a.updatedAtMs));
      onUpdate(threads);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'chats');
    }
  );
}

export async function ensureChatThread(
  user: User,
  myMeta: HubAccountMeta,
  myRole: 'user' | 'admin',
  friendUid: string,
  friendProfile: ParticipantMiniProfile
): Promise<string> {
  const { pairId: chatId, participants } = makeSortedPair(user.uid, friendUid);
  const path = `chats/${chatId}`;
  const myMini = buildMiniProfile(
    myMeta.username,
    myMeta.displayName || myMeta.username,
    myMeta.avatar || '',
    myRole
  );
  const friendMini = buildMiniProfile(
    friendProfile.username,
    friendProfile.displayName,
    friendProfile.avatar,
    friendProfile.role
  );

  try {
    const ref = doc(db, 'chats', chatId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        chatId,
        participants,
        profiles: {
          [user.uid]: myMini,
          [friendUid]: friendMini,
        },
        lastMessageText: '',
        lastMessageSenderId: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return chatId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeChatMessages(
  uid: string,
  chatId: string,
  onUpdate: (messages: ChatMessageDTO[]) => void
): Unsubscribe {
  const path = `chats/${chatId}/messages`;
  const q = query(collection(db, 'chats', chatId, 'messages'), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snaps) => {
      const msgs: ChatMessageDTO[] = snaps.docs.map((d) => {
        const data = d.data();
        return {
          messageId: String(data.messageId || d.id),
          chatId: String(data.chatId || chatId),
          participants: Array.isArray(data.participants) ? data.participants.map(String) : [],
          senderId: String(data.senderId || ''),
          senderUsername: String(data.senderUsername || ''),
          senderDisplayName: String(data.senderDisplayName || ''),
          text: String(data.text || ''),
          createdAtMs: timestampToMs(data.createdAt),
        };
      });
      msgs.sort((a, b) => a.createdAtMs - b.createdAtMs);
      onUpdate(msgs);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export async function sendChatMessage(
  user: User,
  myMeta: HubAccountMeta,
  myRole: 'user' | 'admin',
  friendUid: string,
  friendProfile: ParticipantMiniProfile,
  rawText: string
): Promise<void> {
  const text = String(rawText || '').trim().slice(0, 2000);
  if (!text) return;

  const chatId = await ensureChatThread(user, myMeta, myRole, friendUid, friendProfile);
  const { participants } = makeSortedPair(user.uid, friendUid);
  const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const msgPath = `chats/${chatId}/messages/${messageId}`;
  const senderUsername = (myMeta.username || 'user').trim().slice(0, 40);
  const senderDisplayName = (myMeta.displayName || senderUsername).trim().slice(0, 60);

  try {
    await setDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      messageId,
      chatId,
      participants,
      senderId: user.uid,
      senderUsername: senderUsername.length >= 2 ? senderUsername : 'user',
      senderDisplayName: senderDisplayName || 'User',
      text,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, msgPath);
  }

  try {
    await updateDoc(doc(db, 'chats', chatId), {
      profiles: {
        [user.uid]: buildMiniProfile(
          myMeta.username,
          myMeta.displayName || myMeta.username,
          myMeta.avatar || '',
          myRole
        ),
        [friendUid]: buildMiniProfile(
          friendProfile.username,
          friendProfile.displayName,
          friendProfile.avatar,
          friendProfile.role
        ),
      },
      lastMessageText: text.slice(0, 500),
      lastMessageSenderId: user.uid,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
  }
}
