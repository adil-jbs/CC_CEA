-- ===== TIER 3: Data layer (MySQL) =====
-- Runs automatically the first time the local MySQL container starts.
-- On AWS RDS you don't need to run this: the API creates the table on startup.
-- (It's here so you can see the schema, or run it by hand with the mysql client.)
CREATE DATABASE IF NOT EXISTS tasks_db;
USE tasks_db;

CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  color VARCHAR(10) NOT NULL DEFAULT 'yellow',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO notes (title, body, color, pinned) VALUES
  ('Welcome to Cloud Notes', 'Nginx serves this page, a Node.js API handles requests, and MySQL stores your notes.', 'purple', TRUE),
  ('Shopping list', 'Milk, eggs, bread', 'yellow', FALSE);
