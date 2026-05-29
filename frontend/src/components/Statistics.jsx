import React from 'react';
import '../styles/Statistics.css';

const Statistics = ({ stats }) => {
  if (!stats) {
    return <div className="statistics-loading">Cargando estadísticas...</div>;
  }

  return (
    <div className="statistics-container">
      <h2>Estadísticas de la Colección</h2>
      
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalComics}</div>
          <div className="stat-label">Cómics Totales</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{stats.completedComics}</div>
          <div className="stat-label">Completados</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{stats.readingPercentage}%</div>
          <div className="stat-label">Leído</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{stats.avgRating}</div>
          <div className="stat-label">Puntuación Media</div>
        </div>
      </div>

      {stats.genreStats && stats.genreStats.length > 0 && (
        <div className="stats-section">
          <h3>Géneros Principales</h3>
          <ul className="genre-list">
            {stats.genreStats.slice(0, 5).map((genre, idx) => (
              <li key={idx}>
                <span className="genre-name">{genre._id}</span>
                <span className="genre-count">{genre.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.topAuthors && stats.topAuthors.length > 0 && (
        <div className="stats-section">
          <h3>Autores Principales</h3>
          <ul className="author-list">
            {stats.topAuthors.map((author, idx) => (
              <li key={idx}>
                <span className="author-name">{author._id || 'Desconocido'}</span>
                <span className="author-count">{author.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Statistics;
