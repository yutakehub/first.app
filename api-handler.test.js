import test from 'node:test';
import assert from 'node:assert/strict';
import status from './api/status.js';
import draft from './api/draft.js';
import followup from './api/followup.js';
import book from './api/book.js';
import supplement from './api/supplement.js';
function response() {
  return { headers: {}, statusCode: 200, body: null, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } };
}
test('serverless status works without a query object and returns no secrets', async () => {
  const res = response();
  await status({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(Object.keys(res.body), ['configured']);
  assert.equal(typeof res.body.configured, 'boolean');
  assert.equal(res.headers['Cache-Control'], 'no-store');
});
test('serverless API entrypoints reject wrong methods, oversized bodies and invalid JSON safely', async () => {
  for (const handler of [draft, followup, book, supplement]) {
    const wrongMethod = response();
    await handler({ method: 'GET', headers: {} }, wrongMethod);
    assert.equal(wrongMethod.statusCode, 405);
    const oversized = response();
    await handler({ method: 'POST', headers: { 'content-length': '100001' } }, oversized);
    assert.equal(oversized.statusCode, 413);
    const malformed = response();
    await handler({ method: 'POST', headers: {}, body: '{broken' }, malformed);
    assert.equal(malformed.statusCode, 400);
  }
});
