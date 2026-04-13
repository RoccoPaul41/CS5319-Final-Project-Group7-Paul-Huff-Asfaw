// ============================================
// LAYER: API Layer — Entry point for all client requests
// This file IS the entire server. It handles HTTP requests
// from the React frontend (Client Layer) and talks to
// PostgreSQL (Data Layer) directly using SQL queries.
// In a Layered Architecture: Client → API → Data
// ============================================

// Bring in the packages we’re allowed to use.
const express = require('express')
const { Pool } = require('pg')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cors = require('cors')
require('dotenv').config()

// Create the Express app (this is our HTTP server).
const app = express()

// Create a Postgres connection pool using credentials from .env.
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
})

// Allow the Vite dev server to call this API from the browser.
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
)

// Parse JSON request bodies automatically.
app.use(express.json())

// Helper that turns common Postgres errors into human-friendly messages.
function sendDatabaseHelp(res, err, fallbackMessage) {
  // 28P01 = invalid_password (wrong username/password)
  if (err?.code === '28P01') {
    return res.status(500).json({
      error:
        'Database login failed. Check backend/.env DB_USER and DB_PASSWORD, then restart the backend.'
    })
  }

  // 3D000 = invalid_catalog_name (database does not exist)
  if (err?.code === '3D000') {
    return res.status(500).json({
      error:
        'Database not found. Create the PostgreSQL database named CollabNotesClientServer, then restart the backend.'
    })
  }

  // 42P01 = undefined_table (tables not created / wrong schema)
  if (err?.code === '42P01') {
    return res.status(500).json({
      error:
        'Database tables are missing. Make sure your schema has users, sessions, documents, acl, revisions, notifications.',
      detail: err.message
    })
  }

  // Default: return the original fallback message.
  return res.status(500).json({ error: fallbackMessage, detail: err?.message })
}

// ============================================
// AUTH MIDDLEWARE SECTION
// Middleware that checks JWT token on protected routes
// Every request to a protected endpoint passes through here
// before hitting the route handler
// ============================================

function authenticateToken(req, res, next) {
  // Read the Authorization header in the form: "Bearer <token>".
  const authHeader = req.headers['authorization']

  // If the header is missing, the client is not logged in.
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' })
  }

  // Split "Bearer <token>" into parts and grab the token.
  const parts = authHeader.split(' ')
  const token = parts.length === 2 ? parts[1] : null

  // If the token is missing, we can’t authenticate the request.
  if (!token) {
    return res.status(401).json({ error: 'Missing Bearer token' })
  }

  // Verify the token using our secret.
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    // If verification fails, the token is invalid or expired.
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }

    // Attach the decoded user identity to the request for later handlers.
    req.user = decoded

    // Continue to the actual route handler.
    next()
  })
}

// Helper that runs a group of SQL statements as one transaction.
async function withTransaction(workFn) {
  // Get a dedicated client from the pool for the transaction.
  const client = await pool.connect()
  try {
    // Start the transaction.
    await client.query('BEGIN')

    // Run the provided work function (it receives the transaction client).
    const result = await workFn(client)

    // If everything worked, commit the transaction.
    await client.query('COMMIT')
    return result
  } catch (err) {
    // If anything fails, roll back the transaction.
    await client.query('ROLLBACK')
    throw err
  } finally {
    // Always release the client back to the pool.
    client.release()
  }
}

// ============================================
// AUTH ROUTES SECTION
// ============================================

app.post('/api/auth/register', async (req, res) => {
  // Pull user inputs from the request body.
  const { username, email, password } = req.body || {}

  // Validate username.
  if (!username || String(username).trim().length === 0) {
    return res.status(400).json({ error: 'Username is required' })
  }

  // Validate email using a simple, standard regex.
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailPattern.test(String(email))) {
    return res.status(400).json({ error: 'Email must be a valid address (example@domain.com)' })
  }

  // Validate password length.
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    // Check whether the username is already taken.
    const existingUsername = await pool.query('SELECT id FROM users WHERE username = $1', [username])
    if (existingUsername.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' })
    }

    // Check whether the email is already taken.
    const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' })
    }

    // Hash the password so we never store plain-text passwords.
    const passwordHash = await bcrypt.hash(String(password), 10)

    // Insert the new user into the database.
    await pool.query(
      'INSERT INTO users (username, email, password, created_at, last_login) VALUES ($1, $2, $3, NOW(), NULL)',
      [username, email, passwordHash]
    )

    // Tell the client that registration succeeded.
    return res.json({ message: 'Account created successfully' })
  } catch (err) {
    // Log server errors so we can debug them.
    console.error('[REGISTER] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while creating account')
  }
})

