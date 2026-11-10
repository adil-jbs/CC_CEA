// Entry point: make sure the table exists, then start listening.
const app = require('./app');
const { port } = require('./config');
const { initDb } = require('./db/schema');

initDb()
  .then(() => app.listen(port, () => console.log(`API listening on port ${port}`)))
  .catch((err) => {
    console.error('Could not connect to database:', err.message);
    process.exit(1);
  });
