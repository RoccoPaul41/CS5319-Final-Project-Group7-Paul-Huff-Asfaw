// # API ENTRY POINT — event-driven architecture
// # routes incoming HTTP requests to the appropriate service
// # services then publish events rather than calling other services
// # compare to Selected/backend/server.js which handles everything
// # in one place — here the logic is distributed across services

const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cors = require('cors')
require('dotenv').config()

const eventBus = require('./eventBus/eventBus')
const { EVENT_TYPES, Events } = require('./events/eventTypes')

//Here is the api layer of our layered client-server architecture sitting between the frontend and the database
//the frontend is the presentation layer and the database is the data layer
// goes through here first before going to the database

const app = express()

const pool = require('./db/pool')

// ─── Event-Driven Architecture: Service Registration ───────────────────────
const documentService = require('./services/documentService')
const versioningService = require('./services/versioningService')
const notificationService = require('./services/notificationService')
const wsGateway = require('./websocket/wsGateway')

documentService.register()
versioningService.register()
notificationService.register()
// ────────────────────────────────────────────────────────────────────────────

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

//map common postgres errors to something readable for the frontend
function sendDatabaseHelp(res, err, fallbackMessage) {
  //wrong db user or password
  if (err?.code === '28P01') {
    return res.status(500).json({
      error:
        'Database login failed. Check backend/.env DB_USER and DB_PASSWORD, then restart the backend.'
    })
  }

  //database name doesnt exist
  if (err?.code === '3D000') {
    return res.status(500).json({
      error:
        'Database not found. Create the PostgreSQL database named CollabNotesClientServer, then restart the backend.'
    })
  }

  //missing tables or wrong schema
  if (err?.code === '42P01') {
    return res.status(500).json({
      error:
        'Database tables are missing. Make sure your schema has users, sessions, documents, acl, revisions, notifications.',
      detail: err.message
    })
  }

  return res.status(500).json({ error: fallbackMessage, detail: err?.message })
}

//middleware checks jwt before protected routes, stops you if its missing or invalid
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' })
  }

  const parts = authHeader.split(' ')
  const token = parts.length === 2 ? parts[1] : null

  if (!token) {
    return res.status(401).json({ error: 'Missing Bearer token' })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }

    req.user = decoded

    next()
  })
}

//transaction wrapper so a multi step save or share cant half finish
async function withTransaction(workFn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await workFn(client)

    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

//if the title is taken we append (1) (2) etc until its free
async function allocateUniqueDocumentTitle(client, baseTitle) {
  const base = String(baseTitle).trim()
  if (!base) return base
  let n = 0
  while (n < 1000) {
    const candidate = n === 0 ? base : `${base} (${n})`
    const taken = await client.query('SELECT 1 FROM documents WHERE title = $1 LIMIT 1', [candidate])
    if (taken.rows.length === 0) return candidate
    n += 1
  }
  throw new Error('Could not find a free title')
}

//auth routes dont need a token
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body || {}

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(String(username || ''))) {
    return res.status(400).json({
      error: 'Username must be 3-20 characters, letters, numbers and underscores only'
    })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''))) {
    return res.status(400).json({
      error: 'Please provide a valid email address'
    })
  }

  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    const takenUser = await pool.query('SELECT id FROM users WHERE username = $1', [username])
    if (takenUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' })
    }

    const takenEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (takenEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' })
    }

    //hash password before saving never store plaintext
    const hashed = await bcrypt.hash(String(password), 10)

    await pool.query(
      'INSERT INTO users (username, email, password, created_at, last_login) VALUES ($1, $2, $3, NOW(), NULL)',
      [username, email, hashed]
    )

    return res.json({ message: 'Account created successfully' })
  } catch (err) {
    console.error('[REGISTER] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while creating account')
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {}

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  try {
    const userRes = await pool.query('SELECT id, username, email, password FROM users WHERE username = $1', [username])

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const usr = userRes.rows[0]

    //bcrypt compare for login
    const ok = await bcrypt.compare(String(password), String(usr.password))
    if (!ok) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [usr.id])

    const token = jwt.sign(
      { userId: usr.id, username: usr.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    try {
      await pool.query(
        'INSERT INTO sessions (user_id, token, created_at, expires_at, is_active) VALUES ($1, $2, NOW(), NOW() + INTERVAL \'24 hours\', true)',
        [usr.id, token]
      )
    } catch (sessionErr) {
      console.warn('[LOGIN] Could not write session row (continuing):', sessionErr.message)
    }

    return res.json({
      token,
      user: { id: usr.id, username: usr.username, email: usr.email }
    })
  } catch (err) {
    console.error('[LOGIN] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while logging in')
  }
})

