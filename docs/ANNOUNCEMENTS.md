# FACULTY_FLOW — Announcement, Circular & Team-Style Communication Subsystem

## 1. System Architecture Overview

The **Announcement, Circular & Team-Style Communication** module is an enterprise communication subsystem integrated within FACULTY_FLOW. It is designed to provide official institutional circular publishing (administrative directives, academic notifications, college circulars) coupled with Microsoft Teams-style threaded discussions, lightweight emoji reactions, structured @mentions, read receipts, and mandatory compliance acknowledgements.

```text
                                  FACULTY_FLOW
                                       │
                      ┌────────────────┴────────────────┐
                      │                                 │
               CORE MODULES                       ANNOUNCEMENTS
           (Attendance, Leave,                          │
          Timetable, Substitution)             ┌────────┴────────┐
                                               │                 │
                                        Official Notice    Conversation
                                               │                 │
                                       ┌───────┴───────┐   ┌─────┴─────┐
                                  Attachments       Targets Replies Mentions
                                       │               │     │       │
                                [StorageService]   [RBAC] Reactions  │
                                       │               │     │       │
                                 Presigned /           └─────┼───────┘
                                 Signed URLs                 │
                                                             ▼
                                                    [Notification Fanout]
                                                      (Background Tasks)
```

---

## 2. Core Tenet: Isolation & Workload Protection

To ensure high-throughput academic workflows (attendance tracking, timetable generation, leave applications, autonomous substitution) are never impacted by announcement spikes or large binary uploads:

1. **Zero Binary Data in PostgreSQL**: Binary attachments (PDFs, JPGs, PNGs) are strictly handled outside PostgreSQL. The database only stores cryptographic hashes, storage keys, MIME metadata, and byte sizes.
2. **Pluggable Storage Abstraction (`StorageService`)**:
   - `LocalStorageBackend`: Files are stored on persistent disk (`uploads/announcements/{tenant_id}/{year}/{month}/{announcement_id}/{file_id}`) and streamed using cryptographically signed HMAC tokens (`exp`, `sig`).
   - `S3StorageBackend`: Scalable AWS S3 / Cloudflare R2 / MinIO object storage with presigned PUT URLs for direct-to-cloud uploads and presigned GET URLs for downloads, completely bypassing application worker bandwidth.
3. **Background Notification Fanout**:
   - Publishing an announcement or circular to 1,000+ faculty never executes synchronously inside the HTTP request.
   - Notifications are batched (500 recipients per slice) and queued via FastAPI `BackgroundTasks`, protecting database connection pools and keeping HTTP responses under 100ms.
4. **Targeted Read/Unread Indexes**: Compound database indexes on `(tenant_id, is_pinned, published_at)` and `(announcement_id, user_id)` ensure feed queries are fast and paginate cleanly.

---

## 3. Data Model & Schema

The module uses normalized relational tables:

```text
announcements
├── announcement_targets         (Targeting: COLLEGE, DEPARTMENT, USER)
├── announcement_attachments     (File metadata, keys, hashes, download counters)
├── announcement_reads           (First/last viewed timestamps)
├── announcement_acknowledgements (Formal compliance audit timestamps)
└── announcement_messages        (Self-referencing tree via parent_message_id)
    ├── message_mentions         (Normalized mentioned user references)
    └── message_reactions        (Lightweight emoji reactions with unique user constraint)
```

### Table Details
- **`announcements`**: Root circular entity supporting types (`GENERAL`, `CIRCULAR`, `NOTICE`, `URGENT`, `ACADEMIC`, `ADMINISTRATIVE`, `EVENT`), priorities (`NORMAL`, `IMPORTANT`, `HIGH`, `URGENT`), and lifecycle statuses (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `EXPIRED`, `ARCHIVED`, `DELETED`). Tracks revision numbers (`version`) and revision notes to prevent silent overwriting.
- **`announcement_targets`**: Maps target types (`COLLEGE`, `DEPARTMENT`, `USER`) with foreign keys to `departments` and `users`.
- **`announcement_attachments`**: Stores file metadata, content type, storage key, SHA-256 hash, and authorization policies (`allow_download`).
- **`announcement_reads`**: Records initial read and latest read timestamp per user.
- **`announcement_acknowledgements`**: Records formal legal/compliance acknowledgements. Emoji reactions (👍) do not count as formal acknowledgement.
- **`announcement_messages`**: Threaded discussion messages. `parent_message_id` supports arbitrary nesting. Supports moderation flags (`is_pinned`, `is_deleted`).
- **`message_reactions`**: Normalized emoji reactions (`👍`, `❤️`, `✅`, `❓`, `👏`). A `UniqueConstraint('message_id', 'user_id', 'reaction')` prevents duplicate reactions.
- **`message_mentions`**: Normalized `@user` mentions with authorization validation.

---

## 4. Server-Side Authorization Matrix

Frontend UI restrictions provide user guidance, but all authorization rules are strictly enforced at the backend service layer:

