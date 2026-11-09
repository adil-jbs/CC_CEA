// HTTP-level tests for the REST API. The MySQL pool is replaced by a fake,
// so these run in CI without a database.
const test = require('node:test');
const assert = require('node:assert');
const { app, pool } = require('./server');

let server;
let base;
let calls;
let nextResult;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

test.beforeEach(() => {
  calls = [];
  nextResult = [[]];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    if (nextResult instanceof Error) throw nextResult;
    return nextResult;
  };
});

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

test('GET /api/health returns ok', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { status: 'ok' });
});

test('GET /api/tasks lists tasks with done as a boolean', async () => {
  nextResult = [[{ id: 1, title: 'a', priority: 'Low', due_date: null, done: 0 }]];
  const res = await fetch(`${base}/api/tasks`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body[0].done, false);
});

test('POST /api/tasks creates a task', async () => {
  nextResult = [{ insertId: 7 }];
  const res = await fetch(`${base}/api/tasks`, json('POST', { title: '  Write report ', priority: 'High' }));
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.strictEqual(body.id, 7);
  assert.strictEqual(body.title, 'Write report');
  assert.deepStrictEqual(calls[0].params, ['Write report', 'High', null]);
});

test('POST /api/tasks rejects an empty title', async () => {
  const res = await fetch(`${base}/api/tasks`, json('POST', { title: '', priority: 'High' }));
  assert.strictEqual(res.status, 400);
  assert.strictEqual(calls.length, 0);
});

test('POST /api/tasks rejects a non-string title', async () => {
  const res = await fetch(`${base}/api/tasks`, json('POST', { title: 42, priority: 'High' }));
  assert.strictEqual(res.status, 400);
});

test('POST /api/tasks rejects a title over 120 characters', async () => {
  const res = await fetch(`${base}/api/tasks`, json('POST', { title: 'x'.repeat(121), priority: 'Low' }));
  assert.strictEqual(res.status, 400);
});

test('SQL-looking input is passed as a parameter, not as SQL', async () => {
  nextResult = [{ insertId: 1 }];
  const evil = "x'); DROP TABLE tasks; --";
  const res = await fetch(`${base}/api/tasks`, json('POST', { title: evil, priority: 'Low' }));
  assert.strictEqual(res.status, 201);
  assert.ok(!calls[0].sql.includes('DROP'));
  assert.strictEqual(calls[0].params[0], evil);
});

test('PATCH /api/tasks/:id requires a boolean done', async () => {
  const res = await fetch(`${base}/api/tasks/1`, json('PATCH', { done: 'yes' }));
  assert.strictEqual(res.status, 400);
});

test('PATCH /api/tasks/:id returns 404 for a missing task', async () => {
  nextResult = [{ affectedRows: 0 }];
  const res = await fetch(`${base}/api/tasks/999`, json('PATCH', { done: true }));
  assert.strictEqual(res.status, 404);
});

test('PATCH /api/tasks/:id updates a task', async () => {
  nextResult = [{ affectedRows: 1 }];
  const res = await fetch(`${base}/api/tasks/3`, json('PATCH', { done: true }));
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { id: 3, done: true });
});

test('DELETE /api/tasks/:id returns 404 for a missing task', async () => {
  nextResult = [{ affectedRows: 0 }];
  const res = await fetch(`${base}/api/tasks/999`, { method: 'DELETE' });
  assert.strictEqual(res.status, 404);
});

test('DELETE /api/tasks/:id deletes a task', async () => {
  nextResult = [{ affectedRows: 1 }];
  const res = await fetch(`${base}/api/tasks/3`, { method: 'DELETE' });
  assert.strictEqual(res.status, 204);
});

test('database errors return a generic 500 without details', async () => {
  nextResult = new Error('connect ECONNREFUSED secret-host:3306');
  const original = console.error;
  console.error = () => {};
  try {
    const res = await fetch(`${base}/api/tasks`);
    assert.strictEqual(res.status, 500);
    const text = await res.text();
    assert.ok(!text.includes('secret-host'));
  } finally {
    console.error = original;
  }
});

test('unknown API routes return 404', async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.strictEqual(res.status, 404);
});
