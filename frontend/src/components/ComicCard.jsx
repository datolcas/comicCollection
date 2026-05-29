import React from 'react';
import '../styles/ComicCard.css';

const ComicCard = ({ comic, onEdit, onDelete, onSelectComic }) => {
  const getStatusLabel = (status) => {
    const statusMap = {
      'unread': 'No Leído',
      'reading': 'Leyendo',
      'completed': 'Completado'
    };
    return statusMap[status] || status;
  };

  const issueNumberString = comic.issueNumber != null ? String(comic.issueNumber) : '';
  const displayIssueNumber = issueNumberString
    ? (issueNumberString.startsWith('#') ? issueNumberString : `#${issueNumberString}`)
    : '';

  const displayTitle = comic.title && comic.title.trim()
    ? comic.title
    : comic.series
      ? `${comic.series}${displayIssueNumber ? ` ${displayIssueNumber}` : ''}`
      : 'Sin título';

  const handleCardClick = (e) => {
    // Solo abrir modal si no se hace click en botones o enlaces
    if (e.target.closest('.actions') || e.target.closest('.whakoom-link')) {
      return;
    }
    if (onSelectComic) {
      onSelectComic(comic);
    }
  };

  return (
    <div className="comic-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="comic-image">
        {comic.coverImage ? (
          <img src={comic.coverImage} alt={displayTitle} />
        ) : (
          <div className="no-image">Sin Imagen</div>
        )}
      </div>
      <div className="comic-content">
        {comic.series && <p className="field-series">📚 {comic.series} {displayIssueNumber}</p>}
        <h3>{displayTitle}</h3>
        {comic.issueNumber && !comic.series && <p className="field-number">Número: {displayIssueNumber}</p>}
        {comic.usaNumbers && <p className="field-usa">🇺🇸 {comic.usaNumbers}</p>}
        {comic.publicationDate && <p className="field-publication">📅 {comic.publicationDate}</p>}
        
        <div className="field-status-rating">
          <div className="status-badge">
            <span className={`status ${comic.readingStatus}`}>{getStatusLabel(comic.readingStatus)}</span>
          </div>
          {comic.rating && (
            <div className="rating">
              {'⭐'.repeat(Math.round(comic.rating))} <span>{comic.rating}/5</span>
            </div>
          )}
        </div>
        
        {comic.location && <p className="field-location">📍 {comic.location}</p>}
        
        {comic.whakoomUrl && <p className="whakoom-link"><a href={comic.whakoomUrl} target="_blank" rel="noopener noreferrer">🔗 Ver en Whakoom</a></p>}
        
        {comic.review && <p className="field-review"><strong>Reseña:</strong> {comic.review}</p>}
        
        <div className="actions">
          <button className="btn-edit" onClick={() => onEdit(comic)}>Editar</button>
        </div>
      </div>
    </div>
  );
};

export default ComicCard;
