// ===== TIER 2: Application / API layer (Node.js + Express) =====
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json({ limit: '64kb' }));

// All database settings come from ENVIRONMENT VARIABLES (never hardcode secrets).
// Locally these point to the "db" container; on AWS they point to your RDS endpoint.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'tasks_db',
  connectionLimit: 10,
  dateStrings: true,
  timezone: 'Z',
});

const COLORS = ['yellow', 'blue', 'green', 'pink', 'purple'];
const TITLE_MAX = 120;
const BODY_MAX = 10000;
const FIELDS = ['title', 'body', 'color', 'pinned'];

// Creates the table on startup if it doesn't exist (same SQL as db/init.sql).
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(120) NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      color VARCHAR(10) NOT NULL DEFAULT 'yellow',
      pinned BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
}

// Validates a note. For a new note (partial = false) at least a title or some text is required.
// For an update (partial = true) only the fields that are sent are checked.
// Returns an error message, or null if the input is valid.
function validateNote(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'request body must be a JSON object';
  const { title, body, color, pinned } = input;
  if (title !== undefined && (typeof title !== 'string' || title.trim().length > TITLE_MAX))
    return `title must be text (max ${TITLE_MAX} characters)`;
  if (body !== undefined && (typeof body !== 'string' || body.length > BODY_MAX))
    return `body must be text (max ${BODY_MAX} characters)`;
  if (color !== undefined && !COLORS.includes(color))
    return `color must be one of: ${COLORS.join(', ')}`;
  if (pinned !== undefined && typeof pinned !== 'boolean')
    return 'pinned must be true or false';
  if (partial) {
    if (!FIELDS.some((f) => input[f] !== undefined)) return `send at least one of: ${FIELDS.join(', ')}`;
  } else if (!(title || '').trim() && !(body || '').trim()) {
    return 'a note needs a title or some text';
  }
  return null;
}

const toNote = (r) => ({ ...r, pinned: Boolean(r.pinned) });
const validId = (id) => /^[1-9]\d{0,9}$/.test(id);

async function findNote(id) {
  const [rows] = await pool.query('SELECT * FROM notes WHERE id = ?', [id]);
  return rows[0] ? toNote(rows[0]) : null;
}

// Health check: the AWS load balancer calls this to know the server is alive.
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// List all notes: pinned first, then most recently edited.
app.get('/api/notes', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC, id DESC');
    res.json(rows.map(toNote));
  } catch (err) { next(err); }
});

// Create a note.
app.post('/api/notes', async (req, res, next) => {
  try {
    const error = validateNote(req.body);
    if (error) return res.status(400).json({ error });
    const { title = '', body = '', color = 'yellow', pinned = false } = req.body;
    const [result] = await pool.query(
      'INSERT INTO notes (title, body, color, pinned) VALUES (?, ?, ?, ?)',
      [title.trim(), body, color, pinned]
    );
    res.status(201).json(await findNote(result.insertId));
  } catch (err) { next(err); }
});

// Update any of: title, body, color, pinned.
app.patch('/api/notes/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Note not found' });
    const error = validateNote(req.body, { partial: true });
    if (error) return res.status(400).json({ error });

    // Column names come from a fixed allow-list; values are always parameters.
    const sent = FIELDS.filter((f) => req.body[f] !== undefined);
    const values = sent.map((f) => (f === 'title' ? req.body.title.trim() : req.body[f]));
    const [result] = await pool.query(
      `UPDATE notes SET ${sent.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`,
      [...values, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(await findNote(req.params.id));
  } catch (err) { next(err); }
});

// Delete a note.
app.delete('/api/notes/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Note not found' });
    const [result] = await pool.query('DELETE FROM notes WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Note not found' });
    res.status(204).end();
  } catch (err) { next(err); }
});

// Unknown API routes.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Catch-all error handler: log details on the server, never leak them to the user.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Note is too large' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  initDb()
    .then(() => app.listen(PORT, () => console.log(`API listening on port ${PORT}`)))
    .catch((err) => { console.error('Could not connect to database:', err.message); process.exit(1); });
}

module.exports = { app, pool, validateNote, COLORS };
