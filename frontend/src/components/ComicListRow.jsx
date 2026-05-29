import React from 'react';
import '../styles/ComicListRow.css';

const ComicListRow = ({ comic, isSelected, onSelect, onEdit, onDelete }) => {
  const getStatusLabel = (status) => {
    const statusMap = {
      'unread': 'No Leído',
      'reading': 'Leyendo',
      'completed': 'Completado'
    };
    return statusMap[status] || status;
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      'unread': '📖',
      'reading': '👀',
      'completed': '✅'
    };
    return iconMap[status] || '';
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

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`¿Eliminar "${displayTitle}"?`)) {
      onDelete(comic._id);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(comic);
  };

  return (
    <div className={`comic-list-row ${isSelected ? 'selected' : ''}`}>
      <input
        type="checkbox"
        className="row-checkbox"
        checked={isSelected}
        onChange={() => onSelect(comic._id)}
      />
      <div className="col-title">
        <span className="title-text">{displayTitle}</span>
        {displayIssueNumber && <span className="issue-number">{displayIssueNumber}</span>}
      </div>
      <div className="col-series">
        {comic.series ? (
          <>
            <span className="series-name">{comic.series}</span>
            {comic.usaNumbers && <span className="usa-badge">🇺🇸 {comic.usaNumbers}</span>}
          </>
        ) : (
          <span className="no-series">—</span>
        )}
      </div>
      <div className="col-status">
        <span className={`status-badge ${comic.readingStatus}`}>
          {getStatusIcon(comic.readingStatus)} {getStatusLabel(comic.readingStatus)}
        </span>
      </div>
      <div className="col-date">
        {comic.publicationDate ? (
          <span>{comic.publicationDate}</span>
        ) : (
          <span className="no-date">—</span>
        )}
      </div>
      <div className="col-actions">
        <button
          className="btn-list-edit"
          onClick={handleEdit}
          title="Editar"
        >
          ✏️
        </button>
        <button
          className="btn-list-delete"
          onClick={handleDelete}
          title="Eliminar"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default ComicListRow;