//document routes need a valid token, authenticateToken always runs first
app.get('/api/documents', authenticateToken, async (req, res) => {
  const userId = req.user.userId

  try {
    //pg pool query joins acl so you only see docs youre allowed to access
    const r = await pool.query(
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

    return res.json(r.rows)
  } catch (err) {
    console.error('[GET /documents] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while loading documents')
  }
})

app.post('/api/documents', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  const { title, visibility } = req.body || {}

  console.log('Creating document for user:', userId)

  if (!title || String(title).trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' })
  }

  const normalizedVisibility = String(visibility || 'private').toLowerCase() === 'shared' ? 'shared' : 'private'

  try {
    const createdDoc = await withTransaction(async (client) => {
      const uniqueTitle = await allocateUniqueDocumentTitle(client, String(title).trim())

      const docRes = await client.query(
        `
        INSERT INTO documents (title, content, owner_id, visibility, created_at, updated_at)
        VALUES ($1, $2, $3, $4::visibility_type, NOW(), NOW())
        RETURNING id, title, content, owner_id, visibility, created_at, updated_at
        `,
        [uniqueTitle, '', userId, normalizedVisibility]
      )

      console.log('Document created:', docRes.rows[0])

      const doc = docRes.rows[0]

      console.log('Inserting ACL entry...')

      await client.query(
        `
        INSERT INTO acl (document_id, user_id, role, granted_at, granted_by)
        VALUES ($1, $2, 'owner'::role_type, NOW(), $2)
        `,
        [doc.id, userId]
      )

      console.log('Inserting revision...')

      await client.query(
        `
        INSERT INTO revisions (document_id, content, version_number, change_description, created_by, created_at, restore_of)
        VALUES ($1, $2, 1, 'Document created', $3, NOW(), NULL)
        `,
        [doc.id, '', userId]
      )

      await client.query(
        `
        INSERT INTO notifications (user_id, type, document_id, actor_id, message, is_read, created_at)
        VALUES ($1, 'document_created'::notification_type, $2, $1, $3, false, NOW())
        `,
        [userId, doc.id, `You created "${doc.title}"`]
      )

      const ownerName = await client.query('SELECT username FROM users WHERE id = $1', [userId])
      console.log('Document creation complete')
      return { ...doc, owner_username: ownerName.rows[0]?.username, your_role: 'owner' }
    })

    return res.json(createdDoc)
  } catch (err) {
    console.error('Error in [POST /api/documents]:', err)
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'A document with this title already exists',
        detail: err.message
      })
    }
    return res.status(500).json({
      error: 'Server error while creating document',
      detail: err.message,
      code: err.code
    })
  }
})

app.get('/api/documents/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  const docId = Number(req.params.id)

  try {
    //acl check on this doc before we return the row
    const aclCheck = await pool.query('SELECT role FROM acl WHERE document_id = $1 AND user_id = $2', [docId, userId])
    if (aclCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const docRes = await pool.query(
      `
      SELECT d.*, owner.username AS owner_username
      FROM documents d
      JOIN users owner ON d.owner_id = owner.id
      WHERE d.id = $1
      `,
      [docId]
    )

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' })
    }

    const collaborators = await pool.query(
      `
      SELECT u.id AS user_id, u.username, a.role
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
      [docId]
    )

    return res.json({
      ...docRes.rows[0],
      your_role: aclCheck.rows[0].role,
      collaborators: collaborators.rows
    })
  } catch (err) {
    console.error('[GET /documents/:id] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while loading document')
  }
})

app.put('/api/documents/:id/content', authenticateToken, async (req, res) => {
  const { id } = req.params
  const { content } = req.body

  if (content === undefined) {
    return res.status(400).json({ error: 'Content is required' })
  }

  try {
    const aclCheck = await pool.query(
      `SELECT role FROM acl WHERE document_id = $1 AND user_id = $2`,
      [id, req.user.userId]
    )
    if (aclCheck.rows.length === 0 || aclCheck.rows[0].role === 'viewer') {
      return res.status(403).json({ error: 'You do not have edit access' })
    }

    const docRes = await pool.query(`SELECT title FROM documents WHERE id = $1`, [id])
    if (docRes.rows.length === 0) return res.status(404).json({ error: 'Document not found' })

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM revisions WHERE document_id = $1`, [id]
    )
    const versionNumber = parseInt(countRes.rows[0].count, 10) + 1

    eventBus.publish(EVENT_TYPES.DOCUMENT_SAVED, Events.documentSaved({
      documentId: parseInt(id),
      title: docRes.rows[0].title,
      content,
      savedById: req.user.userId,
      savedByUsername: req.user.username,
      versionNumber,
    }))

    return res.json({ message: 'Document save event published', versionNumber })
  } catch (err) {
    console.error('Save document error:', err)
    return res.status(500).json({ error: 'Failed to publish save event' })
  }
})

