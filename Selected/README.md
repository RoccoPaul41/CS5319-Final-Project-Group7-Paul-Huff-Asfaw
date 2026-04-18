# CollabNotes - Selected Architecture

this is the layered client-server implementation of CollabNotes.
Our goal was to keep it simple enough that the architecture is shown just by looking at the file structure.


## how the layers work

We have 4 layers and each talks to the one directly below it, the front end never directly touches the database and vice versa

React pages  →  api.js  →  server.js routes  →  PostgreSQL
(what you see) (connector)  (api layer)       (data layer)

React pages: ui implementations, clicks, and form inputs --> no logic lives here.

api.js: the only file the frontend uses to talk to the backend, if a page needs data it calls a function from here, never makes its own fetch calls.

server.js: handles all the incoming requests, checks tokens, runs sql queries. This is where permission checks happen and where documents get saved.

PostgreSQL: stores everything --> users, documents, ACL, every version of every document, and notifications.

## one thing we changed from the original plan
We originally had real-time editing as a feature for this project, we decided to omit it due to the complexity and it is not needed to show the architecture
instead we added a refresh button in the editor. When two people have the same document open, clicking Refresh pulls the latest saved version from the
server. it does the same thing, just not automatic, which also helps show the layered flow easier to see since you can watch the request go out and come back.

## setup

requirements: 
- PostgreSQL 18
- Node.js

####step 1 - create the database
open pgAdmin 4, right-click Databases, create one called exactly:
`CollabNotesClientServer`

then open the Query Tool on that database and run the sql in `backend\README.me` (just copy and pate the code provided)

####step 2 - set your backend env file

open `backend/.env.example` and follow the example when making your .env

####step 3 - run it

double-click `run.bat` on Windows or run in the terminal 

it opens two terminal windows (one for the backend one for the frontend) so wait for both to finish starting up then go to:

http://localhost:5173


## testing with two people

you don't need two computers. just open two browser tabs (seperate or incognito for at least one).

1. register an account in  the first tab  
2.  register a different account in the second tab
3. in the first tab create a  documents and share it with the second user
4. open  the same document in both tabs
5. type something in one tab and click Save'
6.  go to the other tab and click Refresh to see the change show up for the other user

the Refresh button shows the flow by triggerng a GET request through api.js to server.js which queries the documents table and sends back the latest content


## files and what they do
'''
Selected/
├── backend /
│   ├── server.js       - the entire backend, all routes and db queries in one file
│   └─ .env.example           - database credentials set up, create a .env to work 
│
 ──  frontend/
│   └── src /
│       ├── api.js           - all http calls to the backend live here
│       ├──  App.jsx              - the router
│       ├── components /
│       │   └── Navbar.jsx       - top nav, shared across all pages
│       └── pages/
│           ├── LoginPage.jsx         - login & register
│           ├──  DashboardPage.jsx     - document list with filters and notifications recent
│           ├── DocumentsPage.jsx     - simpler list view of documents
│           ├── EditorPage .jsx        - open & edit a document
│           ├── VersionHistoryPage.jsx - see & restore older versions
│           └── NotificationsPage.jsx  - alerts for shares and edits (also notificaiton slot on home page with recent ones)
│
 ── run.bat      - starts everything on Windows
└── README.md       - what you are reading!
'''

## database tables
read the backend\readme for this information 


## notes
- passwords are  bcrypt hashed, never stored as  plain text
-every protected route checks a  jwt token before doing anything
-  when deleting a document cascades and cleans up acl, revisions, and notifications automatically
