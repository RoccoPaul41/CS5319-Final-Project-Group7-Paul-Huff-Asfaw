# CollabNotes Database Reference
**Database Name:** `CollabNotesClientServer`
**Architecture:** Layered Client-Server (Selected)
**Engine:** PostgreSQL 18
**Created by:** Rocco Paul, Dan Huff, Eyos Asfaw — Group 7

---

## ENUM Types

| Type | Values |
|------|--------|
| `visibility_type` | `private`, `shared` |
| `role_type` | `owner`, `editor`, `viewer` |
| `notification_type` | `document_created`, `document_shared`, `document_edited`, `version_restored`, `user_removed`, `document_deleted` |

If your database was created before `document_deleted` existed, run once (psql):

`ALTER TYPE notification_type ADD VALUE 'document_deleted';`

---

## Tables

### 1. `users`
Stores all registered accounts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL | Primary key, auto-increment |
| `username` | VARCHAR(50) | Unique, not null |
| `email` | VARCHAR(100) | Unique, not null |
| `password` | VARCHAR(255) | BCrypt hashed, not null |
| `created_at` | TIMESTAMP | Defaults to now |
| `last_login` | TIMESTAMP | Nullable, updated on login |

---

### 2. `sessions`
Tracks active login tokens. Allows force-expiry on logout.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL | Primary key |
| `user_id` | INTEGER | FK → users(id), cascades on delete |
| `token` | VARCHAR(512) | JWT token string |
| `created_at` | TIMESTAMP | Defaults to now |
| `expires_at` | TIMESTAMP | Not null |
| `is_active` | BOOLEAN | Defaults to true |

---

### 3. `documents`
The core table. Stores all documents and their current content.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL | Primary key |
| `title` | VARCHAR(255) | Not null |
| `content` | TEXT | Full document text, defaults to empty string |
| `owner_id` | INTEGER | FK → users(id), cascades on delete |
| `visibility` | visibility_type | `private` or `shared`, defaults to private |
| `created_at` | TIMESTAMP | Defaults to now |
| `updated_at` | TIMESTAMP | Auto-updated via trigger on every save |

> `updated_at` is managed by the `trigger_documents_updated_at` trigger automatically.

> **API behavior:** On `POST /api/documents`, the server stores a **unique** `title` across all rows. If the name is already taken, it uses `Title (1)`, `Title (2)`, … so creation does not fail on a duplicate title (or a DB `UNIQUE` on `title`).

---

### 4. `acl` (Access Control List)
Controls who has access to each document and at what role level.
One row per user-document pair.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL | Primary key |
| `document_id` | INTEGER | FK → documents(id), cascades on delete |
| `user_id` | INTEGER | FK → users(id), cascades on delete |
| `role` | role_type | `owner`, `editor`, or `viewer` |
| `granted_at` | TIMESTAMP | Defaults to now |
| `granted_by` | INTEGER | FK → users(id), nullable |

> Unique constraint on `(document_id, user_id)` — one role per user per document.

---

### 5. `revisions`
Full content snapshot on every save. Powers the version history feature.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL | Primary key |
| `document_id` | INTEGER | FK → documents(id), cascades on delete |
| `content` | TEXT | Full document snapshot at this point in time |
| `version_number` | INTEGER | Increments per document (v1, v2, v3...) |
| `change_description` | VARCHAR(255) | Short description of what changed, nullable |
| `created_by` | INTEGER | FK → users(id), who made the save |
| `created_at` | TIMESTAMP | Defaults to now |
| `restore_of` | INTEGER | FK → revisions(id), nullable — tracks if this was a restore |

> Stores full snapshots, not diffs. Makes restore trivial — just copy content back.

---

### 6. `notifications`
Every event that should alert a user generates a row here.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL | Primary key |
| `user_id` | INTEGER | FK → users(id), who receives the notification |
| `type` | notification_type | What kind of event triggered this |
| `document_id` | INTEGER | FK → documents(id), nullable, which document |
| `actor_id` | INTEGER | FK → users(id), nullable, who triggered the event |
| `message` | TEXT | Human-readable notification message |
| `is_read` | BOOLEAN | Defaults to false |
| `created_at` | TIMESTAMP | Defaults to now |

---

## Indexes

