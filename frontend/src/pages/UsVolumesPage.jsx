import React, { useState, useEffect } from 'react';
import { useComics } from '../services/ComicContext';
import ComicDetailModal from '../components/ComicDetailModal';
import AddLecturaModal from '../components/AddLecturaModal';
import '../styles/UsVolumesPage.css';

const UsVolumesPage = () => {
  const {
    comics,
    usVolumes,
    volumeLoading,
    fetchComics,
    fetchUsVolumes,
    createOrUpdateUsVolume,
    deleteUsVolume,
  } = useComics();
  const [searchTerm, setSearchTerm] = useState('');
  const [volumeUrl, setVolumeUrl] = useState('');
  const [volumeMessage, setVolumeMessage] = useState('');
  const [isSubmittingVolume, setIsSubmittingVolume] = useState(false);
  const [expandedVolumes, setExpandedVolumes] = useState([]);
  const [volumeIssues, setVolumeIssues] = useState({}); // Cache for fetched issues
  const [fetchingIssues, setFetchingIssues] = useState({});
  const [selectedComic, setSelectedComic] = useState(null);
  const [addLecturaModalOpen, setAddLecturaModalOpen] = useState(false);
  const [preSelectedComicId, setPreSelectedComicId] = useState(null);

  useEffect(() => {
    fetchUsVolumes();
    if (comics.length === 0) {
      fetchComics();
    }
  }, [comics.length]);

  const normalizeText = (text) => (text || '').toString().trim().toLowerCase();

  const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const matchesVolumeExact = (volume, text) => {
    if (!text) return false;

    const normalizedText = normalizeText(text);
    const volumeName = normalizeText(volume.title);
    const baseName = normalizeText(getVolumeSeriesName(volume));
    const volumeNumber = volume.volumeNumber ? volume.volumeNumber.toString().trim() : '';

    const patterns = [
      new RegExp(`\\b${escapeRegExp(volumeName)}\\b`, 'i'),
    ];

    if (baseName && volumeNumber) {
      patterns.push(
        new RegExp(`\\b${escapeRegExp(baseName)}\\s+vol(?:ume)?\\.?\\s*${escapeRegExp(volumeNumber)}\\b`, 'i')
      );
    }

    return patterns.some((pattern) => pattern.test(normalizedText));
  };

  const getVolumeSeriesName = (volume) => {
    return volume.title.replace(/\s*Vol(?:ume)?\.?\s*\d+$/i, '').trim();
  };

  const parseRangeNumbers = (text) => {
    const numbers = new Set();
    const normalized = (text || '').toString().trim();

    // Extract explicit ranges first
    for (const match of normalized.matchAll(/(\d+)\s*[-–—]\s*(\d+)/g)) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
        for (let n = start; n <= end; n += 1) {
          numbers.add(n);
        }
      }
    }

    // Extract individual issue numbers, but ignore volume identifiers like "Vol 3" or "Volume 3"
    const numberRegex = /(?:#|No\.?\s*)?(\d+)/gi;
    for (const match of normalized.matchAll(numberRegex)) {
      const value = parseInt(match[1], 10);
      if (Number.isNaN(value)) continue;

      const prefix = normalized.slice(Math.max(0, match.index - 15), match.index).toLowerCase();
      if (/\bvol(?:ume)?\s*$/.test(prefix)) continue;

      numbers.add(value);
    }

    return Array.from(numbers).sort((a, b) => a - b);
  };

  const parseUsaNumbersForVolume = (volume, usaNumbers) => {
    if (!usaNumbers) return [];

    const raw = usaNumbers.toString();
    const segments = raw.split(/[,;]+/).map((segment) => segment.trim()).filter(Boolean);
    const numbers = new Set();

    segments.forEach((segment) => {
      if (!matchesVolumeExact(volume, segment)) return;
      parseRangeNumbers(segment).forEach((number) => numbers.add(number));
    });

    return Array.from(numbers).sort((a, b) => a - b);
  };

  // Fetch issues from Marvel Fandom
  const fetchVolumeIssuesFromFandom = async (volume) => {
    if (volumeIssues[volume._id]) {
      // Already cached
      return;
    }

    setFetchingIssues((prev) => ({ ...prev, [volume._id]: true }));
    try {
      const response = await fetch(
        `/api/usa-volumes/issues?url=${encodeURIComponent(volume.sourceUrl)}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch issues');
      }
      const data = await response.json();
      setVolumeIssues((prev) => ({ ...prev, [volume._id]: data.issues || [] }));
    } catch (error) {
      console.error('Error fetching volume issues:', error);
      setVolumeIssues((prev) => ({ ...prev, [volume._id]: [] }));
    } finally {
      setFetchingIssues((prev) => ({ ...prev, [volume._id]: false }));
    }
  };

  const getVolumeIssues = (volume) => {
    // Use Marvel Fandom issues if available, otherwise use collection-based issues
    const fandonIssues = volumeIssues[volume._id] || [];
    
    if (fandonIssues.length > 0) {
      // Build map from Fandom issues
      const issueMap = new Map();
      
      fandonIssues.forEach((fandomIssue) => {
        const issueNum = fandomIssue.legacyNumber;
        issueMap.set(issueNum, {
          number: issueNum,
          legacyNumber: issueNum,
          publicationDate: fandomIssue.publicationDate || '',
          coverDate: fandomIssue.coverDate || '',
          title: fandomIssue.title || '',
          inCollection: false,
          readingStatus: null,
          source: 'Marvel Fandom',
        });
      });

      // Enhance with collection data
      const volumeName = normalizeText(volume.title);
      const baseName = normalizeText(getVolumeSeriesName(volume));
      const volumeNumber = volume.volumeNumber ? volume.volumeNumber.toString().trim() : '';

      const explicitSeriesValues = [
        volumeName,
        baseName,
        `${baseName} vol ${volumeNumber}`,
        `${baseName} volume ${volumeNumber}`,
      ].filter(Boolean);

      comics.forEach((comic) => {
        const series = normalizeText(comic.series);
        const usaNumbers = comic.usaNumbers || '';
        const volumeRangeNumbers = parseUsaNumbersForVolume(volume, usaNumbers);
        const matchesSeries = explicitSeriesValues.some((value) => value && series === value);

        const issueNumber = parseInt(comic.legacyNumber || comic.issueNumber || '', 10);
        if (matchesSeries && !Number.isNaN(issueNumber)) {
          if (issueMap.has(issueNumber)) {
            const existing = issueMap.get(issueNumber);
            existing.inCollection = true;
            existing.readingStatus = comic.readingStatus;
            existing._id = comic._id;
            existing.sourceComic = comic;
          }
        }

        volumeRangeNumbers.forEach((number) => {
          if (issueMap.has(number)) {
            const existing = issueMap.get(number);
            existing.inCollection = true;
            existing.readingStatus = comic.readingStatus;
            existing._id = comic._id;
            existing.sourceComic = comic;
          }
        });
      });

      return Array.from(issueMap.values()).sort((a, b) => a.number - b.number);
    }

    // Fallback to collection-based issues if no Fandom data
    const volumeName = normalizeText(volume.title);
    const baseName = normalizeText(getVolumeSeriesName(volume));
    const volumeNumber = volume.volumeNumber ? volume.volumeNumber.toString().trim() : '';

    const explicitSeriesValues = [
      volumeName,
      baseName,
      `${baseName} vol ${volumeNumber}`,
      `${baseName} volume ${volumeNumber}`,
    ].filter(Boolean);

    const issueMap = new Map();

    comics.forEach((comic) => {
      const series = normalizeText(comic.series);
      const title = normalizeText(comic.title);
      const usaNumbers = comic.usaNumbers || '';
      const volumeRangeNumbers = parseUsaNumbersForVolume(volume, usaNumbers);
      const matchesSeries = explicitSeriesValues.some((value) => value && series === value);
      const matchesTitle = matchesVolumeExact(volume, title);

      if (matchesSeries || matchesTitle) {
        const issueNumber = parseInt(comic.legacyNumber || comic.issueNumber || '', 10);
        if (!Number.isNaN(issueNumber)) {
          issueMap.set(issueNumber, {
            _id: comic._id,
            number: issueNumber,
            legacyNumber: comic.legacyNumber,
            publicationDate: comic.publicationDate,
            coverDate: comic.coverDate,
            readingStatus: comic.readingStatus,
            inCollection: true,
            source: comic.title,
            sourceComic: comic,
          });
        }
      }

      volumeRangeNumbers.forEach((number) => {
        if (!issueMap.has(number)) {
          issueMap.set(number, {
            number,
            legacyNumber: number,
            publicationDate: comic.publicationDate,
            coverDate: comic.coverDate,
            readingStatus: comic.readingStatus,
            inCollection: true,
            source: comic.usaNumbers,
            sourceComic: comic,
          });
        }
      });
    });

    return Array.from(issueMap.values()).sort((a, b) => a.number - b.number);
  };

  const toggleVolume = async (volumeId, volume) => {
    const isCurrentlyExpanded = expandedVolumes.includes(volumeId);
    
    if (!isCurrentlyExpanded) {
      // Volume is being expanded, fetch issues if not already cached
      await fetchVolumeIssuesFromFandom(volume);
    }

    setExpandedVolumes((prev) =>
      prev.includes(volumeId)
        ? prev.filter((id) => id !== volumeId)
        : [...prev, volumeId]
    );
  };

  const getReadingStatusLabel = (status) => {
    if (status === 'completed') return 'Leído';
    if (status === 'reading') return 'Leyendo';
    return 'No leído';
  };

  const handleCreateOrUpdateVolume = async () => {
    if (!volumeUrl.trim()) {
      setVolumeMessage('Introduce una URL de Marvel Fandom.');
      return;
    }

    setIsSubmittingVolume(true);
    setVolumeMessage('');

    try {
      const result = await createOrUpdateUsVolume(volumeUrl.trim());
      setVolumeMessage(result.updated ? 'Volumen actualizado correctamente.' : 'Volumen creado correctamente.');
      setVolumeUrl('');
    } catch (err) {
      setVolumeMessage(err.message || 'Error al guardar el volumen.');
    } finally {
      setIsSubmittingVolume(false);
    }
  };

  const handleCreateLectura = (comic) => {
    setPreSelectedComicId(comic._id);
    setAddLecturaModalOpen(true);
    setSelectedComic(null);
  };

  const visibleVolumes = usVolumes.filter((volume) =>
    volume.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="usa-volumes-page">
      <div className="usa-header">
        <h1>Volúmenes USA</h1>
        <p className="usa-description">
          Consulta colecciones USA agrupadas por volumen. Expande cada volumen para ver los números incluidos y su estado en tu colección.
        </p>
        <div className="usa-search">
          <input
            type="text"
            placeholder="Buscar volumen USA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="usa-add-volume-section">
        <h2>Añadir / Actualizar Volumen USA</h2>
        <p>Pega un enlace de Marvel Fandom para crear o actualizar un volumen manualmente.</p>
        <div className="usa-add-volume-form">
          <input
            type="url"
            value={volumeUrl}
            onChange={(e) => setVolumeUrl(e.target.value)}
            placeholder="Pega URL de Marvel Fandom (ej: https://marvel.fandom.com/wiki/Fantastic_Four_Vol_1)"
          />
          <button
            type="button"
            onClick={handleCreateOrUpdateVolume}
            disabled={isSubmittingVolume}
          >
            {isSubmittingVolume ? 'Guardando...' : 'Añadir / Actualizar volumen'}
          </button>
        </div>
        {volumeMessage && <p className="usa-volume-message">{volumeMessage}</p>}
      </div>

      <div className="usa-saved-volumes-section">
        <h2>Volúmenes USA guardados manualmente</h2>
        <p>Estos son los volúmenes que has creado desde enlaces de Marvel Fandom. Solo estos pueden eliminarse directamente.</p>
        {volumeLoading ? (
          <div className="usa-loading">Cargando volúmenes guardados...</div>
        ) : usVolumes.length === 0 ? (
          <div className="usa-empty">
            <p>No hay volúmenes USA guardados todavía.</p>
            <p>Agrega un enlace de Marvel Fandom para crear un volumen.</p>
          </div>
        ) : (
          <div className="usa-saved-volumes-list">
            {visibleVolumes.map((volume) => {
              const issues = getVolumeIssues(volume);
              const isExpanded = expandedVolumes.includes(volume._id);
              const isFetching = fetchingIssues[volume._id];

              return (
                <div key={volume._id} className="usa-volume-card">
                  <button
                    type="button"
                    className="usa-volume-header"
                    onClick={() => toggleVolume(volume._id, volume)}
                  >
                    <div>
                      <h2>{volume.title}</h2>
                      {volume.yearRange && <p>{volume.yearRange}</p>}
                      {volume.totalIssues != null && <p>{volume.totalIssues} números</p>}
                      {volume.volumeNumber && <p>Volumen {volume.volumeNumber}</p>}
                    </div>
                    <span className={`usa-toggle ${isExpanded ? 'expanded' : ''}`}>
                      {isExpanded ? 'Ocultar números' : 'Ver números'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="usa-volume-details">
                      {isFetching ? (
                        <p className="usa-loading-issues">Cargando números del volumen...</p>
                      ) : issues.length === 0 ? (
                        <p className="usa-no-issues">
                          No se encontraron números de este volumen.
                        </p>
                      ) : (
                        <table className="usa-issues-table">
                          <thead>
                            <tr>
                              <th>Número Legacy</th>
                              <th>Fecha publicación</th>
                              <th>Fecha portada</th>
                              <th>En colección</th>
                              <th>Leído</th>
                            </tr>
                          </thead>
                          <tbody>
                            {issues.map((comic) => (
                              <tr
                              key={`${volume._id}-${comic.legacyNumber}`}
                              className={`${comic.inCollection ? 'in-collection' : ''} ${comic.inCollection && comic.sourceComic ? 'clickable' : ''}`}
                              onClick={() => {
                                if (comic.inCollection && comic.sourceComic) {
                                  setSelectedComic(comic.sourceComic);
                                }
                              }}
                            >
                                <td>{comic.legacyNumber || '—'}</td>
                                <td>{comic.publicationDate || '—'}</td>
                                <td>{comic.coverDate || '—'}</td>
                                <td>{comic.inCollection ? 'Sí' : 'No'}</td>
                                <td>{comic.inCollection ? getReadingStatusLabel(comic.readingStatus) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <div className="usa-saved-volume-actions" style={{ marginTop: '1rem' }}>
                        <button
                          type="button"
                          onClick={async () => {
                            setIsSubmittingVolume(true);
                            setVolumeMessage('');
                            try {
                              const result = await createOrUpdateUsVolume(volume.sourceUrl);
                              setVolumeMessage(result.updated ? 'Volumen actualizado correctamente.' : 'Volumen creado correctamente.');
                              // Clear cache to refetch
                              setVolumeIssues((prev) => {
                                const newIssues = { ...prev };
                                delete newIssues[volume._id];
                                return newIssues;
                              });
                            } catch (err) {
                              setVolumeMessage(err.message || 'Error al actualizar el volumen.');
                            } finally {
                              setIsSubmittingVolume(false);
                            }
                          }}
                        >
                          Actualizar volumen
                        </button>
                        <button
                          type="button"
                          className="usa-delete-volume-btn"
                          onClick={async () => {
                            if (!window.confirm('¿Seguro que deseas eliminar este volumen USA?')) return;
                            setIsSubmittingVolume(true);
                            setVolumeMessage('');
                            try {
                              await deleteUsVolume(volume._id);
                              setVolumeMessage('Volumen eliminado correctamente.');
                            } catch (err) {
                              setVolumeMessage(err.message || 'Error al eliminar el volumen.');
                            } finally {
                              setIsSubmittingVolume(false);
                            }
                          }}
                        >
                          Eliminar volumen
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="usa-saved-volume-source">
                    <a href={volume.sourceUrl} target="_blank" rel="noreferrer">
                      {volume.sourceUrl}
                    </a>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {selectedComic && (
        <ComicDetailModal
          comic={selectedComic}
          onClose={() => setSelectedComic(null)}
          onCreateLectura={handleCreateLectura}
        />
      )}

      {addLecturaModalOpen && (
        <AddLecturaModal
          isOpen={addLecturaModalOpen}
          onClose={() => {
            setAddLecturaModalOpen(false);
            setPreSelectedComicId(null);
          }}
          preSelectedComicId={preSelectedComicId}
          onSave={() => {
            setAddLecturaModalOpen(false);
            setPreSelectedComicId(null);
          }}
        />
      )}
    </div>
  );
};

export default UsVolumesPage;
