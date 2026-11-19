import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type {
  BucketName,
  ChatMessageDTO,
  ChatThreadDTO,
  CloudBucketPayload,
  FriendshipDTO,
  HubAccountMeta,
  LoadedCloudAccount,
  ParticipantMiniProfile,
} from './firebaseSync';
import { makeSortedPair, toSafeAccountKey, VALID_BUCKETS } from './firebaseSync';

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
