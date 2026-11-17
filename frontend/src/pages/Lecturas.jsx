import React, { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useComics } from '../services/ComicContext';
import '../styles/Lecturas.css';

export default function Lecturas() {
  const { fetchLecturas, fetchComics } = useComics();

  useEffect(() => {
    // Shared by all tabs: loaded once (no-op if already loaded)
    fetchLecturas();
    fetchComics(); // needed by the comic selector in AddLecturaModal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="lecturas-section">
      <h1>Lecturas</h1>
      <nav className="lecturas-nav">
        <NavLink to="pasadas" activeClassName="active">Pasadas</NavLink>
        <NavLink to="en-curso" activeClassName="active">En curso</NavLink>
        <NavLink to="futuras" activeClassName="active">Futuras</NavLink>
      </nav>
      <div className="lecturas-content">
        <Outlet />
      </div>
    </div>
  );
}
