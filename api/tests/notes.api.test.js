// HTTP-level tests for the notes REST API. The MySQL pool is replaced by a fake
// that returns queued results, so these run in CI without a database.
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const pool = require('../src/db/pool');

let server;
let base;
let calls;
let results;

const NOTE = { id: 1, title: 'Hello', body: 'World', color: 'yellow', pinned: 0, created_at: '2026-11-09 10:00:00', updated_at: '2026-11-09 10:00:00' };

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(() => server.close());

test.beforeEach(() => {
  calls = [];
  results = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    const next = results.length ? results.shift() : [[]];
    if (next instanceof Error) throw next;
    return next;
  };
});

const send = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('GET /api/health returns ok', async () => {
  const res = await fetch(`${base}/health`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { status: 'ok' });
});

test('GET /api/notes lists notes, pinned first, with pinned as a boolean', async () => {
  results = [[[NOTE]]];
  const res = await fetch(`${base}/notes`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body[0].pinned, false);
  assert.match(calls[0].sql, /ORDER BY pinned DESC/);
});

test('POST /api/notes creates a note and returns it', async () => {
  results = [[{ insertId: 1 }], [[NOTE]]];
  const res = await fetch(`${base}/notes`, send('POST', { title: '  Hello ', body: 'World' }));
  assert.strictEqual(res.status, 201);
  assert.strictEqual((await res.json()).id, 1);
  assert.deepStrictEqual(calls[0].params, ['Hello', 'World', 'yellow', false]);
});

test('POST /api/notes rejects an empty note', async () => {
  const res = await fetch(`${base}/notes`, send('POST', { title: ' ', body: '' }));
  assert.strictEqual(res.status, 400);
  assert.strictEqual(calls.length, 0);
});

test('POST /api/notes rejects an unknown color', async () => {
  const res = await fetch(`${base}/notes`, send('POST', { title: 'x', color: 'orange' }));
  assert.strictEqual(res.status, 400);
});

test('POST /api/notes rejects malformed JSON with 400', async () => {
  const res = await fetch(`${base}/notes`, send('POST', '{"title": '));
  assert.strictEqual(res.status, 400);
});

test('SQL-looking text is stored as data, not run as SQL', async () => {
  results = [[{ insertId: 2 }], [[NOTE]]];
  const evil = "x'); DROP TABLE notes; --";
  const res = await fetch(`${base}/notes`, send('POST', { title: evil }));
  assert.strictEqual(res.status, 201);
  assert.ok(!calls[0].sql.includes('DROP'));
  assert.strictEqual(calls[0].params[0], evil);
});

test('PATCH /api/notes/:id updates only the fields sent', async () => {
  results = [[{ affectedRows: 1 }], [[{ ...NOTE, pinned: 1 }]]];
  const res = await fetch(`${base}/notes/1`, send('PATCH', { pinned: true }));
  assert.strictEqual(res.status, 200);
  assert.strictEqual((await res.json()).pinned, true);
  assert.strictEqual(calls[0].sql, 'UPDATE notes SET pinned = ? WHERE id = ?');
  assert.deepStrictEqual(calls[0].params, [true, '1']);
});

test('PATCH /api/notes/:id ignores unknown fields as column names', async () => {
  const res = await fetch(`${base}/notes/1`, send('PATCH', { 'id = 0; --': 'x' }));
  assert.strictEqual(res.status, 400);
  assert.strictEqual(calls.length, 0);
});

test('PATCH /api/notes/:id returns 404 for a missing note', async () => {
  results = [[{ affectedRows: 0 }]];
  const res = await fetch(`${base}/notes/999`, send('PATCH', { title: 'x' }));
  assert.strictEqual(res.status, 404);
});

test('a non-numeric id returns 404 without touching the database', async () => {
  const res = await fetch(`${base}/notes/abc`, { method: 'DELETE' });
  assert.strictEqual(res.status, 404);
  assert.strictEqual(calls.length, 0);
});

test('DELETE /api/notes/:id deletes a note', async () => {
  results = [[{ affectedRows: 1 }]];
  const res = await fetch(`${base}/notes/3`, { method: 'DELETE' });
  assert.strictEqual(res.status, 204);
});

test('DELETE /api/notes/:id returns 404 for a missing note', async () => {
  results = [[{ affectedRows: 0 }]];
  const res = await fetch(`${base}/notes/999`, { method: 'DELETE' });
  assert.strictEqual(res.status, 404);
});

test('database errors return a generic 500 without details', async () => {
  results = [new Error('connect ECONNREFUSED secret-host:3306')];
  const original = console.error;
  console.error = () => {};
  try {
    const res = await fetch(`${base}/notes`);
    assert.strictEqual(res.status, 500);
    assert.ok(!(await res.text()).includes('secret-host'));
  } finally {
    console.error = original;
  }
});

test('unknown API routes return 404', async () => {
  const res = await fetch(`${base}/nope`);
  assert.strictEqual(res.status, 404);
});
