# CollabNotes — Database Setup

## Database Info
- Name: `CollabNotesClientServer`
- Engine: PostgreSQL 18
- Host: localhost
- Port: 5432


## Step 1 -- Install PostgreSQL
Download and install PostgreSQL 18 from https://www.postgresql.org/download/
During install, set a password for the `postgres` user and remember it.

## Step 2-- Create the Database
Open pgAdmin 4 (or any postgres thing that you want to use), create a database
Name it exactly: `CollabNotesClientServer`

## Step 3 --Run this SQL
Right-click `CollabNotesClientServer` → Query Tool → paste this and hit F5 or the run button :

```sql
-- enums first, tables depend on these
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE visibility_type AS ENUM ('private', 'shared');
CREATE TYPE role_type AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE notification_type AS ENUM (
    'document_created',
    'document_shared',
    'document_edited',
    'version_restored',
    'user_removed'
);

CREATE TABLE users (
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(50) UNIQUE NOT NULL,
    email      VARCHAR(100) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE sessions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(512) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active  BOOLEAN DEFAULT TRUE
);

CREATE TABLE documents (
    id         SERIAL PRIMARY KEY,
    title      VARCHAR(255) NOT NULL,
    content    TEXT DEFAULT '',
    owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visibility visibility_type DEFAULT 'private',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE acl (
    id          SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        role_type NOT NULL,
    granted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by  INTEGER REFERENCES users(id),
    UNIQUE(document_id, user_id)
);

CREATE TABLE revisions (
    id                 SERIAL PRIMARY KEY,
    document_id        INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content            TEXT NOT NULL,
    version_number     INTEGER NOT NULL,
    change_description VARCHAR(255),
    created_by         INTEGER NOT NULL REFERENCES users(id),
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    restore_of         INTEGER REFERENCES revisions(id)
);

CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        notification_type NOT NULL,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    actor_id    INTEGER REFERENCES users(id),
    message     TEXT NOT NULL,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- indexes to speed up common queries
CREATE INDEX idx_acl_user_id      ON acl(user_id);
CREATE INDEX idx_acl_document_id  ON acl(document_id);
CREATE INDEX idx_revisions_doc_id ON revisions(document_id);
CREATE INDEX idx_notif_user_id    ON notifications(user_id);
CREATE INDEX idx_sessions_token   ON sessions(token);
CREATE INDEX idx_users_username   ON users(username);

-- auto update the updated_at column whenever a document is saved
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```



## Step 4 -- Configure the Backend
Open `Selected/backend/.env` and update the password line:

DB_HOST=localhost
DB_PORT=5432
DB_NAME=CollabNotesClientServer
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here
JWT_SECRET=collabnotes_secret_key
PORT=3001


## Step 5 -- Run the App
Double-click `Selected/run.bat` or run it in the terminal to build everything at once 

Then open your browser to `http://localhost:5173`

##tables Overview
- users: accounts registerd 
- sessions: token logins 
- documents: documents and their content 
- acl: security of documents and access control
- revisions: the saved previous versions of a document
- notificaitons: alerts for shares, edits, and restorations. 


## security note
- Passwords are stored as bcrypt hashes, never plain text