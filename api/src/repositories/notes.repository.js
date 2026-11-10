// Data access for notes: SQL only, no business rules.
// Every value is passed as a parameter (?), never joined into the SQL string.
const pool = require('../db/pool');

const toNote = (row) => ({ ...row, pinned: Boolean(row.pinned) });

async function list() {
  const [rows] = await pool.query('SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC, id DESC');
  return rows.map(toNote);
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM notes WHERE id = ?', [id]);
  return rows[0] ? toNote(rows[0]) : null;
}

async function create({ title, body, color, pinned }) {
  const [result] = await pool.query(
    'INSERT INTO notes (title, body, color, pinned) VALUES (?, ?, ?, ?)',
    [title, body, color, pinned]
  );
  return result.insertId;
}

// `changes` keys must come from the service's allow-list of column names.
// Returns false when no note has that id.
async function update(id, changes) {
  const columns = Object.keys(changes);
  const [result] = await pool.query(
    `UPDATE notes SET ${columns.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...columns.map((c) => changes[c]), id]
  );
  return result.affectedRows > 0;
}

// Returns false when no note has that id.
async function remove(id) {
  const [result] = await pool.query('DELETE FROM notes WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { list, findById, create, update, remove };
