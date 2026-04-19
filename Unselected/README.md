# CollabNotes - Unselected Architecture

this is the event-driven implementation of CollabNotes.
the frontend is basically the same as Selected, but the backend is split into services that communicate by publishing and consuming events.


## architecture overview

in the layered architecture, one user action turns into one synchronous chain (page → api.js → server route → db query → response).

in this event-driven version, the request still comes into an express route, but instead of one part of the backend directly calling another part,
the route publishes an event to an event bus. any service that cares about that event can react to it.
services do not call each other directly.

folder structure (what each piece represents):
- backend/db/          - postgres connection pool (database access)
- backend/eventBus/    - the event broker that routes events between services (this is the key difference from Selected)
- backend/events/      - the event definitions (event names + what data they carry)
- backend/services/    - independent services that subscribe to events (document, versioning, notifications)
- backend/websocket/   - websocket gateway that pushes event updates to the browser in real time
- backend/server.js    - express entry point + rest routes (publishes events)
- frontend/            - same react pages as Selected, api.js points to this backend

event flow looks like:

User action → REST route → route publishes event → eventBus routes it → consuming services react → WebSocket pushes update to browser


## key difference from layered architecture

Selected (layered) is more like: route does the work right away and you get one synchronous chain.

Unselected (event-driven) is more like: route publishes something like a DocumentSaved event and then:
- the versioning service consumes it (updates the document content / updated_at)
- the notification service consumes it (creates notifications for collaborators)
- the websocket gateway consumes it (pushes a message to connected users)

these happen independently because they are connected through the event bus, not by services calling each other.


## events in this codebase

these event names come from `backend/events/eventTypes.js`. not every event is fully wired up yet (see known limitations).
```
EVENT NAME | TRIGGER (producer) | CONSUMERS (subscribers)
documentCreated | (defined) | DocumentService (logs ack)
documentSaved | PUT /api/documents/:id/content publishes it | VersioningService, NotificationService, WebSocketGateway, EventTracer
documentShared | POST /api/documents/:id/share publishes it | DocumentService, NotificationService, WebSocketGateway, EventTracer
documentDeleted | DELETE /api/documents/:id publishes it | DocumentService, NotificationService, WebSocketGateway, EventTracer
versionRestored | POST /api/documents/:id/restore publishes it | NotificationService, WebSocketGateway, EventTracer
documentRoleUpdated | (defined) | DocumentService + NotificationService (logs + notifs) (not currently published)
documentAccessRevoked | (defined) | DocumentService + NotificationService (logs + notifs) (not currently published)
notificationGenerated | (defined) | WebSocketGateway (not currently published)
```

## setup

requirements:
- PostgreSQL 18
- Node.js

step 1 - create the database
same as Selected. make sure you have a postgres database named exactly:
`CollabNotesClientServer`

run the SQL from `backend/README.md` to create the tables/enums.

step 2 - set your backend env file
copy `backend/.env.example` to `backend/.env` and fill in your postgres password.

step 3 - run it
double click `run.bat`

Frontend: http://localhost:5173
Backend:  http://localhost:3002

note: this uses a different backend port than Selected so you can run both at the same time if needed.


## what is the same as Selected
- same postgresql database name and schema (users, sessions, documents, acl, revisions, notifications, and enums)
- same react pages and general UI
- same features on paper: auth, documents, sharing, versions, notifications
- same env structure (db host/port/name/user/password + jwt secret)


## what is different from Selected
- backend is split into services instead of one huge file doing everything
- services communicate through events (event bus) instead of calling each other directly
- websocket gateway is built in, so events can be pushed out to the browser in real time
- `backend/eventBus/` and `backend/events/` are new compared to Selected (these define the connector + contracts between services)


## known limitations

- not every event in `backend/events/eventTypes.js` is actually published yet.
  the current backend routes publish: documentSaved, documentShared, documentDeleted, versionRestored.
- `notificationGenerated` is defined and the websocket gateway listens for it, but the notification service currently inserts rows into the database
  and does not publish a notificationGenerated event, so notifications are not pushed to the browser through that path.
- the backend share route expects `{ userId, role }`, but the frontend `frontend/src/api.js` currently sends `{ username, role }`.
  if you try sharing from the UI it will fail until that payload matches.


## architecture note

this implementation represents the Unselected architecture option for our cs5319 project.
we chose the layered client-server (Selected) over this because for our project scope — small groups, simple collaboration, emphasis on consistency —
the layered approach was simpler to reason about and easier to demonstrate the architecture clearly.
event-driven would be the better choice if the system needed to scale to many users or add new features frequently without touching existing services.

## file guide
```
Unselected/
├── backend/
│   ├── .env.example                 - env template (db creds, jwt secret, port)
│   ├── README.md                    - database schema SQL (same schema as Selected)
│   ├── package.json                 - backend dependencies (express, pg, ws, etc)
│   ├─ ─ package-lock.json            - dependency lockfile
│   ├── server.js                    - API entry point + routes; publishes events to the eventBus
│   ├── db/
│   │   └── pool.js                  - postgres connection pool
│   ├── eventBus/
│      ├── eventBus.js              - in-memory pub/sub event bus (services subscribe here)
│   │   └── eventTracer.js           - debug tool that subscribes to all events and logs them
│   ├── events/
│   │   └── eventTypes.js            - canonical event names and helper payload creators
│   ├── services/
│   │   ├── documentService.js       - event consumer (acks/logs doc lifecycle events)
     │   ├── versioningService.js     - consumes documentSaved, updates document content/updated_at
│   │   └── notificationService.js   - consumes events, inserts notification rows in postgres
│   └── websocket/
│       └── wsGateway.js             - subscribes to events and pushes them to connected clients
├── frontend/
│   ├── index.html                   - html shell that mounts react
│   ├── package.json                 - frontend dependencies (react, axios, router)
│   ── package-lock.json            - dependency lockfile
│   ├── vite.config.js               - dev proxy to backend port 3002 (so /api works in dev)
│   └── src/
│       ├── api.js                   - client connector (same interface as Selected)
│       ├── App.jsx                  - router + auth gate (PrivateRoute)
│       ├── main.jsx                 - react mount point
│       ├── components/
│       │   └── Navbar.jsx           - top nav + logout
│       └── pages/
│           ├── LoginPage.jsx         - login/register
           ├── DashboardPage.jsx     - doc list + create/share/delete
│           ├── DocumentsPage.jsx     - list view of docs
│           ├── EditorPage.jsx        - edit + save
│           ├── VersionHistoryPage.jsx - revisions + restore
│           └── NotificationsPage.jsx  - notification list + mark read
└── run.bat                          - starts backend then frontend on windows
```

