import { getAllComics, __setDb } from '../src/controllers/comicController.js';

// Minimal mock of Firestore behavior used by getAllComics
class MockCollection {
  constructor(name, docs = []) {
    this.name = name;
    this.docsData = docs;
    this._offset = 0;
    this._limit = null;
  }
  where() { return this; }
  orderBy() { return this; }
  offset(n) { this._offset = n; return this; }
  limit(n) { this._limit = n; return this; }
  async get() {
    const docs = this.docsData.map((d, i) => ({ id: d._id || `${i+1}`, data: () => d }));
    const sliced = docs.slice(this._offset, this._limit ? this._offset + this._limit : undefined);
    return {
      forEach: (cb) => sliced.forEach(cb),
      docs: sliced,
      empty: sliced.length === 0,
    };
  }
  doc(id) {
    const found = this.docsData.find(d => d._id === id);
    return {
      get: async () => ({ exists: !!found, id, data: () => found })
    };
  }
  async add(obj) {
    const id = `mock-${Date.now()}`;
    this.docsData.push({ _id: id, ...obj });
    return { id };
  }
}

class MockDB {
  constructor(data = {}) {
    this.collections = data; // map name -> array of docs
  }
  collection(name) {
    const docs = this.collections[name] || [];
    return new MockCollection(name, docs);
  }
}

// Simple mock req/res
const makeReq = (query = {}) => ({ query });
const makeRes = () => {
  return {
    _status: null,
    _body: null,
    status(code) { this._status = code; return this; },
    json(obj) { this._body = obj; console.log('RESPONSE:', JSON.stringify(obj, null, 2)); }
  };
};

async function run() {
  const sampleComics = [
    { _id: 'c1', title: 'Batman', author: 'Bob', genre: ['Action'], createdAt: { seconds: 1670000000 } },
    { _id: 'c2', title: 'Superman', author: 'Clark', genre: ['Action'], createdAt: { seconds: 1670001000 } },
  ];

  const mockDb = new MockDB({ comics: sampleComics });
  __setDb(mockDb);

  // Test 1: getAllComics without params (should return array)
  console.log('\n--- Test 1: getAllComics no params ---');
  const req1 = makeReq();
  const res1 = makeRes();
  await getAllComics(req1, res1);

  // Test 2: getAllComics with limit=1 (should return {data, hasMore})
  console.log('\n--- Test 2: getAllComics limit=1 ---');
  const req2 = makeReq({ limit: '1' });
  const res2 = makeRes();
  await getAllComics(req2, res2);

  // Test 3: getAllComics with search
  console.log('\n--- Test 3: getAllComics search=batman ---');
  const req3 = makeReq({ search: 'batman' });
  const res3 = makeRes();
  await getAllComics(req3, res3);
}

run().catch((e) => { console.error('Test runner error', e); process.exit(1); });