app.post('/api/auth/login', async (req, res) => {
  // Pull user inputs from the request body.
  const { username, password } = req.body || {}

  // Require both fields.
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  try {
    // Find the user by username.
    const userResult = await pool.query('SELECT id, username, email, password FROM users WHERE username = $1', [username])

    // If no user exists, return a generic auth error.
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const userRow = userResult.rows[0]

    // Compare the submitted password against the stored bcrypt hash.
    const passwordMatches = await bcrypt.compare(String(password), String(userRow.password))
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    // Update the last login timestamp for the user.
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [userRow.id])

    // Create a JWT token that expires in 24 hours.
    const token = jwt.sign(
      { userId: userRow.id, username: userRow.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Optionally record a session row (matches the schema’s sessions table).
    try {
      await pool.query(
        'INSERT INTO sessions (user_id, token, created_at, expires_at, is_active) VALUES ($1, $2, NOW(), NOW() + INTERVAL \'24 hours\', true)',
        [userRow.id, token]
      )
    } catch (sessionErr) {
      // If sessions table isn’t present, we still allow login to work.
      console.warn('[LOGIN] Could not write session row (continuing):', sessionErr.message)
    }

    // Return token and basic user profile.
    return res.json({
      token,
      user: { id: userRow.id, username: userRow.username, email: userRow.email }
    })
  } catch (err) {
    console.error('[LOGIN] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while logging in')
  }
})

// ============================================
// DOCUMENT ROUTES SECTION
// ============================================

app.get('/api/documents', authenticateToken, async (req, res) => {
  // Use the authenticated user id from the JWT.
  const userId = req.user.userId

  try {
    // Select documents this user has access to through ACL, plus owner username and the user’s role.
    const result = await pool.query(
      `
      SELECT
        d.id,
        d.title,
        d.content,
        d.owner_id,
        owner.username AS owner_username,
        d.visibility,
        d.created_at,
        d.updated_at,
        a.role AS your_role
      FROM documents d
      JOIN acl a ON d.id = a.document_id
      JOIN users owner ON d.owner_id = owner.id
      WHERE a.user_id = $1
      ORDER BY d.updated_at DESC
      `,
      [userId]
    )

    // Return the list to the client.
    return res.json(result.rows)
  } catch (err) {
    console.error('[GET /documents] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while loading documents')
  }
})

app.post('/api/documents', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  const { title, visibility } = req.body || {}

  // Trace the flow so we can see where creation fails.
  console.log('Creating document for user:', userId)

  // Make sure the user gives the document a title.
  if (!title || String(title).trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' })
  }

  // Only allow the two visibility values our schema supports (lowercase enum).
  const normalizedVisibility = String(visibility || 'private').toLowerCase() === 'shared' ? 'shared' : 'private'

  try {
    const createdDoc = await withTransaction(async (client) => {
      console.log('Inserting document...')

      // Insert the document row.
      const docResult = await client.query(
        `
        INSERT INTO documents (title, content, owner_id, visibility, created_at, updated_at)
        VALUES ($1, $2, $3, $4::visibility_type, NOW(), NOW())
        RETURNING id, title, content, owner_id, visibility, created_at, updated_at
        `,
        // Cast the parameter to the enum type so PostgreSQL accepts it reliably.
        [String(title).trim(), '', userId, normalizedVisibility]
      )

      console.log('Document created:', docResult.rows[0])

      const doc = docResult.rows[0]

      console.log('Inserting ACL entry...')

      // Give the creator owner access in ACL.
      await client.query(
        `
        INSERT INTO acl (document_id, user_id, role, granted_at, granted_by)
        VALUES ($1, $2, 'owner'::role_type, NOW(), $2)
        `,
        [doc.id, userId]
      )

      console.log('Inserting revision...')

      // Create version 1 in revisions.
      await client.query(
        `
        INSERT INTO revisions (document_id, content, version_number, change_description, created_by, created_at, restore_of)
        VALUES ($1, $2, 1, 'Document created', $3, NOW(), NULL)
        `,
        [doc.id, '', userId]
      )

      // Notify the creator that the document was created (lowercase enum).
      // Create a notification for the creator.
      await client.query(
        `
        INSERT INTO notifications (user_id, type, document_id, actor_id, message, is_read, created_at)
        VALUES ($1, 'document_created'::notification_type, $2, $1, $3, false, NOW())
        `,
        [userId, doc.id, `You created "${doc.title}"`]
      )

      // Add the owner username so the frontend doesn’t need a second query.
      const ownerName = await client.query('SELECT username FROM users WHERE id = $1', [userId])
      console.log('Document creation complete')
      return { ...doc, owner_username: ownerName.rows[0]?.username, your_role: 'owner' }
    })

    return res.json(createdDoc)
  } catch (err) {
    // Log the full error so we can debug (Postgres gives great details).
    console.error('Error in [POST /api/documents]:', err)
    return res.status(500).json({
      error: 'Server error while creating document',
      detail: err.message
    })
  }
})

