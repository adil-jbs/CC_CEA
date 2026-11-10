// Unit tests for note validation (no server, no database).
const test = require('node:test');
const assert = require('node:assert');
const { validateNote } = require('../src/services/notes.service');

test('accepts a note with a title and text', () => {
  assert.strictEqual(validateNote({ title: 'Shopping', body: 'milk, eggs', color: 'blue', pinned: true }), null);
});

test('accepts a note with only text', () => {
  assert.strictEqual(validateNote({ body: 'just some text' }), null);
});

test('rejects an empty note', () => {
  assert.ok(validateNote({ title: '   ', body: '  ' }));
});

test('rejects an unknown color', () => {
  assert.ok(validateNote({ title: 'x', color: 'orange' }));
});

test('rejects a title over 120 characters', () => {
  assert.ok(validateNote({ title: 'x'.repeat(121) }));
});

test('rejects text over 10000 characters', () => {
  assert.ok(validateNote({ body: 'x'.repeat(10001) }));
});

test('rejects a non-boolean pinned', () => {
  assert.ok(validateNote({ title: 'x', pinned: 'yes' }));
});

test('an update must send at least one known field', () => {
  assert.ok(validateNote({ unknown: 1 }, { partial: true }));
  assert.strictEqual(validateNote({ pinned: false }, { partial: true }), null);
});
