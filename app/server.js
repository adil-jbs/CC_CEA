// ===== TIER 2: Application / API layer (Node.js + Express) =====
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

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
});

const PRIORITIES = ['Low', 'Medium', 'High'];

// Creates the table on startup if it doesn't exist (same SQL as db/init.sql).
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(120) NOT NULL,
      priority VARCHAR(10) NOT NULL DEFAULT 'Medium',
      due_date DATE NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
}

// Returns an error message, or null if the input is valid.
function validateTask(body) {
  const { title, priority, due_date } = body || {};
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120)
    return 'title is required (max 120 characters)';
  if (!PRIORITIES.includes(priority))
    return `priority must be one of: ${PRIORITIES.join(', ')}`;
  if (due_date && !/^\d{4}-\d{2}-\d{2}$/.test(due_date))
    return 'due_date must be a date like 2026-11-09';
  return null;
}

// Health check: the AWS load balancer calls this to know the server is alive.
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// List all tasks (unfinished first, then by due date).
app.get('/api/tasks', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM tasks ORDER BY done ASC, due_date IS NULL, due_date ASC, id DESC'
    );
    res.json(rows.map((r) => ({ ...r, done: Boolean(r.done) })));
  } catch (err) { next(err); }
});

// Create a task.
app.post('/api/tasks', async (req, res, next) => {
  try {
    const error = validateTask(req.body);
    if (error) return res.status(400).json({ error });

    const title = req.body.title.trim();
    const { priority } = req.body;
    const due_date = req.body.due_date || null;
    const [result] = await pool.query(
      'INSERT INTO tasks (title, priority, due_date) VALUES (?, ?, ?)',
      [title, priority, due_date]
    );
    res.status(201).json({ id: result.insertId, title, priority, due_date, done: false });
  } catch (err) { next(err); }
});

// Mark a task done / not done.
app.patch('/api/tasks/:id', async (req, res, next) => {
  try {
    if (typeof req.body?.done !== 'boolean')
      return res.status(400).json({ error: 'done must be true or false' });
    const [result] = await pool.query('UPDATE tasks SET done = ? WHERE id = ?', [req.body.done, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ id: Number(req.params.id), done: req.body.done });
  } catch (err) { next(err); }
});

// Delete a task.
app.delete('/api/tasks/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    res.status(204).end();
  } catch (err) { next(err); }
});

// Catch-all error handler: log details on the server, never leak them to the user.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  initDb()
    .then(() => app.listen(PORT, () => console.log(`API listening on port ${PORT}`)))
    .catch((err) => { console.error('Could not connect to database:', err.message); process.exit(1); });
}

module.exports = { app, pool, validateTask };