//same handler for patch and put on collaborator role
async function handleUpdateCollaboratorRole(req, res) {
  const ownerUserId = req.user.userId
  const docId = Number(req.params.id)
  const targetUserId = Number(req.params.userId)
  const newRole = String((req.body || {}).role || '').toLowerCase()

  if (!Number.isFinite(docId) || docId <= 0) {
    return res.status(400).json({ error: 'Invalid document id' })
  }
  if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ error: 'Invalid user id' })
  }

  if (newRole !== 'editor' && newRole !== 'viewer') {
    return res.status(400).json({ error: 'Role must be editor or viewer' })
  }

  try {
    const ownerAcl = await pool.query('SELECT role FROM acl WHERE document_id = $1 AND user_id = $2', [docId, ownerUserId])
    if (ownerAcl.rows.length === 0 || ownerAcl.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can change roles' })
    }

    const docRow = await pool.query('SELECT owner_id FROM documents WHERE id = $1', [docId])
    if (docRow.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' })
    }
    if (Number(docRow.rows[0].owner_id) === Number(targetUserId)) {
      return res.status(400).json({ error: 'Cannot change the owner role this way' })
    }

    const upd = await pool.query(
      `UPDATE acl SET role = $1::role_type WHERE document_id = $2 AND user_id = $3 RETURNING user_id`,
      [newRole, docId, targetUserId]
    )
    if (upd.rows.length === 0) {
      return res.status(400).json({ error: 'Collaborator not found on this document (check user id)' })
    }

    return res.json({ message: 'Role updated successfully' })
  } catch (err) {
    console.error('[PATCH/PUT /documents/:id/acl/:userId] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while updating role')
  }
}

app.patch('/api/documents/:id/acl/:userId', authenticateToken, handleUpdateCollaboratorRole)
app.put('/api/documents/:id/acl/:userId', authenticateToken, handleUpdateCollaboratorRole)

//owner only delete on acl removes their access
app.delete('/api/documents/:id/acl/:userId', authenticateToken, async (req, res) => {
  const ownerUserId = req.user.userId
  const docId = Number(req.params.id)
  const targetUserId = Number(req.params.userId)

  if (!Number.isFinite(docId) || docId <= 0) {
    return res.status(400).json({ error: 'Invalid document id' })
  }
  if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ error: 'Invalid user id' })
  }

  try {
    const ownerAcl = await pool.query('SELECT role FROM acl WHERE document_id = $1 AND user_id = $2', [docId, ownerUserId])
    if (ownerAcl.rows.length === 0 || ownerAcl.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can remove users' })
    }

    const docRow = await pool.query('SELECT owner_id, title FROM documents WHERE id = $1', [docId])
    if (docRow.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' })
    }
    if (Number(docRow.rows[0].owner_id) === Number(targetUserId)) {
      return res.status(400).json({ error: 'Cannot remove the document owner' })
    }

    const title = docRow.rows[0].title || 'this document'

    const removed = await withTransaction(async (client) => {
      const del = await client.query('DELETE FROM acl WHERE document_id = $1 AND user_id = $2 RETURNING user_id', [docId, targetUserId])
      if (del.rows.length === 0) {
        return false
      }
      await client.query(
        `
        INSERT INTO notifications (user_id, type, document_id, actor_id, message, is_read, created_at)
        VALUES ($1, 'user_removed'::notification_type, $2, $3, $4, false, NOW())
        `,
        [targetUserId, docId, ownerUserId, `Your access to "${title}" was removed`]
      )
      return true
    })

    if (!removed) {
      return res.status(404).json({ error: 'User not on this document' })
    }

    return res.json({ message: 'User removed successfully' })
  } catch (err) {
    console.error('[DELETE /documents/:id/acl/:userId] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while removing user')
  }
})

