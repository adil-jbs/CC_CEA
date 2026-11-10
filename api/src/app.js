// ===== TIER 2: Application / API layer (Node.js + Express) =====
// Builds the Express app without starting it, so tests can run it on any port.
//   request -> routes -> controllers -> services -> repositories -> MySQL
const express = require('express');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middleware/error-handler');

const app = express();

app.use(express.json({ limit: config.bodyLimit }));
app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