| Index Name | Table | Column(s) | Purpose |
|------------|-------|-----------|---------|
| `idx_acl_user_id` | acl | `user_id` | Dashboard load — find all docs a user can access |
| `idx_acl_document_id` | acl | `document_id` | Permission checks — who has access to a doc |
| `idx_revisions_doc_id` | revisions | `document_id` | Version history page — load all revisions for a doc |
| `idx_notif_user_id` | notifications | `user_id` | Notifications page — all notifs for a user |
| `idx_notif_user_read` | notifications | `user_id, is_read` | Unread count badge in navbar |
| `idx_sessions_user_id` | sessions | `user_id` | Find active sessions for a user |
| `idx_sessions_token` | sessions | `token` | Token validation on every request |
| `idx_users_username` | users | `username` | Login lookup + user search |

---

## Trigger

### `trigger_documents_updated_at`
- **Table:** `documents`
- **Fires:** BEFORE UPDATE, on every row
- **What it does:** Automatically sets `updated_at = CURRENT_TIMESTAMP`
- **Function:** `update_updated_at()`

---

## Seed Data

### Users (3)
| id | username | email |
|----|----------|-------|
| 1 | rocco.paul | rocco@collabnotes.com |
| 2 | dan.huff | dan@collabnotes.com |
| 3 | eyos.asfaw | eyos@collabnotes.com |

> Passwords are placeholder BCrypt hashes — will be replaced by Spring Boot on first real registration.

### Documents (3)
| id | title | owner | visibility |
|----|-------|-------|------------|
| 1 | Project Proposal | rocco.paul | shared |
| 2 | Meeting Notes | dan.huff | shared |
| 3 | Architecture Doc | rocco.paul | private |

### ACL Entries (6)
| document | user | role |
|----------|------|------|
| Project Proposal | rocco.paul | owner |
| Project Proposal | dan.huff | editor |
| Project Proposal | eyos.asfaw | viewer |
| Meeting Notes | dan.huff | owner |
| Meeting Notes | rocco.paul | editor |
| Architecture Doc | rocco.paul | owner |

### Revisions (3)
One initial v1 revision per document.

### Notifications (3)
| recipient | type | message |
|-----------|------|---------|
| dan.huff | document_shared | rocco.paul shared "Project Proposal" with you |
| eyos.asfaw | document_shared | rocco.paul shared "Project Proposal" with you |
| rocco.paul | document_shared | dan.huff shared "Meeting Notes" with you |

---

## Connection Info (for Spring Boot)
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/CollabNotesClientServer
spring.datasource.username=postgres
spring.datasource.password=YOUR_PASSWORD_HERE
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
```

---

## Node API (Selected `server.js`) — port and ACL

**Dev:** In `Selected/frontend`, `src/api.js` uses **`/api`** (same origin as Vite). Vite proxies `/api` to Express — target defaults to **`http://localhost:3002`**. If your backend `.env` uses another `PORT` (e.g. `3001`), add **`Selected/frontend/.env`** with **`PROXY_TARGET=http://localhost:3001`** and restart `npm run dev`.

**Prod / `vite preview`:** Set **`VITE_API_BASE`** (e.g. `http://localhost:3002/api`) or the app falls back to that URL.

Express listens on **`PORT`** in `backend/.env`, or **3002** if unset.

These routes update the **`acl`** table (`document_id`, `user_id`, `role` with `role_type` = `owner` | `editor` | `viewer`):

| Method | Path | Effect |
|--------|------|--------|
| `PATCH` or `PUT` | `/api/documents/:id/acl/:userId` | Body `{ "role": "editor" \| "viewer" }` — owner only; cannot retarget `documents.owner_id` |
| `DELETE` | `/api/documents/:id/acl/:userId` | Removes that user’s ACL row — owner only; cannot remove `owner_id`; inserts `user_removed` notification |

---

## Foreign Key Relationships
```
users ──< sessions        (users.id → sessions.user_id)
users ──< documents       (users.id → documents.owner_id)
users ──< acl             (users.id → acl.user_id)
users ──< acl             (users.id → acl.granted_by)
users ──< revisions       (users.id → revisions.created_by)
users ──< notifications   (users.id → notifications.user_id)
users ──< notifications   (users.id → notifications.actor_id)
documents ──< acl         (documents.id → acl.document_id)
documents ──< revisions   (documents.id → revisions.document_id)
documents ──< notifications (documents.id → notifications.document_id)
revisions ──< revisions   (revisions.id → revisions.restore_of)
```
