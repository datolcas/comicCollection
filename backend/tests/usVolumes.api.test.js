import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/testServer.js';

// Only the endpoints that do not scrape external websites are covered here.
let api;
beforeEach(async () => {
  api = await startTestServer({
    usaVolumes: {
      v1: { title: 'X-Men (1991)', sourceUrl: 'https://example.com/xmen' },
      v2: { title: 'Avengers (1963)', sourceUrl: 'https://example.com/avengers' },
    },
  });
});
afterEach(async () => {
  await api.close();
});

test('GET /usa-volumes returns volumes sorted by title', async () => {
  const res = await api.get('/usa-volumes');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((v) => v.title), ['Avengers (1963)', 'X-Men (1991)']);
});

test('DELETE /usa-volumes/:id removes the volume', async () => {
  await api.get('/usa-volumes');
  assert.equal((await api.del('/usa-volumes/v1')).status, 200);
  assert.ok(!api.store.usaVolumes.has('v1'));
  const res = await api.get('/usa-volumes');
  assert.deepEqual(res.body.map((v) => v._id), ['v2']);
  assert.equal(api.stats.collectionGets.usaVolumes, 1);
});

test('POST /usa-volumes requires a URL', async () => {
  assert.equal((await api.post('/usa-volumes', {})).status, 400);
});

test('GET /health works', async () => {
  assert.deepEqual((await api.get('/health')).body, { status: 'API is running' });
});
