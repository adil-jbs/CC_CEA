// All settings come from ENVIRONMENT VARIABLES (never hardcode secrets).
// Locally they point to the "db" container; on AWS they come from SSM Parameter Store.
module.exports = {
  port: Number(process.env.PORT) || 3000,

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'tasks_db',
  },

  notes: {
    colors: ['yellow', 'blue', 'green', 'pink', 'purple'],
    titleMax: 120,
    bodyMax: 10000,
  },

  // Largest JSON body the API accepts.
  bodyLimit: '64kb',
};
