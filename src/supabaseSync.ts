import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

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
  buckets: Partial<Record<BucketName, CloudBucketPayload>>;
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

export function toSafeAccountKey(username: string): string {
  const cleaned = String(username || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  if (cleaned.length >= 2) return cleaned;
  return ('acc_' + cleaned).slice(0, 40);
}

export function makeSortedPair(uid1: string, uid2: string): { pairId: string; participants: [string, string] } {
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

function isMissingTableError(err: { code?: string; message?: string; status?: number } | null | undefined): boolean {
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

function toMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
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
  const avatar = String(meta.avatar || '').slice(0, 40000);
  const theme: 'light' | 'dark' = meta.theme === 'dark' ? 'dark' : 'light';
  const agentDataPerm = typeof meta.agentDataPerm === 'boolean' ? meta.agentDataPerm : true;
  return { usernameKey, username, displayName, avatar, theme, agentDataPerm };
}

function cleanBucketsMap(
  buckets?: Partial<Record<BucketName, CloudBucketPayload>>
): Partial<Record<BucketName, CloudBucketPayload>> {
  const clean: Partial<Record<BucketName, CloudBucketPayload>> = {};
  if (!buckets || typeof buckets !== 'object') return clean;
  for (const name of VALID_BUCKETS) {
    const b = buckets[name];
    if (b && typeof b === 'object') {
      clean[name] = {
        ...(Array.isArray(b.items) ? { items: b.items.slice(0, 200) } : {}),
        ...(b.settings && typeof b.settings === 'object' ? { settings: b.settings } : {}),
      };
    }
  }
  return clean;
}

export async function checkSupabaseTablesReady(): Promise<SupabaseSchemaStatus> {
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
  account?: LoadedCloudAccount;
  error?: string;
}> {
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

  return {
    ok: true,
    tablesReady: true,
    account: {
      accountKey: data.username_key,
      username: data.username,
      displayName: data.display_name || data.username,
      avatar: data.avatar || '',
      accountType: 'online',
      role: data.role === 'admin' ? 'admin' : 'user',
      theme: data.theme === 'dark' ? 'dark' : 'light',
      agentDataPerm: typeof data.agent_data_perm === 'boolean' ? data.agent_data_perm : true,
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
  accounts: Array<{
    usernameKey: string;
    username: string;
    displayName: string;
    avatar: string;
    role: 'user' | 'admin';
  }>;
}> {
  const callerRole = await fetchAccountRoleFromSupabase(callerKey);
  if (callerRole !== 'admin') {
    throw new Error('Admin access required.');
  }
  const { data, error } = await supabase
    .from('hub_accounts')
    .select('username_key, username, display_name, avatar, role')
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  const accounts = ((data as Array<Pick<HubAccountRow, 'username_key' | 'username' | 'display_name' | 'avatar' | 'role'>> | null) || []).map((row) => ({
    usernameKey: row.username_key,
    username: row.username,
    displayName: row.display_name || row.username,
    avatar: row.avatar || '',
    role: (row.role === 'admin' ? 'admin' : 'user') as 'user' | 'admin',
  }));
  return { isAdmin: true, accounts };
}

export async function setAccountRoleInSupabase(
  callerKey: string,
  targetUsernameRaw: string,
  role: 'user' | 'admin'
): Promise<{
  targetUsername: string;
  role: 'user' | 'admin';
  accounts: Array<{
    usernameKey: string;
    username: string;
    displayName: string;
    avatar: string;
    role: 'user' | 'admin';
  }>;
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

export async function syncOnlineAccountToSupabase(
  meta: HubAccountMeta,
  buckets: Partial<Record<BucketName, CloudBucketPayload>>,
  password?: string
): Promise<{ ok: boolean; tablesReady: boolean; error?: string }> {
  const clean = sanitizeAccountPayload(meta);
  const { data: existing, error: readErr } = await supabase
    .from('hub_accounts')
    .select('username_key, password_hash, buckets')
    .eq('username_key', clean.usernameKey)
    .maybeSingle<Pick<HubAccountRow, 'username_key' | 'password_hash' | 'buckets'>>();

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
    return { ok: true, tablesReady: true };
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

  return { ok: true, tablesReady: true };
}

export async function syncSingleBucketToSupabase(
  meta: HubAccountMeta,
  bucketName: BucketName,
  payload: CloudBucketPayload
): Promise<void> {
  if (!VALID_BUCKETS.includes(bucketName)) return;
  await syncOnlineAccountToSupabase(meta, { [bucketName]: payload });
}

export async function deleteOnlineAccountFromSupabase(username: string): Promise<void> {
  const key = toSafeAccountKey(username);
  await supabase.from('hub_accounts').delete().eq('username_key', key);
}

/* ---------- Friends & Real-Time Messaging via Supabase ---------- */

function buildMini(username: string, displayName: string, avatar: string): ParticipantMiniProfile {
  const usernameKey = toSafeAccountKey(username);
  return {
    username: String(username || usernameKey).slice(0, 40),
    usernameKey,
    displayName: String(displayName || username || usernameKey).slice(0, 60),
    avatar: String(avatar || '').slice(0, 2048),
    role: 'user',
  };
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

  const friendships: FriendshipDTO[] = (data as HubFriendshipRow[] | null || []).map((row) => ({
    pairId: row.pair_id,
    participants: [row.user_a, row.user_b],
    requesterId: row.requester_key,
    status: row.status === 'accepted' ? 'accepted' : 'pending',
    profiles: row.profiles || {},
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

  const chats: ChatThreadDTO[] = ((fData as HubFriendshipRow[] | null) || []).map((f) => {
    const latest = latestByChat.get(f.pair_id);
    return {
      chatId: f.pair_id,
      participants: [f.user_a, f.user_b],
      profiles: f.profiles || {},
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
  moderation_status: 'active' | 'suspended' | 'banned';
  ban_message: string;
  suspended_until_ms: number;
}

export async function fetchAccountModerationStatus(usernameKey: string): Promise<{
  moderationStatus: 'active' | 'suspended' | 'banned';
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
    if (isMissingTableError(error)) {
      return { moderationStatus: 'active', banMessage: '', suspendedUntilMs: 0, isSuspended: false, isBanned: false, role: 'user' };
    }
    throw new Error(error.message);
  }
  if (!data) {
    return { moderationStatus: 'active', banMessage: '', suspendedUntilMs: 0, isSuspended: false, isBanned: false, role: 'user' };
  }
  const status = data.moderation_status === 'suspended' || data.moderation_status === 'banned' ? data.moderation_status : 'active';
  const now = Date.now();
  const isSuspended = status === 'suspended' && data.suspended_until_ms > now;
  const isBanned = status === 'banned';
  return {
    moderationStatus: status,
    banMessage: data.ban_message || '',
    suspendedUntilMs: data.suspended_until_ms || 0,
    isSuspended,
    isBanned,
    role: data.role === 'admin' ? 'admin' : 'user',
  };
}

export async function setAccountModeration(
  callerKey: string,
  targetUsernameKey: string,
  moderationStatus: 'active' | 'suspended' | 'banned',
  banMessage?: string,
  suspendedUntilMs?: number
): Promise<{ ok: boolean; targetUsername: string; moderationStatus: 'active' | 'suspended' | 'banned'; error?: string }> {
  const callerRole = await fetchAccountRoleFromSupabase(callerKey);
  if (callerRole !== 'admin') {
    return { ok: false, targetUsername: '', moderationStatus: 'active', error: 'Admin access required.' };
  }
  const { data: targetRow, error: readErr } = await supabase
    .from('hub_accounts')
    .select('username_key, username, moderation_status')
    .eq('username_key', targetUsernameKey)
    .maybeSingle<Pick<HubAccountModerationRow, 'username_key' | 'username' | 'moderation_status'>>();
  if (readErr) throw new Error(readErr.message);
  if (!targetRow) {
    return { ok: false, targetUsername: '', moderationStatus: 'active', error: 'No account found.' };
  }
  const updateData: Record<string, unknown> = {
    moderation_status: moderationStatus,
    updated_at: new Date().toISOString(),
  };
  if (moderationStatus === 'banned') {
    updateData.ban_message = String(banMessage || 'Account banned.');
    updateData.suspended_until_ms = 0;
  } else if (moderationStatus === 'suspended') {
    updateData.ban_message = String(banMessage || 'Account suspended.');
    updateData.suspended_until_ms = suspendedUntilMs ? Number(suspendedUntilMs) : Date.now() + 24 * 60 * 60 * 1000;
  } else {
    updateData.ban_message = '';
    updateData.suspended_until_ms = 0;
  }
  const { error: updErr } = await supabase
    .from('hub_accounts')
    .update(updateData)
    .eq('username_key', targetUsernameKey);
  if (updErr) throw new Error(updErr.message);
  return { ok: true, targetUsername: targetRow.username, moderationStatus };
}

/* ---------- Online Apps Store (Supabase) ---------- */

interface HubOnlineAppRow {
  app_id: string;
  name: string;
  description: string;
  icon: string;
  author_uid: string;
  author_username: string;
  author_username_key: string;
  author_display_name: string;
  source_mode: 'html' | 'bundle';
  code: string;
  html_code: string;
  css_code: string;
  js_code: string;
  status: 'pending' | 'approved' | 'rejected' | 'disabled';
  version: number;
  admin_note: string;
  reviewed_by_uid: string;
  has_pending_update: boolean;
  pending_update: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function mapOnlineAppRow(row: HubOnlineAppRow): OnlineAppDTO {
  return {
    appId: row.app_id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    authorUid: row.author_uid,
    authorUsername: row.author_username,
    authorUsernameKey: row.author_username_key,
    authorDisplayName: row.author_display_name,
    sourceMode: row.source_mode,
    code: row.code,
    htmlCode: row.html_code,
    cssCode: row.css_code,
    jsCode: row.js_code,
    status: row.status,
    version: row.version,
    adminNote: row.admin_note,
    reviewedByUid: row.reviewed_by_uid,
    hasPendingUpdate: row.has_pending_update,
    pendingUpdate: row.pending_update || {},
    createdAtMs: toMs(row.created_at),
    updatedAtMs: toMs(row.updated_at),
  };
}

export async function submitOnlineApp(
  account: HubAccountMeta,
  input: SubmitOnlineAppInput
): Promise<{ ok: boolean; app?: OnlineAppDTO; error?: string }> {
  const usernameKey = toSafeAccountKey(account.username);
  const appId = `app_${usernameKey}_${Date.now().toString(36)}`;
  const cleanName = String(input.name || '').trim().slice(0, 80);
  const cleanDesc = String(input.description || '').slice(0, 500);
  const cleanIcon = String(input.icon || '').slice(0, 500);
  const sourceMode = input.sourceMode === 'bundle' ? 'bundle' : 'html';
  const cleanCode = String(input.code || '').slice(0, 100000);
  const cleanHtml = String(input.htmlCode || '').slice(0, 100000);
  const cleanCss = String(input.cssCode || '').slice(0, 50000);
  const cleanJs = String(input.jsCode || '').slice(0, 50000);
  const now = new Date().toISOString();

  const { error } = await supabase.from('hub_online_apps').insert({
    app_id: appId,
    name: cleanName,
    description: cleanDesc,
    icon: cleanIcon,
    author_uid: usernameKey,
    author_username: account.username || usernameKey,
    author_username_key: usernameKey,
    author_display_name: account.displayName || account.username || usernameKey,
    source_mode: sourceMode,
    code: cleanCode,
    html_code: cleanHtml,
    css_code: cleanCss,
    js_code: cleanJs,
    status: 'pending',
    version: 1,
    admin_note: '',
    reviewed_by_uid: '',
    has_pending_update: false,
    pending_update: {},
    created_at: now,
    updated_at: now,
  });
  if (error) {
    if (isMissingTableError(error)) return { ok: false, error: 'Online Apps table not initialized. Run the setup SQL first.' };
    return { ok: false, error: error.message };
  }
  const app: OnlineAppDTO = {
    appId,
    name: cleanName,
    description: cleanDesc,
    icon: cleanIcon,
    authorUid: usernameKey,
    authorUsername: account.username || usernameKey,
    authorUsernameKey: usernameKey,
    authorDisplayName: account.displayName || account.username || usernameKey,
    sourceMode,
    code: cleanCode,
    htmlCode: cleanHtml,
    cssCode: cleanCss,
    jsCode: cleanJs,
    status: 'pending',
    version: 1,
    adminNote: '',
    reviewedByUid: '',
    hasPendingUpdate: false,
    pendingUpdate: {},
    createdAtMs: Date.now(),
    updatedAtMs: Date.now(),
  };
  return { ok: true, app };
}

export async function fetchOnlineApps(statusFilter?: 'pending' | 'approved' | 'rejected' | 'disabled'): Promise<{
  ok: boolean;
  apps: OnlineAppDTO[];
  error?: string;
}> {
  let query = supabase.from('hub_online_apps').select('*').order('created_at', { ascending: false });
  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }
  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return { ok: false, apps: [], error: 'Online Apps table not initialized.' };
    return { ok: false, apps: [], error: error.message };
  }
  const apps = ((data as HubOnlineAppRow[] | null) || []).map(mapOnlineAppRow);
  return { ok: true, apps };
}

export async function fetchOnlineAppById(appId: string): Promise<{
  ok: boolean;
  app?: OnlineAppDTO;
  error?: string;
}> {
  const { data, error } = await supabase
    .from('hub_online_apps')
    .select('*')
    .eq('app_id', appId)
    .maybeSingle<HubOnlineAppRow>();
  if (error) {
    if (isMissingTableError(error)) return { ok: false, error: 'Online Apps table not initialized.' };
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: 'App not found.' };
  return { ok: true, app: mapOnlineAppRow(data) };
}

export async function reviewOnlineApp(
  callerKey: string,
  input: ReviewOnlineAppInput
): Promise<{ ok: boolean; app?: OnlineAppDTO; error?: string }> {
  const callerRole = await fetchAccountRoleFromSupabase(callerKey);
  if (callerRole !== 'admin') {
    return { ok: false, error: 'Admin access required.' };
  }
  const { data: existing, error: readErr } = await supabase
    .from('hub_online_apps')
    .select('*')
    .eq('app_id', input.appId)
    .maybeSingle<HubOnlineAppRow>();
  if (readErr) throw new Error(readErr.message);
  if (!existing) {
    return { ok: false, error: 'App not found.' };
  }
  const updateData: Record<string, unknown> = {
    status: input.status,
    admin_note: String(input.adminNote || ''),
    reviewed_by_uid: callerKey,
    updated_at: new Date().toISOString(),
  };
  if (input.status === 'approved') {
    updateData.has_pending_update = false;
    updateData.pending_update = {};
  }
  const { error: updErr } = await supabase
    .from('hub_online_apps')
    .update(updateData)
    .eq('app_id', input.appId);
  if (updErr) throw new Error(updErr.message);
  const { data: updated } = await supabase
    .from('hub_online_apps')
    .select('*')
    .eq('app_id', input.appId)
    .maybeSingle<HubOnlineAppRow>();
  return { ok: true, app: updated ? mapOnlineAppRow(updated) : undefined };
}

export async function updateOnlineApp(
  account: HubAccountMeta,
  input: UpdateOnlineAppInput
): Promise<{ ok: boolean; app?: OnlineAppDTO; error?: string }> {
  const usernameKey = toSafeAccountKey(account.username);
  const { data: existing, error: readErr } = await supabase
    .from('hub_online_apps')
    .select('*')
    .eq('app_id', input.appId)
    .maybeSingle<HubOnlineAppRow>();
  if (readErr) throw new Error(readErr.message);
  if (!existing) {
    return { ok: false, error: 'App not found.' };
  }
  if (existing.author_username_key !== usernameKey) {
    return { ok: false, error: 'You do not own this app.' };
  }
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    version: (existing.version || 1) + 1,
    has_pending_update: true,
    pending_update: {},
  };
  if (input.name !== undefined) updateData.name = String(input.name).slice(0, 80);
  if (input.description !== undefined) updateData.description = String(input.description).slice(0, 500);
  if (input.icon !== undefined) updateData.icon = String(input.icon).slice(0, 500);
  if (input.sourceMode !== undefined) updateData.source_mode = input.sourceMode;
  if (input.code !== undefined) updateData.code = String(input.code).slice(0, 100000);
  if (input.htmlCode !== undefined) updateData.html_code = String(input.htmlCode).slice(0, 100000);
  if (input.cssCode !== undefined) updateData.css_code = String(input.cssCode).slice(0, 50000);
  if (input.jsCode !== undefined) updateData.js_code = String(input.jsCode).slice(0, 50000);
  const { error: updErr } = await supabase
    .from('hub_online_apps')
    .update(updateData)
    .eq('app_id', input.appId);
  if (updErr) throw new Error(updErr.message);
  const { data: updated } = await supabase
    .from('hub_online_apps')
    .select('*')
    .eq('app_id', input.appId)
    .maybeSingle<HubOnlineAppRow>();
  return { ok: true, app: updated ? mapOnlineAppRow(updated) : undefined };
}

export async function deleteOnlineApp(
  account: HubAccountMeta,
  appId: string
): Promise<{ ok: boolean; error?: string }> {
  const usernameKey = toSafeAccountKey(account.username);
  const { data: existing, error: readErr } = await supabase
    .from('hub_online_apps')
    .select('app_id, author_username_key, status')
    .eq('app_id', appId)
    .maybeSingle<Pick<HubOnlineAppRow, 'app_id' | 'author_username_key' | 'status'>>();
  if (readErr) throw new Error(readErr.message);
  if (!existing) {
    return { ok: false, error: 'App not found.' };
  }
  if (existing.author_username_key !== usernameKey) {
    return { ok: false, error: 'You do not own this app.' };
  }
  const callerRole = await fetchAccountRoleFromSupabase(usernameKey);
  if (existing.status === 'approved' && callerRole !== 'admin') {
    return { ok: false, error: 'Approved apps can only be deleted by an admin.' };
  }
  const { error } = await supabase.from('hub_online_apps').delete().eq('app_id', appId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export function subscribeOnlineApps(
  onUpdate: (apps: OnlineAppDTO[]) => void
): () => void {
  const channel = supabase
    .channel(`hub_online_apps_${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hub_online_apps' },
      async () => {
        const res = await fetchOnlineApps();
        if (res.ok) onUpdate(res.apps);
      }
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
