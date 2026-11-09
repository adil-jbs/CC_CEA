-- ===== TIER 3: Data layer (MySQL) =====
-- Runs automatically the first time the local MySQL container starts.
-- On AWS RDS you don't need to run this: the API creates the table on startup.
-- (It's here so you can see the schema, or run it by hand with the mysql client.)
CREATE DATABASE IF NOT EXISTS tasks_db;
USE tasks_db;

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'Medium',
  due_date DATE NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tasks (title, priority, due_date) VALUES
  ('Deploy the web tier', 'High', NULL),
  ('Connect the API to RDS', 'Medium', NULL);
