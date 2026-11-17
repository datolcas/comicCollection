import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/testServer.js';
import { MockTimestamp } from './helpers/mockFirestore.js';

let api;
beforeEach(async () => {
  api = await startTestServer({
    comics: { c1: { title: 'Batman', issueNumber: 1 } },
    lecturas: {
      l1: { comic: 'c1', startDate: new MockTimestamp('2024-05-01'), endDate: null },
      l2: { comic: 'deleted-comic', startDate: new MockTimestamp('2024-06-01'), endDate: new MockTimestamp('2024-06-10') },
    },
  });
});
afterEach(async () => {
  await api.close();
});

test('GET /lecturas joins each lectura with its comic and returns ISO dates', async () => {
  const res = await api.get('/lecturas');
  assert.equal(res.status, 200);
  const l1 = res.body.find((l) => l._id === 'l1');
  assert.equal(l1.comic.title, 'Batman');
  assert.equal(l1.startDate, '2024-05-01T00:00:00.000Z');
  assert.equal(l1.endDate, null);

  const l2 = res.body.find((l) => l._id === 'l2');
  assert.equal(l2.comic, null, 'missing comic resolves to null');
  assert.equal(l2.endDate, '2024-06-10T00:00:00.000Z');
});

test('POST /lecturas validates input and creates a lectura', async () => {
  assert.equal((await api.post('/lecturas', { comic: 'c1' })).status, 400);

  const res = await api.post('/lecturas', { comic: 'c1', startDate: '2024-07-01' });
  assert.equal(res.status, 201);
  assert.equal(res.body.comic.title, 'Batman');
  assert.equal(res.body.startDate, '2024-07-01T00:00:00.000Z');
  assert.ok(api.store.lecturas.has(res.body._id));

  const list = await api.get('/lecturas');
  assert.equal(list.body.length, 3);
});

test('PUT /lecturas/:id updates dates and returns the same format as GET', async () => {
  const res = await api.put('/lecturas/l1', { startDate: '2024-05-02', endDate: '2024-05-20' });
  assert.equal(res.status, 200);
  assert.equal(res.body.startDate, '2024-05-02T00:00:00.000Z');
  assert.equal(res.body.endDate, '2024-05-20T00:00:00.000Z');
  assert.equal(res.body.comic.title, 'Batman');

  assert.equal((await api.put('/lecturas/l1', {})).status, 400);
  assert.equal((await api.put('/lecturas/missing', { startDate: '2024-01-01' })).status, 404);
});

test('DELETE /lecturas/:id removes the lectura', async () => {
  assert.equal((await api.del('/lecturas/l1')).status, 200);
  assert.ok(!api.store.lecturas.has('l1'));
  const list = await api.get('/lecturas');
  assert.deepEqual(list.body.map((l) => l._id), ['l2']);
});

test('lecturas are read from Firestore only once', async () => {
  await api.get('/lecturas');
  await api.post('/lecturas', { comic: 'c1', startDate: '2024-07-01' });
  await api.put('/lecturas/l1', { startDate: '2024-05-02' });
  await api.get('/lecturas');
  assert.equal(api.stats.collectionGets.lecturas, 1);
  assert.equal(api.stats.collectionGets.comics, 1);
});