app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const ownerCheck = await client.query(
      `SELECT role FROM acl WHERE document_id = $1 AND user_id = $2`,
      [id, req.user.userId]
    )
    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].role !== 'owner') {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'Only the owner can delete this document' })
    }

    const docRes = await client.query(`SELECT title FROM documents WHERE id = $1`, [id])
    if (docRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Document not found' })
    }
    const title = docRes.rows[0].title

    const aclRes = await client.query(`SELECT user_id FROM acl WHERE document_id = $1`, [id])
    const affectedUserIds = aclRes.rows.map((r) => r.user_id)

    await client.query(`DELETE FROM notifications WHERE document_id = $1`, [id])
    await client.query(`DELETE FROM revisions WHERE document_id = $1`, [id])
    await client.query(`DELETE FROM acl WHERE document_id = $1`, [id])
    await client.query(`DELETE FROM documents WHERE id = $1`, [id])

    await client.query('COMMIT')

    eventBus.publish(EVENT_TYPES.DOCUMENT_DELETED, Events.documentDeleted({
      documentId: parseInt(id),
      title,
      deletedById: req.user.userId,
      affectedUserIds,
    }))

    return res.json({ message: 'Document deleted and event published' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Delete document error:', err)
    return res.status(500).json({ error: 'Failed to delete document' })
  } finally {
    client.release()
  }
})

app.post('/api/documents/:id/share', authenticateToken, async (req, res) => {
  const { id } = req.params
  const { userId: targetUserId, role } = req.body

  if (!targetUserId || !role) {
    return res.status(400).json({ error: 'userId and role are required' })
  }
  if (!['editor', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be editor or viewer' })
  }

  try {
    const ownerCheck = await pool.query(
      `SELECT role FROM acl WHERE document_id = $1 AND user_id = $2`,
      [id, req.user.userId]
    )
    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can share this document' })
    }

    const docRes = await pool.query(`SELECT title FROM documents WHERE id = $1`, [id])
    if (docRes.rows.length === 0) return res.status(404).json({ error: 'Document not found' })

    const targetRes = await pool.query(`SELECT username FROM users WHERE id = $1`, [targetUserId])
    if (targetRes.rows.length === 0) return res.status(404).json({ error: 'Target user not found' })

    await pool.query(
      `INSERT INTO acl (document_id, user_id, role, granted_at, granted_by)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (document_id, user_id) DO UPDATE SET role = $3`,
      [id, targetUserId, role, req.user.userId]
    )

    eventBus.publish(EVENT_TYPES.DOCUMENT_SHARED, Events.documentShared({
      documentId: parseInt(id),
      title: docRes.rows[0].title,
      ownerId: req.user.userId,
      ownerUsername: req.user.username,
      sharedWithId: targetUserId,
      sharedWithUsername: targetRes.rows[0].username,
      role,
    }))

    return res.json({ message: 'Document shared and event published' })
  } catch (err) {
    console.error('Share document error:', err)
    return res.status(500).json({ error: 'Failed to share document' })
  }
})

app.get('/api/users/search', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  const query = String(req.query.q || '').trim()

  if (!query) {
    return res.json([])
  }

  try {
    const r = await pool.query(
      `
      SELECT id, username
      FROM users
      WHERE username ILIKE $1 AND id != $2
      ORDER BY username ASC
      LIMIT 10
      `,
      [`%${query}%`, userId]
    )

    return res.json(r.rows)
  } catch (err) {
    console.error('[GET /users/search] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while searching users')
  }
})

app.get('/api/documents/:id/revisions', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  const docId = Number(req.params.id)

  try {
    //acl gate then pull revision list from pool
    const aclCheck = await pool.query('SELECT id FROM acl WHERE document_id = $1 AND user_id = $2', [docId, userId])
    if (aclCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const r = await pool.query(
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
      [docId]
    )

    return res.json(r.rows)
  } catch (err) {
    console.error('[GET /documents/:id/revisions] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while loading revisions')
  }
})

