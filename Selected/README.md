# CollabNotes — Layered Client-Server Architecture

## What This Demonstrates
This `Selected/` implementation is intentionally **simple** so the architecture is easy to understand.

It shows 4 layers working together:

1. **Presentation Layer** (React pages)
   - Displays UI, handles clicks/typing, and calls `api.js`.
2. **Client Connector** (`frontend/src/api.js`)
   - The only place the frontend is allowed to talk to the backend.
3. **API Layer** (`backend/server.js`)
   - Express routes that validate requests, check JWT tokens, and run SQL.
4. **Data Layer** (PostgreSQL)
   - Stores users, documents, ACL permissions, revisions, and notifications.

Flow: **React UI → api.js → Express (/api/...) → PostgreSQL**

## Setup
1. Ensure PostgreSQL is running and you have a database named:
   - `CollabNotesClientServer`
2. Edit `Selected/backend/.env` and set:
   - `DB_PASSWORD=your_postgres_password`
3. Double-click:
   - `Selected/run.bat`
4. Open:
   - Frontend: `http://localhost:5173`

## Two People Editing (Same Network)
1. On one machine, run the app and create a user account.
2. On another machine on the same network, open the frontend in a browser:
   - Use the first machine’s LAN IP (Vite prints a Network URL if enabled).
3. Register a second user, create a document, share it to the other user.
4. Both users can open the document and:
   - Click **Refresh** to see each other’s edits.
   - Click **Save** to create revisions and notifications.

## File Guide (Minimal on purpose)

### Backend (API Layer + DB access in one file)
- `backend/server.js`
  - Express routes (API Layer)
  - JWT auth middleware
  - SQL queries to PostgreSQL (Data Layer)

### Backend config
- `backend/.env`
  - DB connection credentials + JWT secret

### Frontend (Presentation Layer)
- `frontend/index.html`
  - Hosts the React app
- `frontend/src/main.jsx`
  - Mounts React
- `frontend/src/App.jsx`
  - Router only
- `frontend/src/components/Navbar.jsx`
  - Top navigation bar shared across pages
- `frontend/src/pages/*`
  - Each page is a full UI screen

### Frontend connector
- `frontend/src/api.js`
  - The only file that talks to the backend

# CollabNotes — Selected Architecture: Layered Client-Server

## Architecture Overview
This implementation follows a strict Layered Client-Server architecture:

- **Presentation Layer (React)**: renders UI and captures user input.
- **API Layer (Spring Controllers)**: HTTP entry points; validates request shape and delegates.
- **Service Layer (Business Logic)**: permission checks, workflows, orchestration across repositories.
- **Data Access Layer (Repositories)**: the only layer that runs queries against PostgreSQL.

Flow: **React (Presentation)** → **Controllers (API)** → **Services** → **Repositories** → **PostgreSQL**

## How to Run
1. Ensure PostgreSQL is running and you have a database named:
   - `CollabNotesClientServer`
2. Update the password in:
   - `backend/src/main/resources/application.properties`
3. Run:
   - Windows: `run.bat`
   - Mac/Linux: `./run.sh`
4. Open:
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:8080`

## Layer Responsibilities (File Map)

### Presentation Layer (Client UI)
Location: `frontend/src/`

- **Pages**: `frontend/src/pages/*.jsx`
- **Components**: `frontend/src/components/*.jsx`
- **Modals**: `frontend/src/modals/*.jsx`
- **Contexts**: `frontend/src/contexts/*.jsx`
- **Client connectors**:
  - `frontend/src/services/api.js`
  - `frontend/src/services/socket.js`

### API Layer (Controllers)
Location: `backend/src/main/java/com/collabnotes/controller/`

- `AuthController.java`
- `DocumentController.java`
- `RevisionController.java`
- `NotificationController.java`

### Service Layer
Location: `backend/src/main/java/com/collabnotes/service/`

- `AuthService.java`
- `DocumentService.java`
- `RevisionService.java`
- `NotificationService.java`

### Data Access Layer (Repositories)
Location: `backend/src/main/java/com/collabnotes/repository/`

- `UserRepository.java`
- `DocumentRepository.java`
- `AclRepository.java`
- `RevisionRepository.java`
- `NotificationRepository.java`
- `SessionRepository.java`

### Domain Layer (JPA Entities + Enums)
Location: `backend/src/main/java/com/collabnotes/domain/`

- Entities: `User`, `Document`, `Acl`, `Revision`, `Notification`, `Session`
- Enums: `backend/src/main/java/com/collabnotes/domain/enums/*`