| Action | System Admin / Principal | HOD | Faculty / Teacher |
| :--- | :---: | :---: | :---: |
| **Publish College-Wide** | ✅ Yes | ❌ Blocked (403) | ❌ Blocked (403) |
| **Publish to Own Department** | ✅ Yes | ✅ Yes | ❌ Blocked (403) |
| **Publish to Other Departments** | ✅ Yes | ❌ Blocked (403) | ❌ Blocked (403) |
| **Target Faculty in Own Dept** | ✅ Yes | ✅ Yes | ❌ Blocked (403) |
| **Target Faculty in Other Depts** | ✅ Yes | ❌ Blocked (403) | ❌ Blocked (403) |
| **View Circulars** | ✅ All in College | ✅ College + Own Dept | ✅ Targeted / College / Own Dept |
| **Reply / Discuss** | ✅ Yes (moderator) | ✅ Yes (moderator in dept) | ✅ If `allow_replies=True` |
| **React (Emoji)** | ✅ Yes | ✅ Yes | ✅ If `allow_reactions=True` |
| **Pin / Moderate Reply** | ✅ Yes | ✅ In Own Dept | ❌ Blocked (403) |
| **Lock Conversation** | ✅ Yes | ✅ In Own Dept | ❌ Blocked (403) |
| **View Analytics** | ✅ College-wide | ✅ Own Dept Only | ❌ Blocked (403) |
| **Acknowledge Circular** | ✅ Optional | ✅ Optional | ✅ Required if flagged |

---

## 5. File Upload & Download Security

All uploads undergo strict security checks:
1. **Magic Bytes Validation**: Verifies file headers against authentic magic bytes:
   - PDF: `%PDF-` (`0x25 0x50 0x44 0x46`)
   - PNG: `0x89 0x50 0x4E 0x47`
   - JPEG: `0xFF 0xD8 0xFF`
   - WEBP: `RIFF....WEBP`
   MIME spoofing (e.g. renaming `.exe` to `.pdf`) is blocked immediately.
2. **Filename Sanitization**: Strip path traversals (`../`, `..\\`) and sanitize characters using regex.
3. **Storage Key Isolation**: Keys are generated server-side using institutional tenant identifiers:
   `tenant/{tenant_id}/announcements/{year}/{month}/{announcement_id}/{file_id}`
   Clients are never allowed to specify storage paths.
4. **Authorized Streaming / Signed URLs**:
   - For local disk: Streamed via `/api/announcements/attachments/{file_id}/stream?token={token}` where `token` is an HMAC-SHA256 signature containing expiration timestamp.
   - For S3 / Cloud Storage: Direct-to-bucket signed URLs with 15-minute TTL.

---

## 6. Real-Time Notifications & Deep Linking

1. **Notification Generation**:
   - `new_announcement`: Broadcast to all resolved target users.
   - `acknowledgement_required`: High-priority alert to users requiring formal sign-off.
   - `mention`: Sent to users tagged via `@username` in discussions.
   - `reply` / `reply_to_my_message`: Thread notification alerting message authors of replies.
2. **Frontend Deep Linking**:
   Clicking any announcement notification inside `NotificationBell` automatically routes the user directly to `/announcements/{id}`, marks the notification as read, and highlights action items.

---

## 7. Operational & Disaster Recovery Procedures

1. **Database Backups**: Include the 8 announcement tables in daily PostgreSQL dumps.
2. **Storage Replication**:
   - Local: Include `STORAGE_LOCAL_PATH` (default `./uploads`) in enterprise incremental backup jobs.
   - S3 / Cloudflare R2: Enable versioning and multi-region replication on the storage bucket.
3. **Archival & Pruning**: Announcements flagged as `ARCHIVED` remain read-only for institutional historical compliance.

---

## 8. Mobile-First Faculty UX Architecture

1. **Bottom Navigation & Badges**:
   - Accessible with one thumb directly from `BottomNav` (`📢 Notices`) with a live unread count badge (`99+`).
   - Live badges integrated across `Sidebar` and `MobileDrawer`.
   - Instant shortcut widget on Teacher Dashboard.
2. **Full-Screen Native Experience**:
   - On phones (< 640px), tapping any circular opens a full-screen view with a sticky `← Back` button and thumb-friendly controls.
   - Document previews (PDF and images) render in responsive modals with pinch-zoom support.
3. **Touch-First Discussions & @Mentions**:
   - Action buttons (emoji reactions, replies) are always visible and touch-sized on mobile screens without requiring hover.
   - Typing `@` opens an instant touch-friendly autocomplete list to mention faculty members.
4. **Network Efficiency & Error Resilience**:
   - Feed requests return lightweight metadata snippets without downloading full documents.
   - Skeleton loaders provide responsive visual feedback on slow 3G/4G connections.
   - Network failure triggers clean retry views without affecting core academic tools (Attendance, Timetable, Leave).
