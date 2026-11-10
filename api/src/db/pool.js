// One shared MySQL connection pool for the whole API.
const mysql = require('mysql2/promise');
const { db } = require('../config');

const pool = mysql.createPool({
  ...db,
  connectionLimit: 10,
  dateStrings: true,
  timezone: 'Z',
});

module.exports = pool;
