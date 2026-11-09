const test = require('node:test');
const assert = require('node:assert');
const { validateTask } = require('./server');

const valid = { title: 'Finish cloud assignment', priority: 'High', due_date: '2026-11-20' };

test('accepts a valid task', () => {
  assert.strictEqual(validateTask(valid), null);
});

test('accepts a task without a due date', () => {
  assert.strictEqual(validateTask({ ...valid, due_date: '' }), null);
});

test('rejects an empty title', () => {
  assert.ok(validateTask({ ...valid, title: '   ' }));
});

test('rejects an unknown priority', () => {
  assert.ok(validateTask({ ...valid, priority: 'Urgent' }));
});

test('rejects a badly formatted date', () => {
  assert.ok(validateTask({ ...valid, due_date: '20/11/2026' }));
});
