/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import {
  type BucketName,
  type CloudBucketPayload,
  type HubAccountMeta,
  toSafeAccountKey,
} from './supabaseSync';
import {
  acceptFriendRequestInSupabase,
  addFriendByUsernameInSupabase,
  checkSupabaseTablesReady,
  deleteOnlineAccountFromSupabase,
  fetchAccountModerationStatus,
  fetchAccountRoleFromSupabase,
  fetchAdminDirectoryFromSupabase,
  fetchChatMessagesFromSupabase,
  fetchChatsFromSupabase,
  fetchFriendshipsFromSupabase,
  fetchOnlineAppById,
  fetchOnlineApps,
  loginOnlineAccountFromSupabase,
  registerOnlineAccountInSupabase,
  removeFriendshipInSupabase,
  reviewOnlineApp,
  sendMessageInSupabase,
  setAccountModeration,
  setAccountRoleInSupabase,
  submitOnlineApp,
  subscribeOnlineApps,
  subscribeUserSocialRealtime,
  syncOnlineAccountToSupabase,
  syncSingleBucketToSupabase,
  updateOnlineApp,
  deleteOnlineApp,
} from './supabaseSync';
import type { OnlineAppDTO } from './supabaseSync';

interface CloudBridgeMessage {
  type: string;
  requestId?: string;
  payload?: Record<string, unknown>;
}

