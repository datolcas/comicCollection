import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import comicRoutes from './routes/comics.js';
import { __setDb } from './controllers/comicController.js';
import userRoutes from './routes/users.js';
import usaVolumeRoutes from './routes/usaVolumes.js';
import lecturasRoutes from './routes/lecturas.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Provide DB to controllers that may run outside the full server lifecycle (tests)
try {
  __setDb(db);
} catch (e) {
  console.warn('Could not set DB on controllers:', e.message);
}

// Routes
app.use('/api/comics', comicRoutes);
app.use('/api/usa-volumes', usaVolumeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lecturas', lecturasRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong', error: err.message });
});

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
