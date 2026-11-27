import type { RealtimeChannel } from '@supabase/supabase-js';
import { ensureSupabaseReady, supabase } from './supabaseClient';

export const VALID_BUCKETS = [
  'customApps',
  'notes',
  'stocks',
  'meditation',
  'shortcuts',
  'appPrivacy',
  'calculator',
  'nutritrack',
  'storeAppData',
] as const;

export type BucketName = (typeof VALID_BUCKETS)[number];
export type AccountModerationStatus = 'active' | 'suspended' | 'banned';
export type OnlineAppStatus = 'pending' | 'approved' | 'rejected' | 'disabled';
export type OnlineAppSourceMode = 'html' | 'bundle' | 'link';
export type OnlineAppDataStorageMode = 'self' | 'hub_supabase';

export interface CloudBucketPayload {
  items?: Record<string, unknown>[];
  settings?: Record<string, unknown>;
}

export interface HubAccountMeta {
  username: string;
  displayName?: string;
  avatar?: string;
  accountType?: string;
  theme?: string;
  agentDataPerm?: boolean;
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

export interface LoadedCloudAccount {
  accountKey: string;
  username: string;
  displayName: string;
  avatar: string;
  accountType: 'online';
  role?: 'user' | 'admin';
  theme: 'light' | 'dark';
  agentDataPerm: boolean;
  moderationStatus: AccountModerationStatus;
  banMessage: string;
  suspendedUntilMs: number;
  buckets: Partial<Record<BucketName, CloudBucketPayload>>;
}

export interface AdminDirectoryAccountDTO {
  ownerId: string;
  usernameKey: string;
  username: string;
  displayName: string;
  avatar: string;
  role: 'user' | 'admin';
  moderationStatus: AccountModerationStatus;
  banMessage: string;
  suspendedUntilMs: number;
}

export type OnlineAppReportStatus = 'open' | 'dismissed' | 'removed';
export type OnlineAppModerationState = 'active' | 'warned' | 'suspended' | 'banned';
export type OnlineAppAppealTargetType = 'warning' | 'suspension' | 'ban';
export type OnlineAppAppealStatus = 'pending' | 'accepted' | 'denied' | 'convo_requested';

export interface OnlineAppReportDTO {
  reportId: string;
  appId: string;
  reporterKey: string;
  reporterUsername: string;
  reporterDisplayName: string;
  reason: string;
  details: string;
  status: OnlineAppReportStatus;
  createdAtMs: number;
  resolvedAtMs: number;
  resolvedBy: string;
  resolutionNote: string;
}

export interface OnlineAppAppealDTO {
  appealId: string;
  appId: string;
  targetType: OnlineAppAppealTargetType;
  appellantKey: string;
  appellantUsername: string;
  appellantDisplayName: string;
  message: string;
  status: OnlineAppAppealStatus;
  createdAtMs: number;
  adminResponse: string;
  respondedAtMs: number;
  respondedBy: string;
  convoRequested: boolean;
  convoRequestedBy: string;
  convoRequestedByDisplayName: string;
  convoRequestedAtMs: number;
  convoPairId: string;
}

export interface OnlineAppPendingUpdateDTO {
  name: string;
  description: string;
  about: string;
  icon: string;
  sourceMode: OnlineAppSourceMode;
  appUrl: string;
  dataStorageMode: OnlineAppDataStorageMode;
  code: string;
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  submittedAtMs: number;
}

export interface OnlineAppDTO {
  appId: string;
  name: string;
  description: string;
  about: string;
  icon: string;
  authorUid: string;
  authorUsername: string;
  authorUsernameKey: string;
  authorDisplayName: string;
  sourceMode: OnlineAppSourceMode;
  appUrl: string;
  dataStorageMode: OnlineAppDataStorageMode;
  storageBytes: number;
  code: string;
  htmlCode: string;
  cssCode: string;
  jsCode: string;
  status: OnlineAppStatus;
  version: number;
  adminNote: string;
  reviewedByUid: string;
  hasPendingUpdate: boolean;
  pendingUpdate: OnlineAppPendingUpdateDTO | null;
  reports: OnlineAppReportDTO[];
  openReportsCount: number;
  removedByAdmin: boolean;
  removedReason: string;
  removedAtMs: number;
  removedBy: string;
  moderationState: OnlineAppModerationState;
  warningMessage: string;
  warnedAtMs: number;
  warnedBy: string;
  suspendedUntilMs: number;
  suspensionReason: string;
  suspendedAtMs: number;
  suspendedBy: string;
  appeals: OnlineAppAppealDTO[];
  pendingAppealsCount: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface SubmitOnlineAppInput {
  name: string;
  description?: string;
  about?: string;
  icon?: string;
  sourceMode: OnlineAppSourceMode;
  appUrl?: string;
  dataStorageMode?: OnlineAppDataStorageMode;
  code?: string;
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
}

export interface ReviewOnlineAppInput {
  appId: string;
  action?: 'approve' | 'reject' | 'disable' | 'enable' | 'remove';
  status?: 'approved' | 'rejected' | 'disabled';
  adminNote?: string;
}

export interface ReportOnlineAppInput {
  appId: string;
  reason: string;
  details?: string;
}

export interface ResolveOnlineAppReportInput {
  appId: string;
  reportId?: string;
  decision: 'dismiss' | 'remove_app';
  adminNote?: string;
}

export interface ModerateOnlineAppInput {
  appId: string;
  action: 'warn' | 'suspend' | 'ban' | 'clear';
  reason?: string;
  suspendedUntilMs?: number;
}

export interface SubmitOnlineAppAppealInput {
  appId: string;
  targetType: OnlineAppAppealTargetType;
  message: string;
}

export interface ResolveOnlineAppAppealInput {
  appId: string;
  appealId: string;
  decision: 'accept' | 'deny' | 'request_convo';
  adminResponse?: string;
  adminAccount?: HubAccountMeta;
}

export interface UpdateOnlineAppInput {
  appId: string;
  name?: string;
  description?: string;
  about?: string;
  icon?: string;
  sourceMode?: OnlineAppSourceMode;
  appUrl?: string;
  dataStorageMode?: OnlineAppDataStorageMode;
  code?: string;
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
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

export function makeSortedPair(
  uid1: string,
  uid2: string
): { pairId: string; participants: [string, string] } {
  const participants: [string, string] = uid1 < uid2 ? [uid1, uid2] : [uid2, uid1];
  return {
    pairId: `${participants[0]}__${participants[1]}`,
    participants,
  };
}

export interface SupabaseSchemaStatus {
  tablesReady: boolean;
  error?: string;
}

interface HubAccountRow {
  username_key: string;
  username: string;
  display_name: string;
  avatar: string;
  password_hash: string;
  role: 'user' | 'admin';
  theme: 'light' | 'dark';
  agent_data_perm: boolean;
  moderation_status?: AccountModerationStatus;
  ban_message?: string;
  suspended_until_ms?: number | string | null;
  buckets: Partial<Record<BucketName, CloudBucketPayload>> | null;
  created_at: string;
  updated_at: string;
}

interface HubFriendshipRow {
  pair_id: string;
  user_a: string;
  user_b: string;
  requester_key: string;
  status: 'pending' | 'accepted';
  profiles: Record<string, ParticipantMiniProfile> | null;
  created_at: string;
  updated_at: string;
}

interface HubMessageRow {
  id: string;
  chat_id: string;
  sender_key: string;
  recipient_key: string;
  sender_username: string;
  sender_display_name: string;
  text: string;
  created_at: string;
}

interface OnlineAppLiveMeta {
  about?: string;
  appUrl?: string;
  dataStorageMode?: OnlineAppDataStorageMode;
  sourceMode?: OnlineAppSourceMode;
  reports?: OnlineAppReportDTO[];
  removedByAdmin?: boolean;
  removedReason?: string;
  removedAtMs?: number;
  removedBy?: string;
  moderationState?: OnlineAppModerationState;
  warningMessage?: string;
  warnedAtMs?: number;
  warnedBy?: string;
  suspendedUntilMs?: number;
  suspensionReason?: string;
  suspendedAtMs?: number;
  suspendedBy?: string;
  appeals?: OnlineAppAppealDTO[];
}

interface HubOnlineAppRow {
  app_id: string;
  name: string;
  description: string;
  about?: string;
  icon: string;
  author_uid: string;
  author_username: string;
  author_username_key: string;
  author_display_name: string;
  source_mode: 'html' | 'bundle' | 'link';
  app_url?: string;
  data_storage_mode?: OnlineAppDataStorageMode;
  code: string;
  html_code: string;
  css_code: string;
  js_code: string;
  status: OnlineAppStatus;
  version: number;
  admin_note: string;
  reviewed_by_uid: string;
  has_pending_update: boolean;
  pending_update: (OnlineAppPendingUpdateDTO & { _liveMeta?: OnlineAppLiveMeta }) | { _liveMeta?: OnlineAppLiveMeta } | Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

function isMissingTableError(
  err: { code?: string; message?: string; status?: number } | null | undefined
): boolean {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  const code = String(err.code || '').toUpperCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    err.status === 404 ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

function isMissingColumnError(
  err: { code?: string; message?: string } | null | undefined
): boolean {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  const code = String(err.code || '').toUpperCase();
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    (msg.includes('column') && msg.includes('does not exist'))
  );
}

function toMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function resolveRowModeration(row?: Partial<HubAccountRow> | null): {
  moderationStatus: AccountModerationStatus;
  banMessage: string;
  suspendedUntilMs: number;
} {
  if (!row) {
    return { moderationStatus: 'active', banMessage: '', suspendedUntilMs: 0 };
  }
  const rawStatus = String(row.moderation_status || 'active');
  const banMessage = String(row.ban_message || '').slice(0, 400);
  const rawUntil = Number(row.suspended_until_ms || 0);
  const suspendedUntilMs = Number.isFinite(rawUntil) ? rawUntil : 0;
  if (rawStatus === 'banned') {
    return { moderationStatus: 'banned', banMessage, suspendedUntilMs: 0 };
  }
  if (rawStatus === 'suspended') {
    if (suspendedUntilMs > Date.now()) {
      return { moderationStatus: 'suspended', banMessage, suspendedUntilMs };
    }
    return { moderationStatus: 'active', banMessage: '', suspendedUntilMs: 0 };
  }
  return { moderationStatus: 'active', banMessage: '', suspendedUntilMs: 0 };
}

export async function hashAccountPassword(usernameKey: string, password: string): Promise<string> {
  const raw = `apphub_v1:${usernameKey}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return raw;
}

function sanitizeAccountPayload(meta: HubAccountMeta) {
  const usernameKey = toSafeAccountKey(meta.username);
  const rawUser = String(meta.username || usernameKey).trim();
  const username = (rawUser.length >= 2 ? rawUser : usernameKey).slice(0, 40);
  const rawDisplay = String(meta.displayName || username).trim();
  const displayName = (rawDisplay.length >= 1 ? rawDisplay : username).slice(0, 60);
  const rawAvatar = String(meta.avatar || '');
  const avatar = rawAvatar.startsWith('data:image/')
    ? rawAvatar.slice(0, 8192)
    : rawAvatar.slice(0, 32);
  const theme: 'light' | 'dark' = meta.theme === 'dark' ? 'dark' : 'light';
  const agentDataPerm = typeof meta.agentDataPerm === 'boolean' ? meta.agentDataPerm : true;
  return { usernameKey, username, displayName, avatar, theme, agentDataPerm };
}

function stripOversizedDataUrls(value: unknown, depth = 0): unknown {
  if (depth > 6) return value;
  if (typeof value === 'string') {
    if (value.startsWith('data:image/') && value.length > 8192) return '';
    return value.length > 60000 ? value.slice(0, 60000) : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 200).map((item) => stripOversizedDataUrls(item, depth + 1));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = stripOversizedDataUrls(v, depth + 1);
    }
    return out;
  }
  return value;
}

function compactCustomAppItems(items: Record<string, unknown>[]): Record<string, unknown>[] {
  return items.slice(0, 200).map((item) => {
    if (item && typeof item === 'object' && item.isStoreApp === true && item.storeAppId) {
      // Never duplicate full Apps Store source code inside each user's hub_accounts.buckets row
      const { code: _c, html: _h, css: _s, js: _j, ...rest } = item;
      void _c;
      void _h;
      void _s;
      void _j;
      return stripOversizedDataUrls(rest) as Record<string, unknown>;
    }
    return stripOversizedDataUrls(item) as Record<string, unknown>;
  });
}

function cleanBucketsMap(
  buckets?: Partial<Record<BucketName, CloudBucketPayload>>
): Partial<Record<BucketName, CloudBucketPayload>> {
  const clean: Partial<Record<BucketName, CloudBucketPayload>> = {};
  if (!buckets || typeof buckets !== 'object') return clean;
  for (const name of VALID_BUCKETS) {
    const b = buckets[name];
    if (b && typeof b === 'object') {
      const cleanedItems = Array.isArray(b.items)
        ? name === 'customApps'
          ? compactCustomAppItems(b.items)
          : (stripOversizedDataUrls(b.items.slice(0, 200)) as Record<string, unknown>[])
        : undefined;
      clean[name] = {
        ...(cleanedItems ? { items: cleanedItems } : {}),
        ...(b.settings && typeof b.settings === 'object'
          ? { settings: stripOversizedDataUrls(b.settings) as Record<string, unknown> }
          : {}),
      };
    }
  }
  return clean;
}

export async function checkSupabaseTablesReady(): Promise<SupabaseSchemaStatus> {
  await ensureSupabaseReady();
  const { error } = await supabase.from('hub_accounts').select('username_key').limit(1);
  if (error) {
    if (isMissingTableError(error)) {
      return { tablesReady: false };
    }
    return { tablesReady: false, error: error.message };
  }
  return { tablesReady: true };
}

export async function registerOnlineAccountInSupabase(
  meta: HubAccountMeta,
  password: string,
  buckets?: Partial<Record<BucketName, CloudBucketPayload>>
): Promise<{ ok: boolean; tablesReady: boolean; conflict?: boolean; error?: string }> {
  await ensureSupabaseReady();
  const clean = sanitizeAccountPayload(meta);
  const { data: existing, error: readErr } = await supabase
    .from('hub_accounts')
    .select('username_key')
    .eq('username_key', clean.usernameKey)
    .maybeSingle();

  if (readErr) {
    if (isMissingTableError(readErr)) return { ok: false, tablesReady: false };
    return { ok: false, tablesReady: true, error: readErr.message };
  }

  if (existing) {
    return {
      ok: false,
      tablesReady: true,
      conflict: true,
      error: 'An Online Account with this username already exists.',
    };
  }

  const passwordHash = await hashAccountPassword(clean.usernameKey, password);
  const { error: insertErr } = await supabase.from('hub_accounts').insert({
    username_key: clean.usernameKey,
    username: clean.username,
    display_name: clean.displayName,
    avatar: clean.avatar,
    password_hash: passwordHash,
    role: 'user',
    theme: clean.theme,
    agent_data_perm: clean.agentDataPerm,
    buckets: cleanBucketsMap(buckets),
  });

  if (insertErr) {
    if (isMissingTableError(insertErr)) return { ok: false, tablesReady: false };
    return { ok: false, tablesReady: true, error: insertErr.message };
  }

  return { ok: true, tablesReady: true };
}

export async function loginOnlineAccountFromSupabase(
  username: string,
  password: string
): Promise<{
  ok: boolean;
  tablesReady: boolean;
  notFound?: boolean;
  wrongPassword?: boolean;
  blocked?: boolean;
  cloudVerified?: boolean;
  account?: LoadedCloudAccount;
  error?: string;
}> {
  await ensureSupabaseReady();
  const usernameKey = toSafeAccountKey(username);
  const { data, error } = await supabase
    .from('hub_accounts')
    .select('*')
    .eq('username_key', usernameKey)
    .maybeSingle<HubAccountRow>();

  if (error) {
    if (isMissingTableError(error)) return { ok: false, tablesReady: false };
    return { ok: false, tablesReady: true, error: error.message };
  }

  if (!data) {
    return { ok: false, tablesReady: true, notFound: true };
  }

  const passwordHash = await hashAccountPassword(usernameKey, password);
  if (data.password_hash && data.password_hash !== passwordHash) {
    return {
      ok: false,
      tablesReady: true,
      wrongPassword: true,
      error: 'Incorrect password. Please try again.',
    };
  }

  const mod = resolveRowModeration(data);
  if (
    mod.moderationStatus === 'banned' ||
    (mod.moderationStatus === 'suspended' && mod.suspendedUntilMs > Date.now())
  ) {
    return {
      ok: false,
      tablesReady: true,
      blocked: true,
      error:
        mod.moderationStatus === 'banned'
          ? mod.banMessage || 'This account has been banned by an administrator.'
          : mod.banMessage || 'This account is temporarily suspended by an administrator.',
    };
  }

  return {
    ok: true,
    tablesReady: true,
    cloudVerified: true,
    account: {
      accountKey: data.username_key,
      username: data.username,
      displayName: data.display_name || data.username,
      avatar: data.avatar || '',
      accountType: 'online',
      role: data.role === 'admin' ? 'admin' : 'user',
      theme: data.theme === 'dark' ? 'dark' : 'light',
      agentDataPerm: typeof data.agent_data_perm === 'boolean' ? data.agent_data_perm : true,
      moderationStatus: mod.moderationStatus,
      banMessage: mod.banMessage,
      suspendedUntilMs: mod.suspendedUntilMs,
      buckets: data.buckets || {},
    },
  };
}

export async function fetchAccountRoleFromSupabase(usernameKey: string): Promise<'user' | 'admin'> {
  if (!usernameKey) return 'user';
  const { data, error } = await supabase
    .from('hub_accounts')
    .select('role')
    .eq('username_key', usernameKey)
    .maybeSingle<Pick<HubAccountRow, 'role'>>();
  if (error || !data) return 'user';
  return data.role === 'admin' ? 'admin' : 'user';
}

export async function fetchAdminDirectoryFromSupabase(callerKey: string): Promise<{
  isAdmin: boolean;
  isBootstrapped: boolean;
  accounts: AdminDirectoryAccountDTO[];
  onlineProfiles: AdminDirectoryAccountDTO[];
}> {
  const callerRole = await fetchAccountRoleFromSupabase(callerKey);
  if (callerRole !== 'admin') {
    throw new Error('Admin access required.');
  }
  const { data, error } = await supabase
    .from('hub_accounts')
    .select('username_key, username, display_name, avatar, role, moderation_status, ban_message, suspended_until_ms')
    .order('created_at', { ascending: true })
    .limit(250);
  if (error) throw new Error(error.message);

  const accounts: AdminDirectoryAccountDTO[] = ((data as HubAccountRow[] | null) || []).map((row) => {
    const mod = resolveRowModeration(row);
    return {
      ownerId: row.username_key,
      usernameKey: row.username_key,
      username: row.username,
      displayName: row.display_name || row.username,
      avatar: row.avatar || '',
      role: (row.role === 'admin' ? 'admin' : 'user') as 'user' | 'admin',
      moderationStatus: mod.moderationStatus,
      banMessage: mod.banMessage,
      suspendedUntilMs: mod.suspendedUntilMs,
    };
  });
  return { isAdmin: true, isBootstrapped: false, accounts, onlineProfiles: accounts };
}

export async function setAccountRoleInSupabase(
  callerKey: string,
  targetUsernameRaw: string,
  role: 'user' | 'admin'
): Promise<{
  targetUsername: string;
  role: 'user' | 'admin';
  accounts: AdminDirectoryAccountDTO[];
}> {
  const callerRole = await fetchAccountRoleFromSupabase(callerKey);
  if (callerRole !== 'admin') {
    throw new Error('Admin access required.');
  }
  const cleanTarget = String(targetUsernameRaw || '').trim().replace(/^@/, '');
  const targetKey = toSafeAccountKey(cleanTarget);
  if (cleanTarget.length < 2) {
    throw new Error('Enter a valid @username.');
  }
  const { data: targetRow, error: readErr } = await supabase
    .from('hub_accounts')
    .select('username_key, username')
    .eq('username_key', targetKey)
    .maybeSingle<Pick<HubAccountRow, 'username_key' | 'username'>>();
  if (readErr) throw new Error(readErr.message);
  if (!targetRow) {
    throw new Error(`No Online Account found for "@${cleanTarget}".`);
  }
  const { error: updErr } = await supabase
    .from('hub_accounts')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('username_key', targetKey);
  if (updErr) throw new Error(updErr.message);

  const dir = await fetchAdminDirectoryFromSupabase(callerKey);
  return { targetUsername: targetRow.username, role, accounts: dir.accounts };
}

export async function setAccountModerationStatusInSupabase(
  callerKey: string,
  params: {
    usernameKey: string;
    moderationStatus: AccountModerationStatus;
    banMessage?: string;
    suspendedUntilMs?: number;
  }
): Promise<{
  moderationStatus: AccountModerationStatus;
  accounts: AdminDirectoryAccountDTO[];
}> {
  const callerRole = await fetchAccountRoleFromSupabase(callerKey);
  if (callerRole !== 'admin') {
    throw new Error('Admin access required.');
  }
  const safeKey = toSafeAccountKey(params.usernameKey);
  if (!safeKey) throw new Error('Missing account username.');
  if (safeKey === callerKey && params.moderationStatus !== 'active') {
    throw new Error('You cannot ban or suspend your own admin account.');
  }

  const cleanMsg = String(params.banMessage || '').trim().slice(0, 400);
  const untilMs =
    params.moderationStatus === 'suspended' &&
    typeof params.suspendedUntilMs === 'number' &&
    Number.isFinite(params.suspendedUntilMs)
      ? Math.max(0, Math.round(params.suspendedUntilMs))
      : 0;

  const { error } = await supabase
    .from('hub_accounts')
    .update({
      moderation_status: params.moderationStatus,
      ban_message: params.moderationStatus === 'active' ? '' : cleanMsg,
      suspended_until_ms: params.moderationStatus === 'suspended' ? untilMs : 0,
      updated_at: new Date().toISOString(),
    })
    .eq('username_key', safeKey);

  if (error) {
    if (isMissingColumnError(error)) {
      throw new Error('Moderation columns not added yet. Run supabase_schema.sql in Supabase SQL Editor.');
    }
    throw new Error(error.message);
  }

  const dir = await fetchAdminDirectoryFromSupabase(callerKey);
  return { moderationStatus: params.moderationStatus, accounts: dir.accounts };
}

export async function adminDeleteOnlineAccountInSupabase(
  callerKey: string,
  usernameKey: string
): Promise<AdminDirectoryAccountDTO[]> {
  const callerRole = await fetchAccountRoleFromSupabase(callerKey);
  if (callerRole !== 'admin') {
    throw new Error('Admin access required.');
  }
  const safeKey = toSafeAccountKey(usernameKey);
  if (!safeKey) throw new Error('Missing account username.');
  if (safeKey === callerKey) {
    throw new Error('Cannot delete your own active admin account from directory.');
  }
  const { error } = await supabase.from('hub_accounts').delete().eq('username_key', safeKey);
  if (error) throw new Error(error.message);
  const dir = await fetchAdminDirectoryFromSupabase(callerKey);
  return dir.accounts;
}

export async function syncOnlineAccountToSupabase(
  meta: HubAccountMeta,
  buckets: Partial<Record<BucketName, CloudBucketPayload>>,
  password?: string
): Promise<{ ok: boolean; tablesReady: boolean; role?: 'user' | 'admin'; error?: string }> {
  await ensureSupabaseReady();
  const clean = sanitizeAccountPayload(meta);
  const { data: existing, error: readErr } = await supabase
    .from('hub_accounts')
    .select('username_key, password_hash, role, buckets')
    .eq('username_key', clean.usernameKey)
    .maybeSingle<Pick<HubAccountRow, 'username_key' | 'password_hash' | 'role' | 'buckets'>>();

  if (readErr) {
    if (isMissingTableError(readErr)) return { ok: false, tablesReady: false };
    return { ok: false, tablesReady: true, error: readErr.message };
  }

  const mergedBuckets = {
    ...(existing?.buckets || {}),
    ...cleanBucketsMap(buckets),
  };

  if (!existing) {
    const passwordHash = password
      ? await hashAccountPassword(clean.usernameKey, password)
      : await hashAccountPassword(clean.usernameKey, 'sync_default');
    const { error: insertErr } = await supabase.from('hub_accounts').insert({
      username_key: clean.usernameKey,
      username: clean.username,
      display_name: clean.displayName,
      avatar: clean.avatar,
      password_hash: passwordHash,
      role: 'user',
      theme: clean.theme,
      agent_data_perm: clean.agentDataPerm,
      buckets: mergedBuckets,
    });
    if (insertErr) {
      if (isMissingTableError(insertErr)) return { ok: false, tablesReady: false };
      return { ok: false, tablesReady: true, error: insertErr.message };
    }
    return { ok: true, tablesReady: true, role: 'user' };
  }

  const updateData: Record<string, unknown> = {
    display_name: clean.displayName,
    avatar: clean.avatar,
    theme: clean.theme,
    agent_data_perm: clean.agentDataPerm,
    buckets: mergedBuckets,
    updated_at: new Date().toISOString(),
  };
  if (password) {
    updateData.password_hash = await hashAccountPassword(clean.usernameKey, password);
  }

  const { error: updErr } = await supabase
    .from('hub_accounts')
    .update(updateData)
    .eq('username_key', clean.usernameKey);

  if (updErr) {
    if (isMissingTableError(updErr)) return { ok: false, tablesReady: false };
    return { ok: false, tablesReady: true, error: updErr.message };
  }

  return {
    ok: true,
    tablesReady: true,
    role: existing.role === 'admin' ? 'admin' : 'user',
  };
}

export async function syncSingleBucketToSupabase(
  meta: HubAccountMeta,
  bucketName: BucketName,
  payload: CloudBucketPayload
): Promise<{ role: 'user' | 'admin' }> {
  if (!VALID_BUCKETS.includes(bucketName)) return { role: 'user' };
  const res = await syncOnlineAccountToSupabase(meta, { [bucketName]: payload });
  return { role: res.role === 'admin' ? 'admin' : 'user' };
}

export async function deleteOnlineAccountFromSupabase(username: string): Promise<void> {
  const key = toSafeAccountKey(username);
  await supabase.from('hub_accounts').delete().eq('username_key', key);
}

/* ---------- Friends & Real-Time Messaging via Supabase ---------- */

function buildMini(username: string, displayName: string, avatar: string): ParticipantMiniProfile {
  const usernameKey = toSafeAccountKey(username);
  const rawAvatar = String(avatar || '');
  // Never duplicate data:image/ blobs inside hub_friendships.profiles; live photos are hydrated from hub_accounts.
  const lightweightAvatar = rawAvatar.startsWith('data:image/') ? '' : rawAvatar.slice(0, 32);
  return {
    username: String(username || usernameKey).slice(0, 40),
    usernameKey,
    displayName: String(displayName || username || usernameKey).slice(0, 60),
    avatar: lightweightAvatar,
    role: 'user',
  };
}

async function fetchLiveMiniProfilesMap(
  rows: HubFriendshipRow[]
): Promise<Map<string, ParticipantMiniProfile>> {
  const result = new Map<string, ParticipantMiniProfile>();
  const keySet = new Set<string>();
  for (const row of rows) {
    if (row.user_a) keySet.add(row.user_a);
    if (row.user_b) keySet.add(row.user_b);
  }
  const keys = Array.from(keySet);
  if (keys.length === 0) return result;

  const { data, error } = await supabase
    .from('hub_accounts')
    .select('username_key, username, display_name, avatar, role')
    .in('username_key', keys);

  if (error || !data) return result;
  for (const row of data as Pick<
    HubAccountRow,
    'username_key' | 'username' | 'display_name' | 'avatar' | 'role'
  >[]) {
    result.set(row.username_key, {
      username: row.username,
      usernameKey: row.username_key,
      displayName: row.display_name || row.username,
      avatar: row.avatar || '',
      role: row.role === 'admin' ? 'admin' : 'user',
    });
  }
  return result;
}

function mergeFriendshipProfiles(
  row: HubFriendshipRow,
  liveMap: Map<string, ParticipantMiniProfile>
): Record<string, ParticipantMiniProfile> {
  const merged: Record<string, ParticipantMiniProfile> = { ...(row.profiles || {}) };
  for (const key of [row.user_a, row.user_b]) {
    if (!key) continue;
    const live = liveMap.get(key);
    if (live) {
      merged[key] = live;
    } else if (merged[key] && String(merged[key].avatar || '').startsWith('data:image/')) {
      // Guard against older rows that stored truncated data:image URLs
      const av = String(merged[key].avatar || '');
      if (av.length >= 2048) {
        merged[key] = { ...merged[key], avatar: '' };
      }
    }
  }
  return merged;
}

export async function fetchFriendshipsFromSupabase(myKey: string): Promise<{
  tablesReady: boolean;
  friendships: FriendshipDTO[];
}> {
  const { data, error } = await supabase
    .from('hub_friendships')
    .select('*')
    .or(`user_a.eq.${myKey},user_b.eq.${myKey}`)
    .order('updated_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return { tablesReady: false, friendships: [] };
    throw new Error(error.message);
  }

  const rows = (data as HubFriendshipRow[] | null) || [];
  const liveMap = await fetchLiveMiniProfilesMap(rows);

  const friendships: FriendshipDTO[] = rows.map((row) => ({
    pairId: row.pair_id,
    participants: [row.user_a, row.user_b],
    requesterId: row.requester_key,
    status: row.status === 'accepted' ? 'accepted' : 'pending',
    profiles: mergeFriendshipProfiles(row, liveMap),
    updatedAtMs: toMs(row.updated_at) || toMs(row.created_at),
  }));

  return { tablesReady: true, friendships };
}

export async function fetchChatsFromSupabase(myKey: string): Promise<{
  tablesReady: boolean;
  chats: ChatThreadDTO[];
}> {
  const { data: fData, error: fErr } = await supabase
    .from('hub_friendships')
    .select('*')
    .or(`user_a.eq.${myKey},user_b.eq.${myKey}`)
    .eq('status', 'accepted');

  if (fErr) {
    if (isMissingTableError(fErr)) return { tablesReady: false, chats: [] };
    throw new Error(fErr.message);
  }

  const { data: mData, error: mErr } = await supabase
    .from('hub_messages')
    .select('*')
    .or(`sender_key.eq.${myKey},recipient_key.eq.${myKey}`)
    .order('created_at', { ascending: false })
    .limit(300);

  if (mErr) {
    if (isMissingTableError(mErr)) return { tablesReady: false, chats: [] };
    throw new Error(mErr.message);
  }

  const latestByChat = new Map<string, HubMessageRow>();
  for (const m of (mData as HubMessageRow[] | null) || []) {
    if (!latestByChat.has(m.chat_id)) {
      latestByChat.set(m.chat_id, m);
    }
  }

  const fRows = (fData as HubFriendshipRow[] | null) || [];
  const liveMap = await fetchLiveMiniProfilesMap(fRows);

  const chats: ChatThreadDTO[] = fRows.map((f) => {
    const latest = latestByChat.get(f.pair_id);
    return {
      chatId: f.pair_id,
      participants: [f.user_a, f.user_b],
      profiles: mergeFriendshipProfiles(f, liveMap),
      lastMessageText: latest?.text || '',
      lastMessageSenderId: latest?.sender_key || '',
      lastMessageAtMs: latest ? toMs(latest.created_at) : 0,
      updatedAtMs: toMs(f.updated_at) || toMs(f.created_at),
    };
  });

  chats.sort((a, b) => (b.lastMessageAtMs || b.updatedAtMs) - (a.lastMessageAtMs || a.updatedAtMs));
  return { tablesReady: true, chats };
}

export async function addFriendByUsernameInSupabase(
  myMeta: HubAccountMeta,
  targetUsernameRaw: string
): Promise<{
  status: 'requested' | 'already_friends' | 'already_pending' | 'accepted';
  friend: {
    ownerId: string;
    usernameKey: string;
    username: string;
    displayName: string;
    avatar: string;
    role: 'user';
  };
}> {
  const cleanTarget = String(targetUsernameRaw || '').trim().replace(/^@/, '');
  const targetKey = toSafeAccountKey(cleanTarget);
  if (cleanTarget.length < 2) {
    throw new Error('Please enter a friend username (at least 2 characters).');
  }
  const myKey = toSafeAccountKey(myMeta.username);
  if (targetKey === myKey) {
    throw new Error('You cannot add your own username as a contact.');
  }

  const { data: targetAcc, error: accErr } = await supabase
    .from('hub_accounts')
    .select('username_key, username, display_name, avatar')
    .eq('username_key', targetKey)
    .maybeSingle<Pick<HubAccountRow, 'username_key' | 'username' | 'display_name' | 'avatar'>>();

  if (accErr) {
    if (isMissingTableError(accErr)) {
      throw new Error('Supabase tables are not initialized yet. Run the setup SQL first.');
    }
    throw new Error(accErr.message);
  }

  if (!targetAcc) {
    throw new Error(`No Online Account found with username "@${cleanTarget}". Ask them to create an Online Account first.`);
  }

  const friendProfile = {
    ownerId: targetAcc.username_key,
    usernameKey: targetAcc.username_key,
    username: targetAcc.username,
    displayName: targetAcc.display_name || targetAcc.username,
    avatar: targetAcc.avatar || '',
    role: 'user' as const,
  };

  const { pairId, participants } = makeSortedPair(myKey, targetKey);
  const { data: existing, error: fErr } = await supabase
    .from('hub_friendships')
    .select('*')
    .eq('pair_id', pairId)
    .maybeSingle<HubFriendshipRow>();

  if (fErr) throw new Error(fErr.message);

  if (existing) {
    if (existing.status === 'accepted') {
      return { status: 'already_friends', friend: friendProfile };
    }
    if (existing.requester_key !== myKey) {
      const { error: updErr } = await supabase
        .from('hub_friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('pair_id', pairId);
      if (updErr) throw new Error(updErr.message);
      return { status: 'accepted', friend: friendProfile };
    }
    return { status: 'already_pending', friend: friendProfile };
  }

  const myMini = buildMini(myMeta.username, myMeta.displayName || myMeta.username, myMeta.avatar || '');
  const friendMini = buildMini(friendProfile.username, friendProfile.displayName, friendProfile.avatar);

  const { error: insErr } = await supabase.from('hub_friendships').insert({
    pair_id: pairId,
    user_a: participants[0],
    user_b: participants[1],
    requester_key: myKey,
    status: 'pending',
    profiles: {
      [myKey]: myMini,
      [targetKey]: friendMini,
    },
  });

  if (insErr) throw new Error(insErr.message);
  return { status: 'requested', friend: friendProfile };
}

export async function acceptFriendRequestInSupabase(pairId: string): Promise<void> {
  const { error } = await supabase
    .from('hub_friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('pair_id', pairId);
  if (error) throw new Error(error.message);
}

export async function removeFriendshipInSupabase(pairId: string): Promise<void> {
  const { error } = await supabase.from('hub_friendships').delete().eq('pair_id', pairId);
  if (error) throw new Error(error.message);
}

export async function fetchChatMessagesFromSupabase(chatId: string): Promise<ChatMessageDTO[]> {
  const { data, error } = await supabase
    .from('hub_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(300);

  if (error) throw new Error(error.message);

  return ((data as HubMessageRow[] | null) || []).map((m) => ({
    messageId: m.id,
    chatId: m.chat_id,
    participants: [m.sender_key, m.recipient_key].sort(),
    senderId: m.sender_key,
    senderUsername: m.sender_username,
    senderDisplayName: m.sender_display_name,
    text: m.text,
    createdAtMs: toMs(m.created_at),
  }));
}

export async function sendMessageInSupabase(
  myMeta: HubAccountMeta,
  friendKey: string,
  rawText: string
): Promise<void> {
  const text = String(rawText || '').trim().slice(0, 2000);
  if (!text) return;
  const myKey = toSafeAccountKey(myMeta.username);
  const { pairId: chatId } = makeSortedPair(myKey, friendKey);
  const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const { error } = await supabase.from('hub_messages').insert({
    id: messageId,
    chat_id: chatId,
    sender_key: myKey,
    recipient_key: friendKey,
    sender_username: (myMeta.username || myKey).slice(0, 40),
    sender_display_name: (myMeta.displayName || myMeta.username || myKey).slice(0, 60),
    text,
  });

  if (error) throw new Error(error.message);
}

export function subscribeUserSocialRealtime(
  myKey: string,
  onFriendshipsChange: () => void,
  onMessagesChange: () => void
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`hub_social_${myKey}_${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hub_friendships' },
      (payload) => {
        const rec = (payload.new || payload.old || {}) as Partial<HubFriendshipRow>;
        if (!rec.user_a || rec.user_a === myKey || rec.user_b === myKey) {
          onFriendshipsChange();
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'hub_messages' },
      (payload) => {
        const rec = (payload.new || {}) as Partial<HubMessageRow>;
        if (rec.sender_key === myKey || rec.recipient_key === myKey) {
          onMessagesChange();
        }
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/* ---------- Account Moderation (Supabase) ---------- */

interface HubAccountModerationRow {
  username_key: string;
  username: string;
  role: 'user' | 'admin';
  moderation_status: AccountModerationStatus;
  ban_message: string;
  suspended_until_ms: number;
}

export async function fetchAccountModerationStatus(usernameKey: string): Promise<{
  moderationStatus: AccountModerationStatus;
  banMessage: string;
  suspendedUntilMs: number;
  isSuspended: boolean;
  isBanned: boolean;
  role: 'user' | 'admin';
}> {
  const { data, error } = await supabase
    .from('hub_accounts')
    .select('username_key, username, role, moderation_status, ban_message, suspended_until_ms')
    .eq('username_key', usernameKey)
    .maybeSingle<HubAccountModerationRow>();
  if (error) {
    if (isMissingTableError(error) || isMissingColumnError(error)) {
      return { moderationStatus: 'active', banMessage: '', suspendedUntilMs: 0, isSuspended: false, isBanned: false, role: 'user' };
    }
    throw new Error(error.message);
  }
  if (!data) {
    return { moderationStatus: 'active', banMessage: '', suspendedUntilMs: 0, isSuspended: false, isBanned: false, role: 'user' };
  }
  const mod = resolveRowModeration(data);
  return {
    moderationStatus: mod.moderationStatus,
    banMessage: mod.banMessage,
    suspendedUntilMs: mod.suspendedUntilMs,
    isSuspended: mod.moderationStatus === 'suspended',
    isBanned: mod.moderationStatus === 'banned',
    role: data.role === 'admin' ? 'admin' : 'user',
  };
}

export async function setAccountModeration(
  callerKey: string,
  targetUsernameKey: string,
  moderationStatus: AccountModerationStatus,
  banMessage?: string,
  suspendedUntilMs?: number
): Promise<{
  ok: boolean;
  targetUsername: string;
  moderationStatus: AccountModerationStatus;
  accounts: AdminDirectoryAccountDTO[];
  error?: string;
}> {
  const res = await setAccountModerationStatusInSupabase(callerKey, {
    usernameKey: targetUsernameKey,
    moderationStatus,
    banMessage,
    suspendedUntilMs,
  });
  const found = res.accounts.find((a) => a.usernameKey === toSafeAccountKey(targetUsernameKey));
  return {
    ok: true,
    targetUsername: found?.username || targetUsernameKey,
    moderationStatus: res.moderationStatus,
    accounts: res.accounts,
  };
}

/* ---------- Apps Store (Supabase, Compact Gzip Storage) ---------- */

const GZ_PREFIX = 'gz:';

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

async function compressTextGzip(rawText: string): Promise<string> {
  const text = String(rawText || '');
  if (text.length < 64 || typeof CompressionStream === 'undefined') {
    return text;
  }
  try {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    await writer.write(new TextEncoder().encode(text));
    await writer.close();
    const buf = await new Response(stream.readable).arrayBuffer();
    const packed = GZ_PREFIX + bytesToBase64(new Uint8Array(buf));
    return packed.length < text.length ? packed : text;
  } catch {
    return text;
  }
}

async function decompressTextGzip(stored: string): Promise<string> {
  const raw = String(stored || '');
  if (!raw.startsWith(GZ_PREFIX) || typeof DecompressionStream === 'undefined') {
    return raw;
  }
  try {
    const bytes = base64ToBytes(raw.slice(GZ_PREFIX.length));
    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    await writer.write(new Uint8Array(bytes));
    await writer.close();
    const buf = await new Response(stream.readable).arrayBuffer();
    return new TextDecoder().decode(buf);
  } catch {
    return raw;
  }
}

function validateSafeHttpUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim().slice(0, 500);
  if (!trimmed) {
    throw new Error('Please enter the Online Link URL for your app (https://...).');
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Online Link must be a valid URL starting with https:// or http://.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Online Link must use https:// or http://.');
  }
  return parsed.toString();
}

function normalizeSourceMode(mode: unknown): OnlineAppSourceMode {
  if (mode === 'bundle') return 'bundle';
  if (mode === 'link') return 'link';
  return 'html';
}

function normalizeNormalizedAppPayload(input: SubmitOnlineAppInput): {
  name: string;
  description: string;
  about: string;
  icon: string;
  sourceMode: OnlineAppSourceMode;
  appUrl: string;
  dataStorageMode: OnlineAppDataStorageMode;
  code: string;
  htmlCode: string;
  cssCode: string;
  jsCode: string;
} {
  const sourceMode = normalizeSourceMode(input.sourceMode);
  const name = String(input.name || 'Untitled App').trim().slice(0, 80);
  const description = String(input.description || '').trim().slice(0, 500);
  const about = String(input.about || '').trim().slice(0, 2000);
  const icon = String(input.icon || '🌐').trim().slice(0, 16) || '🌐';

  if (sourceMode === 'link') {
    if (input.dataStorageMode === 'hub_supabase') {
      throw new Error('Online Link apps must manage and store user data themselves.');
    }
    const appUrl = validateSafeHttpUrl(input.appUrl || '');
    return {
      name,
      description,
      about,
      icon,
      sourceMode: 'link',
      appUrl,
      dataStorageMode: 'self',
      code: '',
      htmlCode: '',
      cssCode: '',
      jsCode: '',
    };
  }

  const dataStorageMode: OnlineAppDataStorageMode =
    input.dataStorageMode === 'hub_supabase' ? 'hub_supabase' : 'self';

  return {
    name,
    description,
    about,
    icon,
    sourceMode,
    appUrl: '',
    dataStorageMode,
    code: sourceMode === 'html' ? String(input.code || '').slice(0, 250000) : '',
    htmlCode: sourceMode === 'bundle' ? String(input.htmlCode || '').slice(0, 120000) : '',
    cssCode: sourceMode === 'bundle' ? String(input.cssCode || '').slice(0, 80000) : '',
    jsCode: sourceMode === 'bundle' ? String(input.jsCode || '').slice(0, 120000) : '',
  };
}

function normalizeReportsList(raw: unknown, fallbackAppId: string): OnlineAppReportDTO[] {
  if (!Array.isArray(raw)) return [];
  const out: OnlineAppReportDTO[] = [];
  for (const item of raw.slice(0, 25)) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Partial<OnlineAppReportDTO>;
    const reporterKey = toSafeAccountKey(String(r.reporterKey || r.reporterUsername || 'user'));
    const status: OnlineAppReportStatus =
      r.status === 'dismissed' ? 'dismissed' : r.status === 'removed' ? 'removed' : 'open';
    out.push({
      reportId: String(r.reportId || `rep_${Date.now().toString(36)}`).slice(0, 48),
      appId: String(r.appId || fallbackAppId),
      reporterKey,
      reporterUsername: String(r.reporterUsername || reporterKey).slice(0, 40),
      reporterDisplayName: String(r.reporterDisplayName || r.reporterUsername || reporterKey).slice(0, 60),
      reason: String(r.reason || 'Reported issue').slice(0, 120),
      details: String(r.details || '').slice(0, 500),
      status,
      createdAtMs: Number(r.createdAtMs) || 0,
      resolvedAtMs: Number(r.resolvedAtMs) || 0,
      resolvedBy: String(r.resolvedBy || '').slice(0, 40),
      resolutionNote: String(r.resolutionNote || '').slice(0, 300),
    });
  }
  return out;
}

function normalizeAppealsList(raw: unknown, fallbackAppId: string): OnlineAppAppealDTO[] {
  if (!Array.isArray(raw)) return [];
  const out: OnlineAppAppealDTO[] = [];
  for (const item of raw.slice(0, 15)) {
    if (!item || typeof item !== 'object') continue;
    const a = item as Partial<OnlineAppAppealDTO>;
    const appellantKey = toSafeAccountKey(String(a.appellantKey || a.appellantUsername || 'user'));
    const targetType: OnlineAppAppealTargetType =
      a.targetType === 'warning' ? 'warning' : a.targetType === 'suspension' ? 'suspension' : 'ban';
    const status: OnlineAppAppealStatus =
      a.status === 'accepted'
        ? 'accepted'
        : a.status === 'denied'
        ? 'denied'
        : a.status === 'convo_requested'
        ? 'convo_requested'
        : 'pending';
    out.push({
      appealId: String(a.appealId || `apl_${Date.now().toString(36)}`).slice(0, 48),
      appId: String(a.appId || fallbackAppId),
      targetType,
      appellantKey,
      appellantUsername: String(a.appellantUsername || appellantKey).slice(0, 40),
      appellantDisplayName: String(a.appellantDisplayName || a.appellantUsername || appellantKey).slice(0, 60),
      message: String(a.message || '').slice(0, 600),
      status,
      createdAtMs: Number(a.createdAtMs) || 0,
      adminResponse: String(a.adminResponse || '').slice(0, 400),
      respondedAtMs: Number(a.respondedAtMs) || 0,
      respondedBy: String(a.respondedBy || '').slice(0, 40),
      convoRequested: Boolean(a.convoRequested),
      convoRequestedBy: String(a.convoRequestedBy || '').slice(0, 40),
      convoRequestedByDisplayName: String(a.convoRequestedByDisplayName || a.convoRequestedBy || '').slice(0, 60),
      convoRequestedAtMs: Number(a.convoRequestedAtMs) || 0,
      convoPairId: String(a.convoPairId || '').slice(0, 90),
    });
  }
  return out;
}

function extractLiveMetaFromRow(row: HubOnlineAppRow): OnlineAppLiveMeta {
  const rawPending = row.pending_update;
  const metaObj =
    rawPending && typeof rawPending === 'object' && '_liveMeta' in rawPending
      ? ((rawPending as { _liveMeta?: OnlineAppLiveMeta })._liveMeta || {})
      : {};
  const removedByAdmin = Boolean(metaObj.removedByAdmin);
  let moderationState: OnlineAppModerationState =
    metaObj.moderationState === 'warned' ||
    metaObj.moderationState === 'suspended' ||
    metaObj.moderationState === 'banned' ||
    metaObj.moderationState === 'active'
      ? metaObj.moderationState
      : removedByAdmin
      ? 'banned'
      : 'active';

  return {
    about: typeof metaObj.about === 'string' ? metaObj.about : (typeof row.about === 'string' ? row.about : ''),
    appUrl: typeof metaObj.appUrl === 'string' ? metaObj.appUrl : (typeof row.app_url === 'string' ? row.app_url : ''),
    dataStorageMode:
      metaObj.dataStorageMode === 'hub_supabase' || row.data_storage_mode === 'hub_supabase'
        ? 'hub_supabase'
        : 'self',
    sourceMode: normalizeSourceMode(metaObj.sourceMode || row.source_mode),
    reports: normalizeReportsList(metaObj.reports, row.app_id),
    removedByAdmin,
    removedReason: typeof metaObj.removedReason === 'string' ? metaObj.removedReason : '',
    removedAtMs: Number(metaObj.removedAtMs) || 0,
    removedBy: typeof metaObj.removedBy === 'string' ? metaObj.removedBy : '',
    moderationState,
    warningMessage: typeof metaObj.warningMessage === 'string' ? metaObj.warningMessage : '',
    warnedAtMs: Number(metaObj.warnedAtMs) || 0,
    warnedBy: typeof metaObj.warnedBy === 'string' ? metaObj.warnedBy : '',
    suspendedUntilMs: Number(metaObj.suspendedUntilMs) || 0,
    suspensionReason: typeof metaObj.suspensionReason === 'string' ? metaObj.suspensionReason : '',
    suspendedAtMs: Number(metaObj.suspendedAtMs) || 0,
    suspendedBy: typeof metaObj.suspendedBy === 'string' ? metaObj.suspendedBy : '',
    appeals: normalizeAppealsList(metaObj.appeals, row.app_id),
  };
}

function estimateRowStorageBytes(row: HubOnlineAppRow): number {
  const textLen =
    String(row.name || '').length +
    String(row.description || '').length +
    String(row.code || '').length +
    String(row.html_code || '').length +
    String(row.css_code || '').length +
    String(row.js_code || '').length +
    (row.pending_update ? JSON.stringify(row.pending_update).length : 0);
  return textLen;
}

async function mapOnlineAppRowAsync(row: HubOnlineAppRow): Promise<OnlineAppDTO> {
  const liveMeta = extractLiveMetaFromRow(row);
  const sourceMode = normalizeSourceMode(liveMeta.sourceMode || row.source_mode);
  const dataStorageMode: OnlineAppDataStorageMode =
    sourceMode === 'link' ? 'self' : (liveMeta.dataStorageMode === 'hub_supabase' ? 'hub_supabase' : 'self');

  const [code, htmlCode, cssCode, jsCode, about] = await Promise.all([
    decompressTextGzip(row.code || ''),
    decompressTextGzip(row.html_code || ''),
    decompressTextGzip(row.css_code || ''),
    decompressTextGzip(row.js_code || ''),
    decompressTextGzip(liveMeta.about || ''),
  ]);

  const rawPending = row.pending_update;
  const hasStructuredPending =
    Boolean(row.has_pending_update) &&
    rawPending !== null &&
    typeof rawPending === 'object' &&
    'name' in rawPending;

  let pendingUpdate: OnlineAppPendingUpdateDTO | null = null;
  if (hasStructuredPending) {
    const pu = rawPending as Partial<OnlineAppPendingUpdateDTO>;
    const puSourceMode = normalizeSourceMode(pu.sourceMode);
    const puStorageMode: OnlineAppDataStorageMode =
      puSourceMode === 'link' ? 'self' : (pu.dataStorageMode === 'hub_supabase' ? 'hub_supabase' : 'self');
    const [pCode, pHtml, pCss, pJs, pAbout] = await Promise.all([
      decompressTextGzip(pu.code || ''),
      decompressTextGzip(pu.htmlCode || ''),
      decompressTextGzip(pu.cssCode || ''),
      decompressTextGzip(pu.jsCode || ''),
      decompressTextGzip(pu.about || ''),
    ]);
    pendingUpdate = {
      name: String(pu.name || row.name),
      description: String(pu.description || ''),
      about: pAbout,
      icon: String(pu.icon || row.icon || '🌐'),
      sourceMode: puSourceMode,
      appUrl: puSourceMode === 'link' ? String(pu.appUrl || '') : '',
      dataStorageMode: puStorageMode,
      code: pCode,
      htmlCode: pHtml,
      cssCode: pCss,
      jsCode: pJs,
      submittedAtMs: Number(pu.submittedAtMs) || 0,
    };
  }

  const reports = liveMeta.reports || [];
  const openReportsCount = reports.filter((r) => r.status === 'open').length;
  const appeals = liveMeta.appeals || [];
  const pendingAppealsCount = appeals.filter((a) => a.status === 'pending' || a.status === 'convo_requested').length;

  let effStatus: OnlineAppStatus = row.status || 'pending';
  let effModState: OnlineAppModerationState = liveMeta.moderationState || 'active';
  let effSuspendedUntilMs = liveMeta.suspendedUntilMs || 0;
  let effSuspensionReason = liveMeta.suspensionReason || '';
  if (effModState === 'suspended' && effSuspendedUntilMs > 0 && Date.now() >= effSuspendedUntilMs) {
    effStatus = 'approved';
    effModState = 'active';
    effSuspendedUntilMs = 0;
    effSuspensionReason = '';
  }

  return {
    appId: row.app_id,
    name: row.name,
    description: row.description || '',
    about,
    icon: row.icon || '🌐',
    authorUid: row.author_uid,
    authorUsername: row.author_username,
    authorUsernameKey: row.author_username_key,
    authorDisplayName: row.author_display_name,
    sourceMode,
    appUrl: sourceMode === 'link' ? String(liveMeta.appUrl || '') : '',
    dataStorageMode,
    storageBytes: estimateRowStorageBytes(row),
    code,
    htmlCode,
    cssCode,
    jsCode,
    status: effStatus,
    version: Number(row.version) || 1,
    adminNote: row.admin_note || '',
    reviewedByUid: row.reviewed_by_uid || '',
    hasPendingUpdate: Boolean(row.has_pending_update),
    pendingUpdate,
    reports,
    openReportsCount,
    removedByAdmin: Boolean(liveMeta.removedByAdmin),
    removedReason: liveMeta.removedReason || (liveMeta.removedByAdmin ? row.admin_note || '' : ''),
    removedAtMs: liveMeta.removedAtMs || 0,
    removedBy: liveMeta.removedBy || '',
    moderationState: effModState,
    warningMessage: liveMeta.warningMessage || '',
    warnedAtMs: liveMeta.warnedAtMs || 0,
    warnedBy: liveMeta.warnedBy || '',
    suspendedUntilMs: effSuspendedUntilMs,
    suspensionReason: effSuspensionReason,
    suspendedAtMs: liveMeta.suspendedAtMs || 0,
    suspendedBy: liveMeta.suspendedBy || '',
    appeals,
    pendingAppealsCount,
    createdAtMs: toMs(row.created_at),
    updatedAtMs: toMs(row.updated_at),
  };
}

async function liftExpiredAppSuspensionsInDb(rows: HubOnlineAppRow[]): Promise<void> {
  const nowMs = Date.now();
  const expiredRows = rows.filter((row) => {
    const meta = extractLiveMetaFromRow(row);
    return (
      row.status === 'disabled' &&
      meta.moderationState === 'suspended' &&
      (meta.suspendedUntilMs || 0) > 0 &&
      nowMs >= (meta.suspendedUntilMs || 0)
    );
  });
  if (!expiredRows.length) return;
  await Promise.all(
    expiredRows.map(async (row) => {
      const meta = extractLiveMetaFromRow(row);
      const rawPending =
        row.pending_update && typeof row.pending_update === 'object'
          ? { ...(row.pending_update as Record<string, unknown>) }
          : {};
      rawPending._liveMeta = {
        ...meta,
        moderationState: 'active',
        suspendedUntilMs: 0,
        suspensionReason: '',
        suspendedAtMs: 0,
        suspendedBy: '',
      };
      await supabase
        .from('hub_online_apps')
        .update({
          status: 'approved',
          admin_note: '',
          pending_update: rawPending,
          updated_at: new Date().toISOString(),
        })
        .eq('app_id', row.app_id);
    })
  );
}

export async function fetchOnlineAppsFromSupabase(): Promise<{
  tablesReady: boolean;
  apps: OnlineAppDTO[];
}> {
  await ensureSupabaseReady();
  const { data, error } = await supabase
    .from('hub_online_apps')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    if (isMissingTableError(error)) return { tablesReady: false, apps: [] };
    throw new Error(error.message);
  }

  const rows = (data as HubOnlineAppRow[] | null) || [];
  void liftExpiredAppSuspensionsInDb(rows).catch(() => {});
  const apps = await Promise.all(rows.map(mapOnlineAppRowAsync));
  return {
    tablesReady: true,
    apps,
  };
}

export async function submitOnlineAppInSupabase(
  authorMeta: HubAccountMeta,
  input: SubmitOnlineAppInput
): Promise<{ appId: string }> {
  await ensureSupabaseReady();
  const authorKey = toSafeAccountKey(authorMeta.username);
  const appId = `oapp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const normalized = normalizeNormalizedAppPayload(input);

  const [cCode, cHtml, cCss, cJs, cAbout] = await Promise.all([
    compressTextGzip(normalized.code),
    compressTextGzip(normalized.htmlCode),
    compressTextGzip(normalized.cssCode),
    compressTextGzip(normalized.jsCode),
    compressTextGzip(normalized.about),
  ]);

  const liveMeta: OnlineAppLiveMeta = {
    about: cAbout,
    appUrl: normalized.appUrl,
    dataStorageMode: normalized.dataStorageMode,
    sourceMode: normalized.sourceMode,
  };

  // Store DB source_mode as 'html' | 'bundle' for full compatibility with existing Postgres CHECK constraint,
  // while preserving exact 'link' / metadata in pending_update._liveMeta.
  const dbSourceMode: 'html' | 'bundle' = normalized.sourceMode === 'bundle' ? 'bundle' : 'html';

  const { error } = await supabase.from('hub_online_apps').insert({
    app_id: appId,
    name: normalized.name,
    description: normalized.description,
    icon: normalized.icon,
    author_uid: authorKey,
    author_username: String(authorMeta.username || authorKey).slice(0, 40),
    author_username_key: authorKey,
    author_display_name: String(authorMeta.displayName || authorMeta.username || authorKey).slice(0, 60),
    source_mode: dbSourceMode,
    code: cCode,
    html_code: cHtml,
    css_code: cCss,
    js_code: cJs,
    status: 'pending',
    version: 1,
    admin_note: '',
    reviewed_by_uid: '',
    has_pending_update: false,
    pending_update: { _liveMeta: liveMeta },
  });

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error('Apps Store table is not set up yet. Run supabase_schema.sql in Supabase SQL Editor.');
    }
    throw new Error(error.message);
  }
  return { appId };
}

export async function submitOnlineAppUpdateInSupabase(
  authorKey: string,
  appId: string,
  input: SubmitOnlineAppInput
): Promise<{ staged: boolean }> {
  const { data: existing, error: readErr } = await supabase
    .from('hub_online_apps')
    .select('*')
    .eq('app_id', appId)
    .maybeSingle<HubOnlineAppRow>();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error('App not found in Apps Store.');
  if (existing.author_username_key !== authorKey) throw new Error('Only the app author can update this app.');

  const normalized = normalizeNormalizedAppPayload({
    ...input,
    name: input.name || existing.name,
    icon: input.icon || existing.icon,
  });

  const [cCode, cHtml, cCss, cJs, cAbout] = await Promise.all([
    compressTextGzip(normalized.code),
    compressTextGzip(normalized.htmlCode),
    compressTextGzip(normalized.cssCode),
    compressTextGzip(normalized.jsCode),
    compressTextGzip(normalized.about),
  ]);

  const updateFields: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const existingLiveMeta = extractLiveMetaFromRow(existing);

  if (existing.status === 'approved') {
    const stagedPayload = {
      _liveMeta: existingLiveMeta,
      name: normalized.name,
      description: normalized.description,
      about: cAbout,
      icon: normalized.icon,
      sourceMode: normalized.sourceMode,
      appUrl: normalized.appUrl,
      dataStorageMode: normalized.dataStorageMode,
      code: cCode,
      htmlCode: cHtml,
      cssCode: cCss,
      jsCode: cJs,
      submittedAtMs: Date.now(),
    };
    updateFields.has_pending_update = true;
    updateFields.pending_update = stagedPayload;
  } else {
    const liveMeta: OnlineAppLiveMeta = {
      about: cAbout,
      appUrl: normalized.appUrl,
      dataStorageMode: normalized.dataStorageMode,
      sourceMode: normalized.sourceMode,
      reports: existingLiveMeta.reports || [],
      appeals: existingLiveMeta.appeals || [],
      removedByAdmin: false,
      removedReason: '',
      removedAtMs: 0,
      removedBy: '',
      moderationState: 'active',
      warningMessage: '',
      warnedAtMs: 0,
      warnedBy: '',
      suspendedUntilMs: 0,
      suspensionReason: '',
      suspendedAtMs: 0,
      suspendedBy: '',
    };
    updateFields.name = normalized.name;
    updateFields.description = normalized.description;
    updateFields.icon = normalized.icon;
    updateFields.source_mode = normalized.sourceMode === 'bundle' ? 'bundle' : 'html';
    updateFields.code = cCode;
    updateFields.html_code = cHtml;
    updateFields.css_code = cCss;
    updateFields.js_code = cJs;
    updateFields.status = 'pending';
    updateFields.admin_note = '';
    updateFields.has_pending_update = false;
    updateFields.pending_update = { _liveMeta: liveMeta };
  }

  const { error: updErr } = await supabase.from('hub_online_apps').update(updateFields).eq('app_id', appId);
  if (updErr) throw new Error(updErr.message);
  return { staged: existing.status === 'approved' };
}

export async function reviewOnlineAppInSupabase(
  callerKey: string,
  appId: string,
  action: 'approve' | 'reject' | 'disable' | 'enable' | 'remove',
  adminNote = ''
): Promise<void> {
  const role = await fetchAccountRoleFromSupabase(callerKey);
  if (role !== 'admin') throw new Error('Admin access required.');

  const { data: existing, error: readErr } = await supabase
    .from('hub_online_apps')
    .select('*')
    .eq('app_id', appId)
    .maybeSingle<HubOnlineAppRow>();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error('App not found in Apps Store.');

  const existingLiveMeta = extractLiveMetaFromRow(existing);
  const existingReports = existingLiveMeta.reports || [];
  const existingAppeals = existingLiveMeta.appeals || [];
  const cleanNote = String(adminNote || '').trim().slice(0, 300);
  const patch: Record<string, unknown> = {
    reviewed_by_uid: callerKey,
    admin_note: cleanNote,
    updated_at: new Date().toISOString(),
  };

  if (action === 'approve') {
    const rawPu = existing.pending_update;
    if (existing.has_pending_update && rawPu && typeof rawPu === 'object' && 'name' in rawPu) {
      const pu = rawPu as Partial<OnlineAppPendingUpdateDTO>;
      const puSourceMode = normalizeSourceMode(pu.sourceMode);
      const puStorageMode: OnlineAppDataStorageMode =
        puSourceMode === 'link' ? 'self' : (pu.dataStorageMode === 'hub_supabase' ? 'hub_supabase' : 'self');
      patch.name = pu.name || existing.name;
      patch.description = pu.description ?? existing.description;
      patch.icon = pu.icon || existing.icon;
      patch.source_mode = puSourceMode === 'bundle' ? 'bundle' : 'html';
      patch.code = pu.code ?? existing.code;
      patch.html_code = pu.htmlCode ?? existing.html_code;
      patch.css_code = pu.cssCode ?? existing.css_code;
      patch.js_code = pu.jsCode ?? existing.js_code;
      patch.version = (Number(existing.version) || 1) + 1;
      patch.pending_update = {
        _liveMeta: {
          about: typeof pu.about === 'string' ? pu.about : existingLiveMeta.about,
          appUrl: puSourceMode === 'link' ? String(pu.appUrl || '') : '',
          dataStorageMode: puStorageMode,
          sourceMode: puSourceMode,
          reports: existingReports,
          appeals: existingAppeals,
          removedByAdmin: false,
          removedReason: '',
          removedAtMs: 0,
          removedBy: '',
          moderationState: 'active',
          warningMessage: '',
          warnedAtMs: 0,
          warnedBy: '',
          suspendedUntilMs: 0,
          suspensionReason: '',
          suspendedAtMs: 0,
          suspendedBy: '',
        },
      };
    } else {
      patch.pending_update = {
        _liveMeta: {
          ...existingLiveMeta,
          reports: existingReports,
          appeals: existingAppeals,
          removedByAdmin: false,
          removedReason: '',
          removedAtMs: 0,
          removedBy: '',
          moderationState: 'active',
          warningMessage: '',
          warnedAtMs: 0,
          warnedBy: '',
          suspendedUntilMs: 0,
          suspensionReason: '',
          suspendedAtMs: 0,
          suspendedBy: '',
        },
      };
    }
    patch.status = 'approved';
    patch.has_pending_update = false;
  } else if (action === 'reject') {
    if (existing.status === 'approved' && existing.has_pending_update) {
      patch.has_pending_update = false;
      patch.pending_update = { _liveMeta: existingLiveMeta };
    } else {
      patch.status = 'rejected';
    }
  } else if (action === 'disable') {
    patch.status = 'disabled';
  } else if (action === 'enable') {
    patch.status = 'approved';
    patch.pending_update = {
      _liveMeta: {
        ...existingLiveMeta,
        reports: existingReports,
        appeals: existingAppeals,
        removedByAdmin: false,
        removedReason: '',
        removedAtMs: 0,
        removedBy: '',
        moderationState: 'active',
        warningMessage: '',
        warnedAtMs: 0,
        warnedBy: '',
        suspendedUntilMs: 0,
        suspensionReason: '',
        suspendedAtMs: 0,
        suspendedBy: '',
      },
    };
  } else if (action === 'remove') {
    const nowMs = Date.now();
    const reason = cleanNote || 'Banned / removed by Admin review.';
    const updatedReports: OnlineAppReportDTO[] = existingReports.map((r) =>
      r.status === 'open'
        ? {
            ...r,
            status: 'removed',
            resolvedAtMs: nowMs,
            resolvedBy: callerKey,
            resolutionNote: reason,
          }
        : r
    );
    patch.status = 'disabled';
    patch.admin_note = reason;
    patch.has_pending_update = false;
    patch.pending_update = {
      _liveMeta: {
        ...existingLiveMeta,
        reports: updatedReports,
        appeals: existingAppeals,
        removedByAdmin: true,
        removedReason: reason,
        removedAtMs: nowMs,
        removedBy: callerKey,
        moderationState: 'banned',
        suspendedUntilMs: 0,
        suspensionReason: '',
      },
    };
  }

  const { error: updErr } = await supabase.from('hub_online_apps').update(patch).eq('app_id', appId);
  if (updErr) throw new Error(updErr.message);
}

export async function moderateOnlineAppInSupabase(
  callerKey: string,
  input: ModerateOnlineAppInput
): Promise<void> {
  const role = await fetchAccountRoleFromSupabase(callerKey);
  if (role !== 'admin') throw new Error('Admin access required.');

  if (input.action === 'ban') {
    await reviewOnlineAppInSupabase(
      callerKey,
      input.appId,
      'remove',
      input.reason || 'Banned from Apps Store by Admin.'
    );
    return;
  }

  if (input.action === 'clear') {
    await reviewOnlineAppInSupabase(callerKey, input.appId, 'enable', '');
    return;
  }

  const { data: existing, error: readErr } = await supabase
    .from('hub_online_apps')
    .select('*')
    .eq('app_id', input.appId)
    .maybeSingle<HubOnlineAppRow>();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error('App not found in Apps Store.');

  const existingLiveMeta = extractLiveMetaFromRow(existing);
  const existingReports = existingLiveMeta.reports || [];
  const nowMs = Date.now();
  const reason = String(input.reason || '').trim().slice(0, 300);

  const rawPending =
    existing.pending_update && typeof existing.pending_update === 'object'
      ? { ...(existing.pending_update as Record<string, unknown>) }
      : {};

  if (input.action === 'warn') {
    const warnMsg = reason || 'Warning issued by Admin.';
    rawPending._liveMeta = {
      ...existingLiveMeta,
      moderationState: 'warned',
      warningMessage: warnMsg,
      warnedAtMs: nowMs,
      warnedBy: callerKey,
    };
    const { error: updErr } = await supabase
      .from('hub_online_apps')
      .update({
        reviewed_by_uid: callerKey,
        admin_note: warnMsg,
        pending_update: rawPending,
        updated_at: new Date().toISOString(),
      })
      .eq('app_id', existing.app_id);
    if (updErr) throw new Error(updErr.message);
    return;
  }

  if (input.action === 'suspend') {
    const untilMs = Number(input.suspendedUntilMs) || 0;
    if (untilMs <= nowMs + 60000) {
      throw new Error('Please select a future suspension end date/time.');
    }
    const suspReason = reason || 'Temporarily suspended by Admin.';
    const updatedReports: OnlineAppReportDTO[] = existingReports.map((r) =>
      r.status === 'open'
        ? {
            ...r,
            status: 'removed',
            resolvedAtMs: nowMs,
            resolvedBy: callerKey,
            resolutionNote: `App suspended until ${new Date(untilMs).toLocaleString()}: ${suspReason}`,
          }
        : r
    );
    rawPending._liveMeta = {
      ...existingLiveMeta,
      reports: updatedReports,
      removedByAdmin: false,
      removedReason: '',
      moderationState: 'suspended',
      suspendedUntilMs: untilMs,
      suspensionReason: suspReason,
      suspendedAtMs: nowMs,
      suspendedBy: callerKey,
    };
    const { error: updErr } = await supabase
      .from('hub_online_apps')
      .update({
        status: 'disabled',
        reviewed_by_uid: callerKey,
        admin_note: suspReason,
        pending_update: rawPending,
        updated_at: new Date().toISOString(),
      })
      .eq('app_id', existing.app_id);
    if (updErr) throw new Error(updErr.message);
  }
}

export async function reportOnlineAppInSupabase(
  reporterMeta: HubAccountMeta,
  input: ReportOnlineAppInput
): Promise<void> {
  await ensureSupabaseReady();
  const reporterKey = toSafeAccountKey(reporterMeta.username);
  const reason = String(input.reason || '').trim().slice(0, 120);
  const details = String(input.details || '').trim().slice(0, 500);
  if (!reason) throw new Error('Please choose a reason for reporting this app.');

  const { data: existing, error: readErr } = await supabase
    .from('hub_online_apps')
    .select('*')
    .eq('app_id', input.appId)
    .maybeSingle<HubOnlineAppRow>();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error('App not found in Apps Store.');

  const existingLiveMeta = extractLiveMetaFromRow(existing);
  const existingReports = existingLiveMeta.reports || [];
  const nowMs = Date.now();
  const openIdx = existingReports.findIndex((r) => r.reporterKey === reporterKey && r.status === 'open');

  let nextReports: OnlineAppReportDTO[];
  if (openIdx >= 0) {
    nextReports = existingReports.map((r, idx) =>
      idx === openIdx
        ? {
            ...r,
            reporterUsername: String(reporterMeta.username || reporterKey).slice(0, 40),
            reporterDisplayName: String(reporterMeta.displayName || reporterMeta.username || reporterKey).slice(0, 60),
            reason,
            details,
            createdAtMs: nowMs,
          }
        : r
    );
  } else {
    const newReport: OnlineAppReportDTO = {
      reportId: `rep_${nowMs.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      appId: existing.app_id,
      reporterKey,
      reporterUsername: String(reporterMeta.username || reporterKey).slice(0, 40),
      reporterDisplayName: String(reporterMeta.displayName || reporterMeta.username || reporterKey).slice(0, 60),
      reason,
      details,
      status: 'open',
      createdAtMs: nowMs,
      resolvedAtMs: 0,
      resolvedBy: '',
      resolutionNote: '',
    };
    nextReports = [newReport, ...existingReports].slice(0, 25);
  }

  const rawPending =
    existing.pending_update && typeof existing.pending_update === 'object'
      ? { ...(existing.pending_update as Record<string, unknown>) }
      : {};
  rawPending._liveMeta = {
    ...existingLiveMeta,
    reports: nextReports,
  };

  const { error: updErr } = await supabase
    .from('hub_online_apps')
    .update({
      pending_update: rawPending,
      updated_at: new Date().toISOString(),
    })
    .eq('app_id', existing.app_id);
  if (updErr) throw new Error(updErr.message);
}

export async function resolveOnlineAppReportInSupabase(
  callerKey: string,
  input: ResolveOnlineAppReportInput
): Promise<void> {
  const role = await fetchAccountRoleFromSupabase(callerKey);
  if (role !== 'admin') throw new Error('Admin access required.');

  if (input.decision === 'remove_app') {
    await reviewOnlineAppInSupabase(
      callerKey,
      input.appId,
      'remove',
      input.adminNote || 'Removed by Admin after reviewing user reports.'
    );
    return;
  }

  const { data: existing, error: readErr } = await supabase
    .from('hub_online_apps')
    .select('*')
    .eq('app_id', input.appId)
    .maybeSingle<HubOnlineAppRow>();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error('App not found in Apps Store.');

  const existingLiveMeta = extractLiveMetaFromRow(existing);
  const existingReports = existingLiveMeta.reports || [];
  const nowMs = Date.now();
  const note = String(input.adminNote || '').trim().slice(0, 300);
  const targetId = input.reportId || 'ALL';
  const nextReports: OnlineAppReportDTO[] = existingReports.map((r) => {
    const matches = targetId === 'ALL' ? r.status === 'open' : r.reportId === targetId;
    if (!matches) return r;
    return {
      ...r,
      status: 'dismissed',
      resolvedAtMs: nowMs,
      resolvedBy: callerKey,
      resolutionNote: note || 'Dismissed by Admin.',
    };
  });

  const rawPending =
    existing.pending_update && typeof existing.pending_update === 'object'
      ? { ...(existing.pending_update as Record<string, unknown>) }
      : {};
  rawPending._liveMeta = {
    ...existingLiveMeta,
    reports: nextReports,
  };

  const { error: updErr } = await supabase
    .from('hub_online_apps')
    .update({
      pending_update: rawPending,
      updated_at: new Date().toISOString(),
    })
    .eq('app_id', existing.app_id);
  if (updErr) throw new Error(updErr.message);
}

export async function ensureAdminAppealConvoInSupabase(
  adminMeta: HubAccountMeta,
  targetUsernameRaw: string,
  initialText: string
): Promise<{
  pairId: string;
  friend: {
    ownerId: string;
    usernameKey: string;
    username: string;
    displayName: string;
    avatar: string;
    role: 'user' | 'admin';
  };
}> {
  const adminKey = toSafeAccountKey(adminMeta.username);
  const targetKey = toSafeAccountKey(targetUsernameRaw);
  if (adminKey === targetKey) {
    throw new Error('Cannot start an appeal conversation with yourself.');
  }

  const { data: targetAcc, error: accErr } = await supabase
    .from('hub_accounts')
    .select('username_key, username, display_name, avatar, role')
    .eq('username_key', targetKey)
    .maybeSingle<Pick<HubAccountRow, 'username_key' | 'username' | 'display_name' | 'avatar' | 'role'>>();

  if (accErr) throw new Error(accErr.message);
  if (!targetAcc) {
    throw new Error(`Owner account @${targetUsernameRaw} was not found.`);
  }

  const friendProfile = {
    ownerId: targetAcc.username_key,
    usernameKey: targetAcc.username_key,
    username: targetAcc.username,
    displayName: targetAcc.display_name || targetAcc.username,
    avatar: targetAcc.avatar || '',
    role: targetAcc.role === 'admin' ? ('admin' as const) : ('user' as const),
  };

  const { pairId, participants } = makeSortedPair(adminKey, targetKey);
  const { data: existing, error: fErr } = await supabase
    .from('hub_friendships')
    .select('*')
    .eq('pair_id', pairId)
    .maybeSingle<HubFriendshipRow>();
  if (fErr) throw new Error(fErr.message);

  if (!existing) {
    const adminMini = buildMini(adminMeta.username, adminMeta.displayName || adminMeta.username, adminMeta.avatar || '');
    const ownerMini = buildMini(friendProfile.username, friendProfile.displayName, friendProfile.avatar);
    const { error: insErr } = await supabase.from('hub_friendships').insert({
      pair_id: pairId,
      user_a: participants[0],
      user_b: participants[1],
      requester_key: adminKey,
      status: 'accepted',
      profiles: {
        [adminKey]: adminMini,
        [targetKey]: ownerMini,
      },
    });
    if (insErr) throw new Error(insErr.message);
  } else if (existing.status !== 'accepted') {
    const { error: updErr } = await supabase
      .from('hub_friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('pair_id', pairId);
    if (updErr) throw new Error(updErr.message);
  }

  if (initialText.trim()) {
    await sendMessageInSupabase(adminMeta, targetKey, initialText);
  }
  return { pairId, friend: friendProfile };
}

export async function submitOnlineAppAppealInSupabase(
  ownerMeta: HubAccountMeta,
  input: SubmitOnlineAppAppealInput
): Promise<void> {
  await ensureSupabaseReady();
  const appellantKey = toSafeAccountKey(ownerMeta.username);
  const message = String(input.message || '').trim().slice(0, 600);
  if (message.length < 5) {
    throw new Error('Please write a brief explanation for your appeal (at least 5 characters).');
  }

  const { data: existing, error: readErr } = await supabase
    .from('hub_online_apps')
    .select('*')
    .eq('app_id', input.appId)
    .maybeSingle<HubOnlineAppRow>();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error('App not found in Apps Store.');
  if (existing.author_username_key !== appellantKey) {
    throw new Error('Only the app owner can appeal this moderation notice.');
  }

  const existingLiveMeta = extractLiveMetaFromRow(existing);
  const existingAppeals = existingLiveMeta.appeals || [];
  const targetType: OnlineAppAppealTargetType =
    input.targetType === 'warning' || input.targetType === 'suspension' ? input.targetType : 'ban';
  const nowMs = Date.now();

  const pendingIdx = existingAppeals.findIndex(
    (a) => a.targetType === targetType && a.status === 'pending'
  );

  let nextAppeals: OnlineAppAppealDTO[];
  if (pendingIdx >= 0) {
    nextAppeals = existingAppeals.map((a, idx) =>
      idx === pendingIdx
        ? {
            ...a,
            message,
            createdAtMs: nowMs,
            appellantUsername: String(ownerMeta.username || appellantKey).slice(0, 40),
            appellantDisplayName: String(ownerMeta.displayName || ownerMeta.username || appellantKey).slice(0, 60),
          }
        : a
    );
  } else {
    const newAppeal: OnlineAppAppealDTO = {
      appealId: `apl_${nowMs.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      appId: existing.app_id,
      targetType,
      appellantKey,
      appellantUsername: String(ownerMeta.username || appellantKey).slice(0, 40),
      appellantDisplayName: String(ownerMeta.displayName || ownerMeta.username || appellantKey).slice(0, 60),
      message,
      status: 'pending',
      createdAtMs: nowMs,
      adminResponse: '',
      respondedAtMs: 0,
      respondedBy: '',
      convoRequested: false,
      convoRequestedBy: '',
      convoRequestedByDisplayName: '',
      convoRequestedAtMs: 0,
      convoPairId: '',
    };
    nextAppeals = [newAppeal, ...existingAppeals].slice(0, 15);
  }

  const rawPending =
    existing.pending_update && typeof existing.pending_update === 'object'
      ? { ...(existing.pending_update as Record<string, unknown>) }
      : {};
  rawPending._liveMeta = {
    ...existingLiveMeta,
    appeals: nextAppeals,
  };

  const { error: updErr } = await supabase
    .from('hub_online_apps')
    .update({
      pending_update: rawPending,
      updated_at: new Date().toISOString(),
    })
    .eq('app_id', existing.app_id);
  if (updErr) throw new Error(updErr.message);
}

export async function resolveOnlineAppAppealInSupabase(
  callerKey: string,
  input: ResolveOnlineAppAppealInput
): Promise<{ pairId?: string; friend?: { ownerId: string; usernameKey: string; username: string; displayName: string; avatar: string; role: 'user' | 'admin' } }> {
  const role = await fetchAccountRoleFromSupabase(callerKey);
  if (role !== 'admin') throw new Error('Admin access required.');

  const { data: existing, error: readErr } = await supabase
    .from('hub_online_apps')
    .select('*')
    .eq('app_id', input.appId)
    .maybeSingle<HubOnlineAppRow>();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error('App not found in Apps Store.');

  const existingLiveMeta = extractLiveMetaFromRow(existing);
  const existingAppeals = existingLiveMeta.appeals || [];
  const targetAppeal = existingAppeals.find((a) => a.appealId === input.appealId);
  if (!targetAppeal) throw new Error('Appeal not found.');

  const nowMs = Date.now();
  const cleanResp = String(input.adminResponse || '').trim().slice(0, 400);

  let convoResult: { pairId: string; friend: { ownerId: string; usernameKey: string; username: string; displayName: string; avatar: string; role: 'user' | 'admin' } } | undefined;
  let adminUsername = callerKey;
  let adminDisplayName = callerKey;

  if (input.decision === 'request_convo') {
    const adminMeta: HubAccountMeta = input.adminAccount?.username
      ? input.adminAccount
      : { username: callerKey, displayName: callerKey };
    adminUsername = String(adminMeta.username || callerKey).slice(0, 40);
    adminDisplayName = String(adminMeta.displayName || adminUsername).slice(0, 60);
    const introMsg = cleanResp
      ? `⚖️ [Appeal Review — "${existing.name}"]: ${cleanResp}`
      : `⚖️ [Appeal Review — "${existing.name}"]: Hi @${existing.author_username}, I'd like to discuss your ${targetAppeal.targetType} appeal here.`;
    convoResult = await ensureAdminAppealConvoInSupabase(adminMeta, existing.author_username, introMsg);
  }

  const nextStatus: OnlineAppAppealStatus =
    input.decision === 'accept'
      ? 'accepted'
      : input.decision === 'request_convo'
      ? 'convo_requested'
      : 'denied';

  const defaultResp =
    input.decision === 'accept'
      ? 'Appeal accepted by Admin.'
      : input.decision === 'request_convo'
      ? `Admin @${adminUsername} requested a conversation in Messaging App.`
      : 'Appeal denied after Admin review.';

  const nextAppeals: OnlineAppAppealDTO[] = existingAppeals.map((a) => {
    if (a.appealId !== input.appealId) return a;
    return {
      ...a,
      status: nextStatus,
      adminResponse: cleanResp || defaultResp,
      respondedAtMs: nowMs,
      respondedBy: callerKey,
      convoRequested: input.decision === 'request_convo' ? true : a.convoRequested,
      convoRequestedBy: input.decision === 'request_convo' ? adminUsername : a.convoRequestedBy,
      convoRequestedByDisplayName: input.decision === 'request_convo' ? adminDisplayName : a.convoRequestedByDisplayName,
      convoRequestedAtMs: input.decision === 'request_convo' ? nowMs : a.convoRequestedAtMs,
      convoPairId: convoResult?.pairId || a.convoPairId,
    };
  });

  const nextLiveMeta: OnlineAppLiveMeta = {
    ...existingLiveMeta,
    appeals: nextAppeals,
  };

  const patch: Record<string, unknown> = {
    reviewed_by_uid: callerKey,
    updated_at: new Date().toISOString(),
  };

  if (input.decision === 'accept') {
    if (targetAppeal.targetType === 'warning') {
      nextLiveMeta.warningMessage = '';
      nextLiveMeta.warnedAtMs = 0;
      nextLiveMeta.warnedBy = '';
      if (nextLiveMeta.moderationState === 'warned') {
        nextLiveMeta.moderationState = 'active';
      }
      patch.admin_note = cleanResp || '';
    } else {
      patch.status = 'approved';
      patch.admin_note = cleanResp || '';
      nextLiveMeta.moderationState = 'active';
      nextLiveMeta.removedByAdmin = false;
      nextLiveMeta.removedReason = '';
      nextLiveMeta.removedAtMs = 0;
      nextLiveMeta.removedBy = '';
      nextLiveMeta.suspendedUntilMs = 0;
      nextLiveMeta.suspensionReason = '';
      nextLiveMeta.suspendedAtMs = 0;
      nextLiveMeta.suspendedBy = '';
      nextLiveMeta.warningMessage = '';
    }
  }

  const rawPending =
    existing.pending_update && typeof existing.pending_update === 'object'
      ? { ...(existing.pending_update as Record<string, unknown>) }
      : {};
  rawPending._liveMeta = nextLiveMeta;
  patch.pending_update = rawPending;

  const { error: updErr } = await supabase
    .from('hub_online_apps')
    .update(patch)
    .eq('app_id', existing.app_id);
  if (updErr) throw new Error(updErr.message);

  return convoResult ? { pairId: convoResult.pairId, friend: convoResult.friend } : {};
}

export async function deleteOnlineAppInSupabase(appId: string): Promise<void> {
  const { error } = await supabase.from('hub_online_apps').delete().eq('app_id', appId);
  if (error) throw new Error(error.message);
}

export async function submitOnlineApp(
  account: HubAccountMeta,
  input: SubmitOnlineAppInput
): Promise<{ ok: boolean; app?: OnlineAppDTO; error?: string }> {
  try {
    const { appId } = await submitOnlineAppInSupabase(account, input);
    const found = await fetchOnlineAppById(appId);
    return { ok: true, app: found.app };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function fetchOnlineApps(
  statusFilter?: OnlineAppStatus
): Promise<{ ok: boolean; apps: OnlineAppDTO[]; error?: string }> {
  try {
    const res = await fetchOnlineAppsFromSupabase();
    const apps = statusFilter ? res.apps.filter((a) => a.status === statusFilter) : res.apps;
    return { ok: res.tablesReady, apps };
  } catch (err) {
    return { ok: false, apps: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function fetchOnlineAppById(
  appId: string
): Promise<{ ok: boolean; app?: OnlineAppDTO; error?: string }> {
  const { data, error } = await supabase
    .from('hub_online_apps')
    .select('*')
    .eq('app_id', appId)
    .maybeSingle<HubOnlineAppRow>();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'App not found.' };
  return { ok: true, app: await mapOnlineAppRowAsync(data) };
}

export async function reviewOnlineApp(
  callerKey: string,
  input: ReviewOnlineAppInput
): Promise<{ ok: boolean; app?: OnlineAppDTO; reviewAction?: string; error?: string }> {
  try {
    const action: 'approve' | 'reject' | 'disable' | 'enable' | 'remove' =
      input.action === 'enable' ||
      input.action === 'disable' ||
      input.action === 'reject' ||
      input.action === 'approve' ||
      input.action === 'remove'
        ? input.action
        : input.status === 'rejected'
        ? 'reject'
        : input.status === 'disabled'
        ? 'disable'
        : 'approve';
    await reviewOnlineAppInSupabase(callerKey, input.appId, action, input.adminNote || '');
    const found = await fetchOnlineAppById(input.appId);
    return { ok: true, app: found.app, reviewAction: action };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function reportOnlineApp(
  account: HubAccountMeta,
  input: ReportOnlineAppInput
): Promise<{ ok: boolean; app?: OnlineAppDTO; error?: string }> {
  try {
    await reportOnlineAppInSupabase(account, input);
    const found = await fetchOnlineAppById(input.appId);
    return { ok: true, app: found.app };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function resolveOnlineAppReport(
  callerKey: string,
  input: ResolveOnlineAppReportInput
): Promise<{ ok: boolean; app?: OnlineAppDTO; decision?: string; error?: string }> {
  try {
    await resolveOnlineAppReportInSupabase(callerKey, input);
    const found = await fetchOnlineAppById(input.appId);
    return { ok: true, app: found.app, decision: input.decision };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function moderateOnlineApp(
  callerKey: string,
  input: ModerateOnlineAppInput
): Promise<{ ok: boolean; app?: OnlineAppDTO; modAction?: string; error?: string }> {
  try {
    await moderateOnlineAppInSupabase(callerKey, input);
    const found = await fetchOnlineAppById(input.appId);
    return { ok: true, app: found.app, modAction: input.action };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function submitOnlineAppAppeal(
  account: HubAccountMeta,
  input: SubmitOnlineAppAppealInput
): Promise<{ ok: boolean; app?: OnlineAppDTO; error?: string }> {
  try {
    await submitOnlineAppAppealInSupabase(account, input);
    const found = await fetchOnlineAppById(input.appId);
    return { ok: true, app: found.app };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function resolveOnlineAppAppeal(
  callerKey: string,
  input: ResolveOnlineAppAppealInput
): Promise<{
  ok: boolean;
  app?: OnlineAppDTO;
  decision?: string;
  pairId?: string;
  friend?: {
    ownerId: string;
    usernameKey: string;
    username: string;
    displayName: string;
    avatar: string;
    role: 'user' | 'admin';
  };
  error?: string;
}> {
  try {
    const res = await resolveOnlineAppAppealInSupabase(callerKey, input);
    const found = await fetchOnlineAppById(input.appId);
    return {
      ok: true,
      app: found.app,
      decision: input.decision,
      pairId: res.pairId,
      friend: res.friend,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateOnlineApp(
  account: HubAccountMeta,
  input: UpdateOnlineAppInput
): Promise<{ ok: boolean; app?: OnlineAppDTO; staged?: boolean; error?: string }> {
  try {
    const res = await submitOnlineAppUpdateInSupabase(toSafeAccountKey(account.username), input.appId, {
      name: input.name || 'Untitled App',
      description: input.description,
      about: input.about,
      icon: input.icon,
      sourceMode: input.sourceMode || 'html',
      appUrl: input.appUrl,
      dataStorageMode: input.dataStorageMode,
      code: input.code,
      htmlCode: input.htmlCode,
      cssCode: input.cssCode,
      jsCode: input.jsCode,
    });
    const found = await fetchOnlineAppById(input.appId);
    return { ok: true, app: found.app, staged: res.staged };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteOnlineApp(
  accountOrKey: HubAccountMeta | string,
  appId: string
): Promise<{ ok: boolean; error?: string }> {
  const usernameKey =
    typeof accountOrKey === 'string'
      ? toSafeAccountKey(accountOrKey)
      : toSafeAccountKey(accountOrKey.username);
  const { data: existing, error: readErr } = await supabase
    .from('hub_online_apps')
    .select('app_id, author_username_key')
    .eq('app_id', appId)
    .maybeSingle<Pick<HubOnlineAppRow, 'app_id' | 'author_username_key'>>();
  if (readErr) return { ok: false, error: readErr.message };
  if (!existing) return { ok: false, error: 'App not found.' };
  const callerRole = await fetchAccountRoleFromSupabase(usernameKey);
  if (existing.author_username_key !== usernameKey && callerRole !== 'admin') {
    return { ok: false, error: 'You do not own this app.' };
  }
  await deleteOnlineAppInSupabase(appId);
  return { ok: true };
}

export function subscribeOnlineAppsRealtime(onChange: () => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`hub_online_apps_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_online_apps' }, () => {
      onChange();
    })
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeOnlineApps(onUpdate: (apps: OnlineAppDTO[]) => void): () => void {
  return subscribeOnlineAppsRealtime(async () => {
    const res = await fetchOnlineApps();
    if (res.ok) onUpdate(res.apps);
  });
}