app.get('/api/documents/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  const documentId = Number(req.params.id)

  try {
    // Check whether the user has an ACL entry for this document.
    const aclCheck = await pool.query('SELECT role FROM acl WHERE document_id = $1 AND user_id = $2', [documentId, userId])
    if (aclCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Load the document and owner username.
    const docResult = await pool.query(
      `
      SELECT d.*, owner.username AS owner_username
      FROM documents d
      JOIN users owner ON d.owner_id = owner.id
      WHERE d.id = $1
      `,
      [documentId]
    )

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Load collaborators so the editor can show who else has access.
    const collaboratorsResult = await pool.query(
      `
      SELECT u.id, u.username, a.role
      FROM acl a
      JOIN users u ON a.user_id = u.id
      WHERE a.document_id = $1
      ORDER BY
        CASE a.role
          WHEN 'owner' THEN 0
          WHEN 'editor' THEN 1
          ELSE 2
        END,
        u.username ASC
      `,
      [documentId]
    )

    return res.json({
      ...docResult.rows[0],
      your_role: aclCheck.rows[0].role,
      collaborators: collaboratorsResult.rows
    })
  } catch (err) {
    console.error('[GET /documents/:id] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while loading document')
  }
})

app.put('/api/documents/:id/content', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  const documentId = Number(req.params.id)
  const { content } = req.body || {}

  try {
    // Check role from ACL to enforce editor/owner rule.
    const aclResult = await pool.query('SELECT role FROM acl WHERE document_id = $1 AND user_id = $2', [documentId, userId])
    if (aclResult.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const role = aclResult.rows[0].role
    if (role !== 'owner' && role !== 'editor') {
      return res.status(403).json({ error: 'Cannot edit this document' })
    }

    const saved = await withTransaction(async (client) => {
      // Update the document content and updated_at timestamp.
      const updateResult = await client.query(
        `
        UPDATE documents
        SET content = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING updated_at
        `,
        [String(content ?? ''), documentId]
      )

      // If the document id doesn’t exist, return 404.
      if (updateResult.rows.length === 0) {
        return { notFound: true }
      }

      // Find the latest revision number so we can create the next one.
      const latestRevision = await client.query(
        'SELECT COALESCE(MAX(version_number), 0) AS max_version FROM revisions WHERE document_id = $1',
        [documentId]
      )
      const nextVersionNumber = Number(latestRevision.rows[0].max_version) + 1

      // Insert the new revision row.
      await client.query(
        `
        INSERT INTO revisions (document_id, content, version_number, change_description, created_by, created_at, restore_of)
        VALUES ($1, $2, $3, 'Content updated', $4, NOW(), NULL)
        `,
        [documentId, String(content ?? ''), nextVersionNumber, userId]
      )

      // Load document title for a human-friendly notification.
      const docTitleResult = await client.query('SELECT title FROM documents WHERE id = $1', [documentId])
      const docTitle = docTitleResult.rows[0]?.title || 'a document'

      // Notify every collaborator except the person who saved.
      const collaborators = await client.query('SELECT user_id FROM acl WHERE document_id = $1 AND user_id != $2', [documentId, userId])
      for (const row of collaborators.rows) {
        await client.query(
          `
          INSERT INTO notifications (user_id, type, document_id, actor_id, message, is_read, created_at)
          VALUES ($1, 'document_edited'::notification_type, $2, $3, $4, false, NOW())
          `,
          [row.user_id, documentId, userId, `A collaborator edited "${docTitle}"`]
        )
      }

      return { updatedAt: updateResult.rows[0].updated_at }
    })

    if (saved.notFound) {
      return res.status(404).json({ error: 'Document not found' })
    }

    return res.json({ message: 'Saved', updatedAt: saved.updatedAt })
  } catch (err) {
    console.error('[PUT /documents/:id/content] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while saving document')
  }
})

