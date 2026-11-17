import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { createApp } from './app.js';
import { __setDb } from './controllers/comicController.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Firebase Initialization
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
  });
  console.log('Firebase initialized successfully');
} catch (err) {
  console.error('Firebase initialization error:', err.message);
}

const db = admin.firestore();

// Provide the DB to controllers, routes and caches
__setDb(db);

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set PORT in your environment or stop the process using that port.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

export default app;
export { db };
