# Firestore Operations Reference

Quick reference for working with Firestore in the backend.

## Importing

```javascript
import { db } from '../server.js';
```

## Collections

Your app uses a single `comics` collection:

```javascript
const collection = db.collection('comics');
```

## Create (Add)

```javascript
// Add new document (auto-generates ID)
const docRef = await db.collection('comics').add({
  title: 'Amazing Spider-Man',
  author: 'Stan Lee',
  rating: 5,
  createdAt: new Date(),
});
console.log('Document ID:', docRef.id);
```

## Read

```javascript
// Get single document
const doc = await db.collection('comics').doc('documentId').get();
if (doc.exists) {
  console.log('Data:', doc.data());
} else {
  console.log('Not found');
}

// Get all documents
const snapshot = await db.collection('comics').get();
const allComics = [];
snapshot.forEach((doc) => {
  allComics.push({ _id: doc.id, ...doc.data() });
});
```

## Query with Filters

```javascript
// Single condition
const query = db.collection('comics')
  .where('readingStatus', '==', 'completed');
const snapshot = await query.get();

// Multiple conditions (AND)
const query = db.collection('comics')
  .where('author', '==', 'Stan Lee')
  .where('rating', '>=', 4);
const snapshot = await query.get();

// Important: Firestore has no regex or "like" queries
// For text search, use client-side filtering:
const allComics = []; // get all first
const filtered = allComics.filter(c => 
  c.title.toLowerCase().includes(searchTerm.toLowerCase())
);
```

## Update

```javascript
// Update specific fields
await db.collection('comics').doc('documentId').update({
  rating: 4.5,
  updatedAt: new Date(),
});

// Set entire document (overwrites)
await db.collection('comics').doc('documentId').set({
  title: 'New Title',
  // ... other fields
});

// Merge with existing
await db.collection('comics').doc('documentId').set(
  { updatedAt: new Date() },
  { merge: true }
);
```

## Delete

```javascript
// Delete document
await db.collection('comics').doc('documentId').delete();

// Delete field
await db.collection('comics').doc('documentId').update({
  fieldName: admin.firestore.FieldValue.delete(),
});
```

## Transaction (Multiple Operations)

```javascript
const result = await db.runTransaction(async (transaction) => {
  // Get
  const doc = await transaction.get(
    db.collection('comics').doc('id1')
  );
  
  // Update in transaction
  transaction.update(
    db.collection('comics').doc('id1'),
    { quantity: doc.data().quantity - 1 }
  );
  
  return doc.data();
});
```

## Batch Write (Multiple Operations)

```javascript
const batch = db.batch();

// Add multiple operations
batch.set(db.collection('comics').doc('id1'), { title: 'Comic 1' });
batch.update(db.collection('comics').doc('id2'), { rating: 5 });
batch.delete(db.collection('comics').doc('id3'));

// Commit all at once
await batch.commit();
```

## Sorting (with Queries)

```javascript
// Note: Must create index in Firestore for most complex sorts
const query = db.collection('comics')
  .where('readingStatus', '==', 'completed')
  .orderBy('rating', 'desc')
  .limit(10);

const snapshot = await query.get();
```

## Pagination

```javascript
const pageSize = 10;

// First page
let query = db.collection('comics')
  .orderBy('createdAt', 'desc')
  .limit(pageSize);

let snapshot = await query.get();
const comics = snapshot.docs.map(doc => ({ 
  _id: doc.id, 
  ...doc.data() 
}));

// Next page (cursor)
const lastDoc = snapshot.docs[snapshot.docs.length - 1];
query = db.collection('comics')
  .orderBy('createdAt', 'desc')
  .startAfter(lastDoc)
  .limit(pageSize);

snapshot = await query.get();
```

## ArrayUnion & ArrayRemove

```javascript
// Add to array
await db.collection('comics').doc('id').update({
  tags: admin.firestore.FieldValue.arrayUnion('new-tag'),
});

// Remove from array
await db.collection('comics').doc('id').update({
  genre: admin.firestore.FieldValue.arrayRemove('Action'),
});
```

## Increment

```javascript
// Increment counter
await db.collection('comics').doc('id').update({
  quantity: admin.firestore.FieldValue.increment(1),
});
```

## Error Handling

```javascript
try {
  const doc = await db.collection('comics').doc(id).get();
  if (!doc.exists) {
    throw new Error('Comic not found');
  }
  return doc.data();
} catch (error) {
  console.error('Firestore error:', error.code, error.message);
  // error.code: 'permission-denied', 'not-found', 'invalid-argument', etc.
}
```

## Common Patterns

### Check if Document Exists
```javascript
const exists = (await db.collection('comics').doc(id).get()).exists;
```

### Count Documents
```javascript
const snapshot = await db.collection('comics').get();
const count = snapshot.size;
```

### Get All with Multiple Conditions
```javascript
const snapshot = await db.collection('comics').get();
const filtered = snapshot.docs
  .map(doc => ({ _id: doc.id, ...doc.data() }))
  .filter(comic => comic.rating >= 4 && comic.author === 'Stan Lee');
```

## Tips & Best Practices

✅ **Do:**
- Use `.where()` for server-side filtering when possible (faster, cheaper)
- Index complex queries (Firestore suggests indexes automatically)
- Use transactions for related updates
- Use batch writes for bulk operations
- Handle errors with try-catch

❌ **Don't:**
- Use regex in queries (not supported)
- Use "not equal" filters (use two queries instead)
- Query without indexes on large collections
- Do client-side filtering on large datasets
- Forget timestamps (add `createdAt`, `updatedAt`)

## Limits

- Document size: 1 MB
- Nested depth: 20 levels
- Composite indexes: Firestore creates automatically
- Query complexity: Simpler is better

## Need More Info?

Check official docs: https://firebase.google.com/docs/firestore
