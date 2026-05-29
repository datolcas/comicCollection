import React, { useState } from 'react';
import { useComics } from '../services/ComicContext';
import '../styles/BulkLoadModal.css';

const BulkLoadModal = ({ isOpen, onClose }) => {
  const { loadComicsFromList, fetchComics } = useComics();
  const [urlText, setUrlText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const handleLoadFromFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUrlText(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const parseUrls = (text) => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.includes('whakoom'));
  };

  const handleLoadComics = async () => {
    setError('');
    setProgress(null);

    const urls = parseUrls(urlText);
    if (urls.length === 0) {
      setError('No se encontraron URLs de Whakoom válidas');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/comics/load-from-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      // Initialize progress
      setProgress({
        successful: [],
        duplicates: [],
        failed: [],
        total: urls.length,
        current: 0,
        message: 'Iniciando carga...',
        isLoading: true
      });

      // Use TextDecoder to read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i += 2) {
          const eventLine = lines[i];
          const dataLine = lines[i + 1];

          if (eventLine.startsWith('event: ') && dataLine.startsWith('data: ')) {
            const eventType = eventLine.slice(7);
            const eventData = JSON.parse(dataLine.slice(6));

            setProgress(prev => {
              const updated = { ...prev };
              
              if (eventType === 'start') {
                return { ...updated, message: eventData.message, total: eventData.total, isLoading: true };
              }
              
              if (eventType === 'processing') {
                return { 
                  ...updated, 
                  current: eventData.progress,
                  message: eventData.message,
                  isLoading: true
                };
              }
              
              if (eventType === 'item_success') {
                return {
                  ...updated,
                  successful: [...updated.successful, eventData],
                  current: eventData.progress,
                  message: `Cargado: ${eventData.title}`,
                  isLoading: true
                };
              }
              
              if (eventType === 'item_duplicate') {
                return {
                  ...updated,
                  duplicates: [...updated.duplicates, eventData],
                  current: eventData.progress,
                  message: `Duplicado: ${eventData.title}`,
                  isLoading: true
                };
              }
              
              if (eventType === 'item_failed') {
                return {
                  ...updated,
                  failed: [...updated.failed, eventData],
                  current: eventData.progress,
                  message: `Error: ${eventData.url}`,
                  isLoading: true
                };
              }
              
              if (eventType === 'complete') {
                return {
                  ...updated,
                  message: eventData.message,
                  isComplete: true,
                  isLoading: false  // Mark as complete and not loading
                };
              }
              
              return updated;
            });
          }
        }
      }

      setLoading(false);
      setUrlText('');

    } catch (err) {
      console.error('Error loading comics:', err);
      setError(err.message);
      setLoading(false);
      // Mark progress as complete with error
      setProgress(prev => prev ? { ...prev, isLoading: false, isComplete: true } : null);
    }
  };

  const handleClose = () => {
    // Si hay cómics cargados exitosamente, refrescar la colección
    if (progress?.successful?.length > 0) {
      fetchComics();
    }
    setUrlText('');
    setResults(null);
    setProgress(null);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="bulk-load-modal" onClick={(e) => e.stopPropagation()}>
        <h2>📥 Cargar Múltiples Cómics</h2>

        {!progress ? (
          <>
            <div className="bulk-load-instructions">
              <p>Pega una lista de URLs de Whakoom (una por línea) o sube un archivo de texto.</p>
            </div>

            {error && <div className="bulk-error">{error}</div>}

            <textarea
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              placeholder="https://www.whakoom.com/comics/..&#10;https://www.whakoom.com/comics/..&#10;https://www.whakoom.com/comics/.."
              className="bulk-load-textarea"
              disabled={loading}
            />

            <div className="bulk-load-actions">
              <label className="btn-upload">
                📂 Cargar desde archivo
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleLoadFromFile}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
              </label>

              <button
                onClick={handleLoadComics}
                disabled={loading || urlText.trim().length === 0}
                className="btn-load"
              >
                {loading ? '⏳ Cargando...' : '🚀 Cargar Cómics'}
              </button>

              <button onClick={handleClose} disabled={loading} className="btn-cancel">
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <div className="bulk-load-results">
            <h3>Progreso de carga</h3>

            {/* Progress bar */}
            <div className="progress-container">
              <div className="progress-bar-wrapper">
                <div 
                  className="progress-bar" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
              <p className="progress-text">
                {progress.current}/{progress.total} - {Math.round((progress.current / progress.total) * 100)}%
              </p>
              <p className="progress-message">{progress.message}</p>
            </div>

            <div className="results-summary">
              <div className="summary-item successful">
                <span>✅ Exitosos:</span>
                <strong>{progress.successful.length}</strong>
              </div>
              <div className="summary-item duplicates">
                <span>⚠️ Duplicados:</span>
                <strong>{progress.duplicates.length}</strong>
              </div>
              <div className="summary-item failed">
                <span>❌ Fallidos:</span>
                <strong>{progress.failed.length}</strong>
              </div>
            </div>

            {progress.successful.length > 0 && (
              <div className="results-section">
                <h4>Cómics cargados exitosamente</h4>
                <div className="results-list">
                  {progress.successful.map((comic, idx) => {
                    const issueNumberString = comic.issueNumber != null ? String(comic.issueNumber) : '';
                    const displayIssueNumber = issueNumberString
                      ? (issueNumberString.startsWith('#') ? issueNumberString : `#${issueNumberString}`)
                      : '';
                    const displayTitle = comic.title && comic.title.trim()
                      ? comic.title
                      : comic.series
                        ? `${comic.series}${displayIssueNumber ? ` ${displayIssueNumber}` : ''}`
                        : 'Sin título';
                    return (
                      <div key={idx} className="result-item success">
                        <p><strong>{displayTitle}</strong></p>
                        {comic.series && <p>Series: {comic.series}</p>}
                        {displayIssueNumber && <p>Número: {displayIssueNumber}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {progress.duplicates.length > 0 && (
              <div className="results-section">
                <h4>Cómics duplicados (ya existen en tu colección)</h4>
                <div className="results-list">
                  {progress.duplicates.map((comic, idx) => {
                    const issueNumberString = comic.issueNumber != null ? String(comic.issueNumber) : '';
                    const displayIssueNumber = issueNumberString
                      ? (issueNumberString.startsWith('#') ? issueNumberString : `#${issueNumberString}`)
                      : '';
                    const displayTitle = comic.title && comic.title.trim()
                      ? comic.title
                      : comic.series
                        ? `${comic.series}${displayIssueNumber ? ` ${displayIssueNumber}` : ''}`
                        : 'Sin título';
                    return (
                      <div key={idx} className="result-item duplicate">
                        <p><strong>{displayTitle}</strong></p>
                        {displayIssueNumber && <p>Número: {displayIssueNumber}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {progress.failed.length > 0 && (
              <div className="results-section">
                <h4>Error al cargar ({progress.failed.length})</h4>
                <div className="results-list">
                  {progress.failed.map((failedItem, idx) => (
                    <div key={idx} className="result-item error">
                      <p className="error-url">{failedItem.url}</p>
                      <p className="error-msg">{failedItem.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bulk-load-actions">
              <button 
                onClick={handleClose} 
                className="btn-close"
                disabled={progress.isLoading}
              >
                {progress.isLoading ? '⏳ Cargando...' : '✅ Cerrar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkLoadModal;
