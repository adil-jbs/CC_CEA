// Creates the notes table on startup if it doesn't exist (same SQL as database/schema.sql).
const pool = require('./pool');

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

module.exports = { initDb };