app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  const documentId = Number(req.params.id)

  try {
    // Only the owner can delete documents.
    const roleResult = await pool.query('SELECT role FROM acl WHERE document_id = $1 AND user_id = $2', [documentId, userId])
    if (roleResult.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (roleResult.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can delete this document' })
    }

    await withTransaction(async (client) => {
      // Delete child rows first to avoid foreign key issues if cascades aren’t configured.
      await client.query('DELETE FROM notifications WHERE document_id = $1', [documentId])
      await client.query('DELETE FROM revisions WHERE document_id = $1', [documentId])
      await client.query('DELETE FROM acl WHERE document_id = $1', [documentId])
      await client.query('DELETE FROM documents WHERE id = $1', [documentId])
    })

    return res.json({ message: 'Document deleted' })
  } catch (err) {
    console.error('[DELETE /documents/:id] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while deleting document')
  }
})

app.post('/api/documents/:id/share', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  const documentId = Number(req.params.id)
  const { username, role } = req.body || {}

  // Require a username to share with.
  if (!username || String(username).trim().length === 0) {
    return res.status(400).json({ error: 'Username is required to share' })
  }

  // Normalize role to our allowed values.
  const normalizedRole = String(role || 'viewer').toLowerCase() === 'editor' ? 'editor' : 'viewer'

  try {
    // Make sure the requester is the owner.
    const ownerCheck = await pool.query('SELECT role FROM acl WHERE document_id = $1 AND user_id = $2', [documentId, userId])
    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can share this document' })
    }

    // Find the target user by username.
    const targetResult = await pool.query('SELECT id FROM users WHERE username = $1', [String(username).trim()])
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    const targetUserId = targetResult.rows[0].id

    // Prevent sharing to yourself (not helpful, and avoids duplicate ACL).
    if (Number(targetUserId) === Number(userId)) {
      return res.status(400).json({ error: 'You already have access to this document' })
    }

    // Check whether the target user already has access.
    const alreadyShared = await pool.query('SELECT id FROM acl WHERE document_id = $1 AND user_id = $2', [documentId, targetUserId])
    if (alreadyShared.rows.length > 0) {
      return res.status(400).json({ error: 'User already has access' })
    }

    await withTransaction(async (client) => {
      // Insert ACL entry for the new collaborator.
      await client.query(
        `
        INSERT INTO acl (document_id, user_id, role, granted_at, granted_by)
        VALUES ($1, $2, $3::role_type, NOW(), $4)
        `,
        [documentId, targetUserId, normalizedRole, userId]
      )

      // Create a notification for the new collaborator.
      const docTitleResult = await client.query('SELECT title FROM documents WHERE id = $1', [documentId])
      const docTitle = docTitleResult.rows[0]?.title || 'a document'
      await client.query(
        `
        INSERT INTO notifications (user_id, type, document_id, actor_id, message, is_read, created_at)
        VALUES ($1, 'document_shared'::notification_type, $2, $3, $4, false, NOW())
        `,
        [targetUserId, documentId, userId, `A document was shared with you: "${docTitle}"`]
      )
    })

    return res.json({ message: 'Document shared successfully' })
  } catch (err) {
    console.error('[POST /documents/:id/share] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while sharing document')
  }
})

app.get('/api/users/search', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  const query = String(req.query.q || '').trim()

  // If the search box is empty, return nothing to keep it simple.
  if (!query) {
    return res.json([])
  }

  try {
    // Search by username, excluding the current user.
    const result = await pool.query(
      `
      SELECT id, username
      FROM users
      WHERE username ILIKE $1 AND id != $2
      ORDER BY username ASC
      LIMIT 10
      `,
      [`%${query}%`, userId]
    )

    return res.json(result.rows)
  } catch (err) {
    console.error('[GET /users/search] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while searching users')
  }
})

// ============================================
// REVISION ROUTES SECTION
// ============================================

