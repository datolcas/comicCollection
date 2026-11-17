import express from 'express';
import cors from 'cors';
import comicRoutes from './routes/comics.js';
import userRoutes from './routes/users.js';
import usaVolumeRoutes from './routes/usaVolumes.js';
import lecturasRoutes from './routes/lecturas.js';

// Builds the Express app without starting it or touching Firebase, so it can be
// used both by server.js and by the test suite (with a mock DB).
export const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

  // Configuración de CORS
  const allowedOrigins = [
    'https://comiccollectiondtc.onrender.com', // Tu frontend en Render
    'http://localhost:5173'                  // Para que sigas mapeando en local si quieres
  ];

  app.use(cors({
    origin: function (origin, callback) {
      // Permitir peticiones sin origen (como apps móviles o herramientas como Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Bloqueado por CORS: Origen no permitido'));
      }
    },
    credentials: true
  }));

  return app;
};
