import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import '../styles/Lecturas.css';

export default function Lecturas() {
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