app.get('/api/documents/:id/revisions', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  const documentId = Number(req.params.id)

  try {
    // Ensure the user can access the document.
    const aclCheck = await pool.query('SELECT id FROM acl WHERE document_id = $1 AND user_id = $2', [documentId, userId])
    if (aclCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Load revisions along with the creator’s username.
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.document_id,
        r.content,
        r.version_number,
        r.change_description,
        r.created_by,
        u.username AS created_by_username,
        r.created_at,
        r.restore_of
      FROM revisions r
      JOIN users u ON r.created_by = u.id
      WHERE r.document_id = $1
      ORDER BY r.version_number DESC
      `,
      [documentId]
    )

    return res.json(result.rows)
  } catch (err) {
    console.error('[GET /documents/:id/revisions] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while loading revisions')
  }
})

app.post('/api/documents/:id/restore', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  const documentId = Number(req.params.id)
  const { revisionId } = req.body || {}

  // Require the revision id.
  if (!revisionId) {
    return res.status(400).json({ error: 'revisionId is required' })
  }

  try {
    // Enforce owner/editor permissions.
    const aclResult = await pool.query('SELECT role FROM acl WHERE document_id = $1 AND user_id = $2', [documentId, userId])
    if (aclResult.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const role = aclResult.rows[0].role
    if (role !== 'owner' && role !== 'editor') {
      return res.status(403).json({ error: 'Cannot restore versions for this document' })
    }

    const restoreResult = await withTransaction(async (client) => {
      // Load the revision we want to restore.
      const revisionResult = await client.query(
        'SELECT id, content, version_number FROM revisions WHERE id = $1 AND document_id = $2',
        [revisionId, documentId]
      )
      if (revisionResult.rows.length === 0) {
        return { notFound: true }
      }
      const revisionRow = revisionResult.rows[0]

      // Apply the restored content to the document.
      await client.query('UPDATE documents SET content = $1, updated_at = NOW() WHERE id = $2', [revisionRow.content, documentId])

      // Find next version number.
      const latestRevision = await client.query(
        'SELECT COALESCE(MAX(version_number), 0) AS max_version FROM revisions WHERE document_id = $1',
        [documentId]
      )
      const nextVersionNumber = Number(latestRevision.rows[0].max_version) + 1

      // Create a new revision that records the restore action.
      await client.query(
        `
        INSERT INTO revisions (document_id, content, version_number, change_description, created_by, created_at, restore_of)
        VALUES ($1, $2, $3, $4, $5, NOW(), $6)
        `,
        [
          documentId,
          revisionRow.content,
          nextVersionNumber,
          `Restored from version ${revisionRow.version_number}`,
          userId,
          revisionRow.id
        ]
      )

      // Notify collaborators.
      const docTitleResult = await client.query('SELECT title FROM documents WHERE id = $1', [documentId])
      const docTitle = docTitleResult.rows[0]?.title || 'a document'
      const collaborators = await client.query('SELECT user_id FROM acl WHERE document_id = $1 AND user_id != $2', [documentId, userId])
      for (const row of collaborators.rows) {
        await client.query(
          `
          INSERT INTO notifications (user_id, type, document_id, actor_id, message, is_read, created_at)
          VALUES ($1, 'version_restored'::notification_type, $2, $3, $4, false, NOW())
          `,
          [row.user_id, documentId, userId, `A collaborator restored a version of "${docTitle}"`]
        )
      }

      return { restoredFromVersion: revisionRow.version_number }
    })

    if (restoreResult.notFound) {
      return res.status(404).json({ error: 'Revision not found' })
    }

    return res.json({ message: `Restored to version ${restoreResult.restoredFromVersion}` })
  } catch (err) {
    console.error('[POST /documents/:id/restore] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while restoring revision')
  }
})

// ============================================
// NOTIFICATION ROUTES SECTION
// ============================================

app.get('/api/notifications', authenticateToken, async (req, res) => {
  const userId = req.user.userId

  try {
    // Return notifications with actor username and document title when possible.
    const result = await pool.query(
      `
      SELECT
        n.id,
        n.user_id,
        n.type,
        n.document_id,
        d.title AS document_title,
        n.actor_id,
        u.username AS actor_username,
        n.message,
        n.is_read,
        n.created_at
      FROM notifications n
      LEFT JOIN users u ON n.actor_id = u.id
      LEFT JOIN documents d ON n.document_id = d.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      `,
      [userId]
    )

    return res.json(result.rows)
  } catch (err) {
    console.error('[GET /notifications] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while loading notifications')
  }
})

app.patch('/api/notifications/read-all', authenticateToken, async (req, res) => {
  const userId = req.user.userId

  try {
    // Mark all notifications as read for this user.
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId])
    return res.json({ message: 'All marked as read' })
  } catch (err) {
    console.error('[PATCH /notifications/read-all] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while marking notifications read')
  }
})

// ============================================
// START SERVER
// ============================================

// Quick DB connection test on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('DATABASE CONNECTION FAILED:', err.message)
  } else {
    console.log('Database connected successfully at:', res.rows[0].now)
  }
})

const port = Number(process.env.PORT || 3001)
app.listen(port, async () => {
  console.log(`CollabNotes API running on port ${port}`)

  // Try a simple query so we can confirm the DB connection at startup.
  try {
    await pool.query('SELECT 1')
    console.log('Connected to PostgreSQL: CollabNotesClientServer')
  } catch (err) {
    console.error('Could not connect to PostgreSQL. Check backend/.env credentials.')
    console.error(err.message)
  }
})