app.post('/api/documents/:id/restore', authenticateToken, async (req, res) => {
  const { id } = req.params
  const { revisionId } = req.body

  if (!revisionId) return res.status(400).json({ error: 'revisionId is required' })

  try {
    const aclCheck = await pool.query(
      `SELECT role FROM acl WHERE document_id = $1 AND user_id = $2`,
      [id, req.user.userId]
    )
    if (aclCheck.rows.length === 0 || aclCheck.rows[0].role === 'viewer') {
      return res.status(403).json({ error: 'You do not have restore access' })
    }

    const revRes = await pool.query(
      `SELECT content, version_number FROM revisions WHERE id = $1 AND document_id = $2`,
      [revisionId, id]
    )
    if (revRes.rows.length === 0) return res.status(404).json({ error: 'Revision not found' })
    const { content, version_number } = revRes.rows[0]

    const docRes = await pool.query(`SELECT title FROM documents WHERE id = $1`, [id])
    const title = docRes.rows[0]?.title || 'Unknown'

    const aclRes = await pool.query(`SELECT user_id FROM acl WHERE document_id = $1`, [id])
    const affectedUserIds = aclRes.rows.map((r) => r.user_id)

    const countRes = await pool.query(`SELECT COUNT(*) FROM revisions WHERE document_id = $1`, [id])
    const newVersionNumber = parseInt(countRes.rows[0].count, 10) + 1

    await pool.query(`UPDATE documents SET content = $1, updated_at = NOW() WHERE id = $2`, [content, id])
    await pool.query(
      `INSERT INTO revisions (document_id, content, version_number, change_description, created_by, created_at, restore_of)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [id, content, newVersionNumber, `Restored version ${version_number}`, req.user.userId, revisionId]
    )

    eventBus.publish(EVENT_TYPES.VERSION_RESTORED, Events.versionRestored({
      documentId: parseInt(id),
      title,
      restoredById: req.user.userId,
      restoredByUsername: req.user.username,
      versionNumber: version_number,
      affectedUserIds,
    }))

    return res.json({ message: 'Version restored and event published', newVersionNumber })
  } catch (err) {
    console.error('Restore version error:', err)
    return res.status(500).json({ error: 'Failed to restore version' })
  }
})

app.get('/api/notifications', authenticateToken, async (req, res) => {
  const userId = req.user.userId

  try {
    const r = await pool.query(
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

    return res.json(r.rows)
  } catch (err) {
    console.error('[GET /notifications] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while loading notifications')
  }
})

app.patch('/api/notifications/read-all', authenticateToken, async (req, res) => {
  const userId = req.user.userId

  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId])
    return res.json({ message: 'All marked as read' })
  } catch (err) {
    console.error('[PATCH /notifications/read-all] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while marking notifications read')
  }
})

//mark one notification read only if its yours
app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const userId = req.user.userId
  const notifId = Number(req.params.id)

  try {
    const r = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [notifId, userId]
    )
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' })
    }
    return res.json({ message: 'Marked as read' })
  } catch (err) {
    console.error('[PATCH /notifications/:id/read] Error:', err)
    return sendDatabaseHelp(res, err, 'Server error while marking notification read')
  }
})

//quick db ping on boot
pool.query('SELECT NOW()', (err, dbRes) => {
  if (err) {
    console.error('DATABASE CONNECTION FAILED:', err.message)
  } else {
    console.log('Database connected successfully at:', dbRes.rows[0].now)
  }
})

const http = require('http')
const { registerTracer } = require('./eventBus/eventTracer')

const PORT = Number(process.env.PORT || 3002)

registerTracer()

const server = http.createServer(app)
wsGateway.attach(server)

server.listen(PORT, async () => {
  console.log(`[Server] CollabNotes running on port ${PORT}`)
  console.log('[Server] Event-Driven Architecture active — EventBus is live')

  try {
    await pool.query('SELECT 1')
    console.log('Connected to PostgreSQL: CollabNotesClientServer')
  } catch (err) {
    console.error('Could not connect to PostgreSQL. Check backend/.env credentials.')
    console.error(err.message)
  }
})

