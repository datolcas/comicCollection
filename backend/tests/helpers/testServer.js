import { createApp } from '../../src/app.js';
import { __setDb } from '../../src/controllers/comicController.js';
import { createMockFirestore } from './mockFirestore.js';

// Starts the real Express app on a random port backed by a mock Firestore.
export const startTestServer = async (initialData = {}) => {
  const mock = createMockFirestore(initialData);
  __setDb(mock.db); // also resets the in-memory caches

  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  const request = async (method, path, body) => {
    const res = await fetch(baseUrl + path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // non-JSON body (e.g. CSV)
    }
    return { status: res.status, body: json, text, headers: res.headers };
  };

  return {
    ...mock,
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    del: (path) => request('DELETE', path),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
};
