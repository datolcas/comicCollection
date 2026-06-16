import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ComicProvider } from './services/ComicContext';
import CollectionPage from './pages/CollectionPage';
import DashboardPage from './pages/DashboardPage';
import AuthorsPage from './pages/AuthorsPage';
import LocationsPage from './pages/LocationsPage';
import SeriesPage from './pages/SeriesPage';
import UsVolumesPage from './pages/UsVolumesPage';
import Lecturas from './pages/Lecturas';
import LecturasPasadas from './pages/LecturasPasadas';
import LecturasEnCurso from './pages/LecturasEnCurso';
import LecturasFuturas from './pages/LecturasFuturas';
import './styles/App.css';

function App() {
  return (
    <ComicProvider>
      <BrowserRouter>
        <div className="app">
          <nav className="navbar">
            <div className="nav-container">
              <Link to="/" className="nav-logo">
                📚 Colección de Cómics
              </Link>
              <ul className="nav-menu">
                <li className="nav-item">
                  <Link to="/" className="nav-link">Colección</Link>
                </li>
                <li className="nav-item">
                  <Link to="/authors" className="nav-link">Autores</Link>
                </li>
                <li className="nav-item">
                  <Link to="/series" className="nav-link">Series</Link>
                </li>
                <li className="nav-item">
                  <Link to="/usa-volumes" className="nav-link">Volúmenes USA</Link>
                </li>
                <li className="nav-item">
                  <Link to="/locations" className="nav-link">Ubicaciones</Link>
                </li>
                <li className="nav-item">
                  <Link to="/dashboard" className="nav-link">Panel de Control</Link>
                </li>
                <li className="nav-item">
                  <Link to="/lecturas" className="nav-link">Lecturas</Link>
                </li>
              </ul>
            </div>
          </nav>

          <main className="main-content">
            <Routes>
                <Route path="/lecturas" element={<Lecturas />}>
                  <Route index element={<LecturasEnCurso />} />
                  <Route path="pasadas" element={<LecturasPasadas />} />
                  <Route path="en-curso" element={<LecturasEnCurso />} />
                  <Route path="futuras" element={<LecturasFuturas />} />
                </Route>
              <Route path="/" element={<CollectionPage />} />
              <Route path="/authors" element={<AuthorsPage />} />
              <Route path="/series" element={<SeriesPage />} />
              <Route path="/usa-volumes" element={<UsVolumesPage />} />
              <Route path="/locations" element={<LocationsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>
          </main>

          <footer className="footer">
            <p>&copy; 2024 Gestor de Colección de Cómics. ¡Gestiona tu colección con facilidad!</p>
          </footer>
        </div>
      </BrowserRouter>
    </ComicProvider>
  );
}

export default App;
