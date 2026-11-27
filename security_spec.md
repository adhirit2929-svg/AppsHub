# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default Deny**: Every path not explicitly matched is denied (`match /{document=**} { allow read, write: if false; }`).
2. **Verified Owner Isolation**: Only authenticated users with verified emails (`request.auth != null && request.auth.token.email_verified == true`) may read or write their own `/users/{userId}` tree (`request.auth.uid == userId`).
3. **PII Isolation**: User email is isolated in `/users/{userId}/private/info` and restricted strictly to the owner (`get` only, `list` denied). `/onlineProfiles` contains zero PII.
4. **Explicit Trusted RBAC**: Only UIDs explicitly stored in `/admins/{uid}` (with `email_verified == true`) satisfy `isAdmin()`. No email is automatically promoted. Non-admins cannot self-assign `role: 'admin'` on `/onlineProfiles` or write `/admins/{uid}` unless claiming an explicit admin-created `/adminInvites/{usernameKey}` matching their verified owned `/onlineProfiles/{usernameKey}`.
5. **Username Directory & Friendships**: `/onlineProfiles/{usernameKey}` allows verified `get` by exact usernameKey (no public `list`) so friends can add each other by username; `list` is restricted to `isAdmin()`. `/friendships/{pairId}` is strictly scoped to its 2 `participants` (`userA__userB`), requiring `requesterId == request.auth.uid` on create and allowing only the recipient to accept (`pending -> accepted`).
6. **Master Gate & Participant Scoping for Chats/Messages**: `/chats/{chatId}` requires an accepted `/friendships/{chatId}` (or `isAdmin()`), and `/chats/{chatId}/messages/{messageId}` enforces `senderId == request.auth.uid`, `exists(/chats/{chatId})`, matching 2-element `participants`, and `resource.data` checks on `allow list` (zero `get()`/`exists()` inside `allow list`).
7. **Immutable Ownership & Server Timestamps**: `ownerId`, `senderId`, `participants`, and `createdAt` (`request.time`) cannot mutate; `updatedAt` must always equal `request.time`.
8. **Online Apps Store & Approval Workflow**: `/onlineApps/{appId}` requires `isVerifiedUser()`, enforces `authorUid == request.auth.uid`, `status == 'pending'`, `version == 1`, and `hasPendingUpdate == false` on create; authors cannot self-approve (`status = 'approved'`) or overwrite live approved code without staging into `pendingUpdate` (`hasPendingUpdate == true`), while `isAdmin()` can approve/reject/disable or promote pending updates.

## 2. The "Dirty Dozen" Payloads (Must All Return `PERMISSION_DENIED`)
1. **Unauthenticated Write**: Create `/onlineProfiles/alice` or `/chats/u1__u2/messages/m1` with `request.auth == null`.
2. **Unverified Email Admin Spoof**: User with `email_verified: false` tries accessing `/admins`.
3. **Privilege Self-Escalation**: Non-admin creates `/onlineProfiles/bob` with `role: "admin"`, or updates their own profile `role` to `"admin"`.
4. **Unauthorized Admin Claim**: Non-admin writes `/admins/attackerUid` without an admin-issued `/adminInvites/{usernameKey}` owned by `attackerUid`.
5. **Directory Scraping**: Non-admin tries `list` on `/onlineProfiles`, `/admins`, or `/adminInvites`.
6. **Cross-User Spoof (`ownerId`/`senderId` hijack)**: `u1` creates `/chats/u1__u2/messages/m1` with `senderId: "u2"`.
7. **Unauthorized Chat Creation**: `u1` creates `/chats/u1__u3` without an `accepted` `/friendships/u1__u3` document.
8. **Self-Accept Friend Request**: `u1` creates `/friendships/u1__u2` with `status: "accepted"` or `requesterId` updates `pending -> accepted`.
9. **Chat Snooping (`list` without participant filter)**: `u3` lists `/chats` or `/chats/u1__u2/messages` where `u3` is not in `participants`.
10. **Ghost / Shadow Field Injection**: Write `/onlineProfiles/bob` or `/onlineApps/app1` with extra `isSuperAdmin: true` field.
11. **Message Tampering / Forged Timestamp**: Update a message in `/chats/u1__u2/messages/m1` or create with backdated `createdAt`.
12. **ID Poisoning / Unbounded List / Online App Self-Approval**: Write `/onlineProfiles/../../../evil`, `participants` length 5, or non-admin creating `/onlineApps/app1` with `status: "approved"`.
