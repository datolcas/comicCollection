import React from 'react';
import '../styles/ComicDetailModal.css';

const ComicDetailModal = ({ comic, onClose, onCreateLectura }) => {
  if (!comic) return null;

  const getStatusLabel = (status) => {
    const statusMap = {
      'unread': 'No Leído',
      'reading': 'Leyendo',
      'completed': 'Completado'
    };
    return statusMap[status] || status;
  };

  const getConditionLabel = (condition) => {
    const conditionMap = {
      'mint': 'Impecable',
      'fine': 'Excelente',
      'very-good': 'Muy Bueno',
      'good': 'Bueno',
      'fair': 'Regular',
      'poor': 'Pobre'
    };
    return conditionMap[condition] || condition;
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

  const handleCreateLectura = () => {
    if (onCreateLectura) {
      onCreateLectura(comic);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>✕</button>
          {onCreateLectura && (
            <button className="modal-create-lectura" onClick={handleCreateLectura}>
              📖 Crear lectura
            </button>
          )}
        </div>

        <div className="modal-container">
          {/* Imagen */}
          <div className="modal-image-section">
            {comic.coverImage ? (
              <img src={comic.coverImage} alt={displayTitle} className="modal-image" />
            ) : (
              <div className="modal-no-image">Sin Imagen</div>
            )}
          </div>

          {/* Información */}
          <div className="modal-info-section">
            {/* Serie y Número */}
            {comic.series && (
              <div className="info-group">
                <label>Serie</label>
                <p>{comic.series} {displayIssueNumber}</p>
              </div>
            )}

            {/* Título */}
            <div className="info-group">
              <label>Título</label>
              <h2>{displayTitle}</h2>
            </div>

            {/* Contenido USA */}
            {comic.usaNumbers && (
              <div className="info-group">
                <label>Contenido USA</label>
                <p>🇺🇸 {comic.usaNumbers}</p>
              </div>
            )}

            {/* Información de Volumen */}
            {comic.volumeInfo && (
              <div className="info-group">
                <label>Volumen</label>
                <p>{comic.volumeInfo.title}</p>
                {comic.volumeInfo.yearRange && <p>{comic.volumeInfo.yearRange}</p>}
                {comic.volumeInfo.totalIssues != null && <p>{comic.volumeInfo.totalIssues} números</p>}
              </div>
            )}

            {/* Fecha de Publicación */}
            {comic.publicationDate && (
              <div className="info-group">
                <label>Fecha de Publicación</label>
                <p>📅 {comic.publicationDate}</p>
              </div>
            )}

            {/* Fecha de Portada */}
            {comic.coverDate && (
              <div className="info-group">
                <label>Fecha de Portada</label>
                <p>📕 {comic.coverDate}</p>
              </div>
            )}

            {/* Legacy */}
            {comic.legacyNumber && (
              <div className="info-group">
                <label>Legacy</label>
                <p>{comic.legacyNumber}</p>
              </div>
            )}

            {/* Precio */}
            {comic.purchasePrice != null && comic.purchasePrice !== '' && (
              <div className="info-group">
                <label>Precio</label>
                <p>{typeof comic.purchasePrice === 'number' ? `€${comic.purchasePrice.toFixed(2)}` : comic.purchasePrice}</p>
              </div>
            )}

            {/* Comprado por */}
            {comic.purchasePricePaid != null && comic.purchasePricePaid !== '' && (
              <div className="info-group">
                <label>Comprado por</label>
                <p>{typeof comic.purchasePricePaid === 'number' ? `€${comic.purchasePricePaid.toFixed(2)}` : comic.purchasePricePaid}</p>
              </div>
            )}

            {/* Estado de Lectura */}
            {comic.readingStatus && (
              <div className="info-group">
                <label>Estado de Lectura</label>
                <p>
                  <span className={`status-badge status-${comic.readingStatus}`}>
                    {getStatusLabel(comic.readingStatus)}
                  </span>
                </p>
              </div>
            )}

            {/* Puntuación */}
            {comic.rating && (
              <div className="info-group">
                <label>Puntuación</label>
                <p>
                  {'⭐'.repeat(Math.round(comic.rating))} {comic.rating}/5
                </p>
              </div>
            )}

            {/* Ubicación */}
            {comic.location && (
              <div className="info-group">
                <label>Ubicación</label>
                <p>📍 {comic.location}</p>
              </div>
            )}

            {/* Idioma */}
            {comic.language && (
              <div className="info-group">
                <label>Idioma</label>
                <p>🌐 {comic.language}</p>
              </div>
            )}

            {/* Autores */}
            {(comic.scriptwriter?.length > 0 || comic.artist?.length > 0 || comic.inker?.length > 0 || comic.otherAuthors?.length > 0) && (
              <div className="info-group">
                <label>Autores</label>
                <div className="authors-list">
                  {comic.scriptwriter?.length > 0 && (
                    <p>✏️ <strong>Guionista:</strong> {comic.scriptwriter.join(', ')}</p>
                  )}
                  {comic.artist?.length > 0 && (
                    <p>🎨 <strong>Dibujante:</strong> {comic.artist.join(', ')}</p>
                  )}
                  {comic.inker?.length > 0 && (
                    <p>🖋️ <strong>Entintador:</strong> {comic.inker.join(', ')}</p>
                  )}
                  {comic.otherAuthors?.length > 0 && (
                    <p>👥 <strong>Otros:</strong> {comic.otherAuthors.join(', ')}</p>
                  )}
                </div>
              </div>
            )}

            {/* URL Whakoom */}
            {comic.whakoomUrl && (
              <div className="info-group">
                <label>Referencia</label>
                <p>
                  <a href={comic.whakoomUrl} target="_blank" rel="noopener noreferrer" className="external-link">
                    🔗 Ver en Whakoom
                  </a>
                </p>
              </div>
            )}

            {/* Reseña */}
            {comic.review && (
              <div className="info-group">
                <label>Reseña</label>
                <p className="review-text">{comic.review}</p>
              </div>
            )}

            {/* Géneros */}
            {comic.genre?.length > 0 && (
              <div className="info-group">
                <label>Géneros</label>
                <div className="genre-list">
                  {comic.genre.map((g, idx) => (
                    <span key={idx} className="genre-badge">{g}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Descripción */}
            {comic.description && (
              <div className="info-group">
                <label>Descripción</label>
                <p className="description-text">{comic.description}</p>
              </div>
            )}

            {/* Condición */}
            {comic.condition && (
              <div className="info-group">
                <label>Condición</label>
                <p>{getConditionLabel(comic.condition)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComicDetailModal;