function formatReadableError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default function App() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const activeKeyRef = useRef<string | null>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const tablesReadyRef = useRef<boolean>(false);
  const unsubRealtimeRef = useRef<(() => void) | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const postToHub = (msg: Record<string, unknown>) => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.postMessage(msg, window.location.origin);
    }
  };

  const clearRealtime = () => {
    unsubRealtimeRef.current?.();
    unsubRealtimeRef.current = null;
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const refreshSocialState = async (myKey: string) => {
    try {
      const [fRes, cRes] = await Promise.all([
        fetchFriendshipsFromSupabase(myKey),
        fetchChatsFromSupabase(myKey),
      ]);
      tablesReadyRef.current = fRes.tablesReady && cRes.tablesReady;
      postToHub({
        type: 'MYAPPS_FB_FRIENDSHIPS',
        uid: myKey,
        friendships: fRes.friendships,
      });
      postToHub({
        type: 'MYAPPS_FB_CHATS',
        uid: myKey,
        chats: cRes.chats,
      });
      if (activeChatIdRef.current) {
        const msgs = await fetchChatMessagesFromSupabase(activeChatIdRef.current);
        postToHub({
          type: 'MYAPPS_FB_CHAT_MESSAGES',
          chatId: activeChatIdRef.current,
          messages: msgs,
        });
      }
    } catch (err) {
      postToHub({
        type: 'MYAPPS_FB_ERROR',
        error: formatReadableError(err),
      });
    }
  };

  const attachSocialForKey = async (myKey: string) => {
    clearRealtime();
    activeKeyRef.current = myKey;
    await refreshSocialState(myKey);
    unsubRealtimeRef.current = subscribeUserSocialRealtime(
      myKey,
      () => {
        if (activeKeyRef.current) void refreshSocialState(activeKeyRef.current);
      },
      () => {
        if (activeKeyRef.current) void refreshSocialState(activeKeyRef.current);
      }
    );
    pollTimerRef.current = window.setInterval(() => {
      if (activeKeyRef.current && tablesReadyRef.current) {
        void refreshSocialState(activeKeyRef.current);
      }
    }, 5000);
  };

  const broadcastSupabaseStatus = async () => {
    const status = await checkSupabaseTablesReady();
    tablesReadyRef.current = status.tablesReady;
    const myKey = activeKeyRef.current;
    const role = status.tablesReady && myKey ? await fetchAccountRoleFromSupabase(myKey) : 'user';
    postToHub({
      type: 'MYAPPS_FB_STATUS',
      connected: status.tablesReady,
      tablesReady: status.tablesReady,
      ready: true,
      backend: 'supabase',
      uid: myKey,
      email: null,
      displayName: null,
      isAdmin: role === 'admin',
      isBootstrappedAdmin: false,
      ...(status.error ? { error: status.error } : {}),
    });
    if (status.tablesReady && myKey) {
      await attachSocialForKey(myKey);
    }
  };

  useEffect(() => {
    void broadcastSupabaseStatus();
    return () => clearRealtime();
  }, []);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data as CloudBridgeMessage | null;
      if (!data || typeof data.type !== 'string' || !data.type.startsWith('MYAPPS_FB_')) return;

      if (data.type === 'MYAPPS_FB_REQUEST_STATUS') {
        await broadcastSupabaseStatus();
        return;
      }

      if (data.type === 'MYAPPS_FB_SET_ACTIVE_USER') {
        const username = String(data.payload?.username || '').trim();
        const isOnline = Boolean(data.payload?.accountType === 'online');
        if (!username || !isOnline) {
          activeKeyRef.current = null;
          activeChatIdRef.current = null;
          clearRealtime();
          postToHub({
            type: 'MYAPPS_FB_STATUS',
            connected: tablesReadyRef.current,
            tablesReady: tablesReadyRef.current,
            ready: true,
            backend: 'supabase',
            uid: null,
            email: null,
            displayName: null,
            isAdmin: false,
            isBootstrappedAdmin: false,
          });
          return;
        }
        const myKey = toSafeAccountKey(username);
        activeKeyRef.current = myKey;
        const status = await checkSupabaseTablesReady();
        tablesReadyRef.current = status.tablesReady;
        const role = status.tablesReady ? await fetchAccountRoleFromSupabase(myKey) : 'user';
        postToHub({
          type: 'MYAPPS_FB_STATUS',
          connected: status.tablesReady,
          tablesReady: status.tablesReady,
          ready: true,
          backend: 'supabase',
          uid: myKey,
          email: null,
          displayName: null,
          isAdmin: role === 'admin',
          isBootstrappedAdmin: false,
        });
        if (status.tablesReady) {
          await attachSocialForKey(myKey);
        }
        return;
      }

      if (data.type === 'MYAPPS_FB_SIGNUP_ONLINE' && data.payload) {
        try {
          const account = data.payload.account as HubAccountMeta;
          const password = String(data.payload.password || '');
          const buckets = (data.payload.buckets || {}) as Partial<Record<BucketName, CloudBucketPayload>>;
          const res = await registerOnlineAccountInSupabase(account, password, buckets);
          tablesReadyRef.current = res.tablesReady;
          if (res.ok) {
            const myKey = toSafeAccountKey(account.username);
            activeKeyRef.current = myKey;
            await attachSocialForKey(myKey);
          }
          postToHub({
            type: 'MYAPPS_FB_SIGNUP_RESULT',
            requestId: data.requestId || null,
            ...res,
          });
        } catch (err) {
          postToHub({
            type: 'MYAPPS_FB_SIGNUP_RESULT',
            requestId: data.requestId || null,
            ok: false,
            tablesReady: tablesReadyRef.current,
            error: formatReadableError(err),
          });
        }
        return;
      }

      if (data.type === 'MYAPPS_FB_LOGIN_ONLINE' && data.payload) {
        try {
          const username = String(data.payload.username || '');
          const password = String(data.payload.password || '');
          const res = await loginOnlineAccountFromSupabase(username, password);
          tablesReadyRef.current = res.tablesReady;
          if (res.ok && res.account) {
            activeKeyRef.current = res.account.accountKey;
            await attachSocialForKey(res.account.accountKey);
          }
          postToHub({
            type: 'MYAPPS_FB_LOGIN_RESULT',
            requestId: data.requestId || null,
            ...res,
          });
        } catch (err) {
          postToHub({
            type: 'MYAPPS_FB_LOGIN_RESULT',
            requestId: data.requestId || null,
            ok: false,
            tablesReady: tablesReadyRef.current,
            error: formatReadableError(err),
          });
        }
        return;
      }

      if (data.type === 'MYAPPS_FB_SYNC_ACCOUNT' && data.payload) {
        try {
          const account = data.payload.account as HubAccountMeta;
          const buckets = (data.payload.buckets || {}) as Partial<Record<BucketName, CloudBucketPayload>>;
          const password = data.payload.password ? String(data.payload.password) : undefined;
          const res = await syncOnlineAccountToSupabase(account, buckets, password);
          tablesReadyRef.current = res.tablesReady;
          const myKey = toSafeAccountKey(account.username);
          const role = res.tablesReady ? await fetchAccountRoleFromSupabase(myKey) : 'user';
          postToHub({
            type: 'MYAPPS_FB_SYNC_RESULT',
            ok: res.ok,
            tablesReady: res.tablesReady,
            username: account.username,
            role,
            error: res.error,
            requestId: data.requestId || null,
          });
        } catch (err) {
          postToHub({
            type: 'MYAPPS_FB_SYNC_RESULT',
            ok: false,
            error: formatReadableError(err),
            requestId: data.requestId || null,
          });
        }
        return;
      }

      if (data.type === 'MYAPPS_FB_SYNC_BUCKET' && data.payload) {
        try {
          const account = data.payload.account as HubAccountMeta;
          const bucketName = data.payload.bucketName as BucketName;
          const bucketData = (data.payload.data || {}) as CloudBucketPayload;
          await syncSingleBucketToSupabase(account, bucketName, bucketData);
          postToHub({
            type: 'MYAPPS_FB_SYNC_RESULT',
            ok: true,
            bucketName,
            username: account.username,
            requestId: data.requestId || null,
          });
        } catch (err) {
          postToHub({
            type: 'MYAPPS_FB_SYNC_RESULT',
            ok: false,
            error: formatReadableError(err),
            requestId: data.requestId || null,
          });
        }
        return;
      }

      if (data.type === 'MYAPPS_FB_DELETE_ACCOUNT' && data.payload) {
        try {
          const username = String(data.payload.username || '');
          if (username) await deleteOnlineAccountFromSupabase(username);
        } catch (err) {
          postToHub({
            type: 'MYAPPS_FB_ERROR',
            error: formatReadableError(err),
          });
        }
        return;
      }

      if (data.type === 'MYAPPS_FB_FRIEND_ADD' && data.payload) {
        try {
          const account = data.payload.account as HubAccountMeta;
          const targetUsername = String(data.payload.targetUsername || '');
          const password = data.payload.password ? String(data.payload.password) : undefined;
          await syncOnlineAccountToSupabase(account, {}, password);
          const res = await addFriendByUsernameInSupabase(account, targetUsername);
          const myKey = toSafeAccountKey(account.username);
          await refreshSocialState(myKey);
          postToHub({
            type: 'MYAPPS_FB_FRIEND_ACTION_RESULT',
            ok: true,
            action: 'add',
            result: res,
          });
        } catch (err) {
          postToHub({
            type: 'MYAPPS_FB_FRIEND_ACTION_RESULT',
            ok: false,
            action: 'add',
            error: formatReadableError(err),
          });
        }
        return;
      }

      if (data.type === 'MYAPPS_FB_FRIEND_ACCEPT' && data.payload) {
        try {
          const pairId = String(data.payload.pairId || '');
          await acceptFriendRequestInSupabase(pairId);
          if (activeKeyRef.current) await refreshSocialState(activeKeyRef.current);
          postToHub({
            type: 'MYAPPS_FB_FRIEND_ACTION_RESULT',
            ok: true,
            action: 'accept',
            pairId,
          });
        } catch (err) {
          postToHub({
            type: 'MYAPPS_FB_FRIEND_ACTION_RESULT',
            ok: false,
            action: 'accept',
            error: formatReadableError(err),
          });
        }
        return;
      }

      if (data.type === 'MYAPPS_FB_FRIEND_REMOVE' && data.payload) {
        try {
          const pairId = String(data.payload.pairId || '');
          await removeFriendshipInSupabase(pairId);
          if (activeChatIdRef.current === pairId) activeChatIdRef.current = null;
          if (activeKeyRef.current) await refreshSocialState(activeKeyRef.current);
          postToHub({
            type: 'MYAPPS_FB_FRIEND_ACTION_RESULT',
            ok: true,
            action: 'remove',
            pairId,
          });
        } catch (err) {
          postToHub({
            type: 'MYAPPS_FB_FRIEND_ACTION_RESULT',
            ok: false,
            action: 'remove',
            error: formatReadableError(err),
          });
        }
        return;
      }

      if (data.type === 'MYAPPS_FB_OPEN_CHAT' && data.payload) {
        try {
          const pairId = String(data.payload.pairId || '');
          const friendUid = String(data.payload.friendUid || '');
          activeChatIdRef.current = pairId;
          const messages = await fetchChatMessagesFromSupabase(pairId);
          postToHub({
            type: 'MYAPPS_FB_CHAT_MESSAGES',
            chatId: pairId,
            messages,
          });
          postToHub({
            type: 'MYAPPS_FB_CHAT_OPENED',
            ok: true,
            chatId: pairId,
            friendUid,
          });
        } catch (err) {
          postToHub({
            type: 'MYAPPS_FB_CHAT_OPENED',
            ok: false,
            error: formatReadableError(err),
          });
        }
        return;
      }

      if (data.type === 'MYAPPS_FB_CLOSE_CHAT') {
        activeChatIdRef.current = null;
        return;
      }

      if (data.type === 'MYAPPS_FB_SEND_MESSAGE' && data.payload) {
        try {
          const account = data.payload.account as HubAccountMeta;
          const friendUid = String(data.payload.friendUid || '');
          const text = String(data.payload.text || '');
          await sendMessageInSupabase(account, friendUid, text);
          if (activeKeyRef.current) await refreshSocialState(activeKeyRef.current);
          postToHub({
            type: 'MYAPPS_FB_MESSAGE_SENT',
            ok: true,
          });
        } catch (err) {
          postToHub({
            type: 'MYAPPS_FB_MESSAGE_SENT',
            ok: false,
            error: formatReadableError(err),
          });
        }
        return;
      }

      if (data.type === 'MYAPPS_FB_ADMIN_LOAD') {
        try {
          const callerKey = activeKeyRef.current || '';
          const dir = await fetchAdminDirectoryFromSupabase(callerKey);
          postToHub({
            type: 'MYAPPS_FB_ADMIN_DATA',
            ok: true,
            dashboard: dir,
          });
        } catch (err) {
          postToHub({
            type: 'MYAPPS_FB_ADMIN_DATA',
            ok: false,
            error: formatReadableError(err),
          });
        }
        return;
      }

      if (data.type === 'MYAPPS_FB_ADMIN_SET_ROLE' && data.payload) {
        try {
          const callerKey = activeKeyRef.current || '';
          const targetUsername = String(data.payload.username || '');
          const role = data.payload.role === 'admin' ? 'admin' : 'user';
          const result = await setAccountRoleInSupabase(callerKey, targetUsername, role);
          postToHub({
            type: 'MYAPPS_FB_ADMIN_ACTION_RESULT',
            ok: true,
            targetUsername: result.targetUsername,
            role: result.role,
            dashboard: { isAdmin: true, accounts: result.accounts },
          });
        } catch (err) {
          postToHub({
            type: 'MYAPPS_FB_ADMIN_ACTION_RESULT',
            ok: false,
            error: formatReadableError(err),
          });
        }
        return;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden m-0 p-0 bg-[#f3f5f9] dark:bg-[#111522]">
      <iframe
        ref={iframeRef}
        src={`${import.meta.env.BASE_URL}assets/aistudio/My-Apps-Hub_f6c97383.html?v=202611180358`}
        title="My Apps Hub"
        className="w-full h-full border-0 block"
        allow="camera; microphone; accelerometer; gyroscope; display-capture"
        onLoad={() => {
          void broadcastSupabaseStatus();
        }}
      />
    </div>
  );
}
