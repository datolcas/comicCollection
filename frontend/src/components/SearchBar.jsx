import React, { useState } from 'react';
import '../styles/SearchBar.css';

const SearchBar = ({ onSearch }) => {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    author: '',
    series: '',
    status: '',
    sort: 'recent',
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
  };

  const handleSubmit = () => {
    onSearch({ ...filters, search });
  };

  const handleReset = () => {
    setSearch('');
    setFilters({
      author: '',
      series: '',
      status: '',
      sort: 'recent',
    });
    onSearch({});
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Buscar cómics..."
        value={search}
        onChange={handleSearchChange}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        className="search-input"
      />
      <button className="btn-search" onClick={handleSubmit}>Buscar</button>
      
      <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
        🔍 Filtros
      </button>

      {showFilters && (
        <div className="filters-panel">
          <input
            type="text"
            name="author"
            placeholder="Filtrar por autor..."
            value={filters.author}
            onChange={handleFilterChange}
            className="filter-input"
          />
          <input
            type="text"
            name="series"
            placeholder="Filtrar por serie..."
            value={filters.series}
            onChange={handleFilterChange}
            className="filter-input"
          />
          <select name="status" value={filters.status} onChange={handleFilterChange} className="filter-select">
            <option value="">Todos los Estados</option>
            <option value="unread">No Leído</option>
            <option value="reading">Leyendo</option>
            <option value="completed">Completado</option>
          </select>
          <select name="sort" value={filters.sort} onChange={handleFilterChange} className="filter-select">
            <option value="recent">Más Reciente</option>
            <option value="rating">Mayor Puntuación</option>
            <option value="title">Título A-Z</option>
          </select>
          <button className="btn-reset" onClick={handleReset}>Limpiar Filtros</button>
          <button className="btn-apply" onClick={handleSubmit}>Aplicar</button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
