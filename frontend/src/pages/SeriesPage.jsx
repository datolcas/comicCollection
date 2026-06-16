import React, { useState, useEffect } from 'react';
import { useComics } from '../services/ComicContext';
import ComicCard from '../components/ComicCard';
import ComicDetailModal from '../components/ComicDetailModal';
import AddLecturaModal from '../components/AddLecturaModal';
import ComicForm from '../components/ComicForm';
import '../styles/SeriesPage.css';

const SeriesPage = () => {
  const { comics, fetchComics, updateComic, deleteComic } = useComics();
  const [series, setSeries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSeries, setFilteredSeries] = useState([]);
  const [expandedSeries, setExpandedSeries] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  const [selectedComic, setSelectedComic] = useState(null);
  const [editingComic, setEditingComic] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [addLecturaModalOpen, setAddLecturaModalOpen] = useState(false);
  const [preSelectedComicId, setPreSelectedComicId] = useState(null);

  useEffect(() => {
    // Always request the full comics list when entering the Series page
    // so series are built from the full collection (not from any filtered view).
    fetchComics({}, { force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Extraer todas las series y agrupar cómics por serie
    const seriesMap = {};

    comics.forEach(comic => {
      const seriesName = comic.series?.trim() || 'Sin Serie';
      if (!seriesMap[seriesName]) {
        seriesMap[seriesName] = { name: seriesName, comics: [] };
      }
      seriesMap[seriesName].comics.push(comic);
    });

    // Convertir a array, ordenar alfabéticamente y ordenar cómics por número dentro de cada serie
    const seriesList = Object.values(seriesMap)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(serie => ({
        ...serie,
        comics: serie.comics.sort((a, b) => {
          // Ordenar por issueNumber de forma numérica
          const numA = parseFloat(a.issueNumber) || 0;
          const numB = parseFloat(b.issueNumber) || 0;
          return numA - numB;
        })
      }));

    setSeries(seriesList);
    setFilteredSeries(seriesList);
  }, [comics]);

  useEffect(() => {
    // Filtrar series por búsqueda. Only reset to page 1 when search term changes,
    // not when `series` updates due to edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series]);

  useEffect(() => {
    const filtered = series.filter(serie =>
      serie.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSeries(filtered);
    // Reset to page 1 only when the user changes the search term
    setCurrentPage(1);
    // We intentionally only depend on `searchTerm` here so edits that update
    // `series` won't reset pagination.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleEdit = (comic) => {
    setEditingComic(comic);
    setShowForm(true);
  };

  const handleDelete = async (comicId) => {
    try {
      await deleteComic(comicId);
      if (selectedComic?._id === comicId) {
        setSelectedComic(null);
      }
    } catch (err) {
      alert('Error al eliminar cómic: ' + err.message);
    }
  };

  const handleEditComic = async (data) => {
    try {
      await updateComic(editingComic._id, data);
      setShowForm(false);
      setEditingComic(null);
    } catch (err) {
      alert('Error al actualizar cómic: ' + err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingComic(null);
  };

  const handleCreateLectura = (comic) => {
    setPreSelectedComicId(comic._id);
    setAddLecturaModalOpen(true);
    setSelectedComic(null);
  };

  return (
    <div className="series-page">
      <div className="series-header">
        <h1>📚 Series</h1>
        <p className="series-count">Total: {series.length} series</p>
      </div>

      <div className="series-search">
        <input
          type="text"
          placeholder="Buscar serie..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="series-list">
        {filteredSeries.length === 0 ? (
          <div className="no-series">
            <p>
              {series.length === 0
                ? 'Aún no hay cómics en tu colección'
                : 'No se encontraron series con ese nombre'}
            </p>
          </div>
        ) : (
          (() => {
            const totalPages = Math.max(1, Math.ceil(filteredSeries.length / PAGE_SIZE));
            const start = (currentPage - 1) * PAGE_SIZE;
            const pageSeries = filteredSeries.slice(start, start + PAGE_SIZE);
            return (
              <>
                <div className="pagination-controls">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</button>
                  <span> Página {currentPage} / {totalPages} </span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</button>
                </div>

                {pageSeries.map(serie => (
                  <div key={serie.name} className="series-section">
                    <div
                      className="series-header-item"
                      onClick={() =>
                        setExpandedSeries(
                          expandedSeries === serie.name ? null : serie.name
                        )
                      }
                    >
                      <div className="series-info-header">
                        <h2>{serie.name}</h2>
                        <span className="comic-count">📖 {serie.comics.length}</span>
                      </div>
                      <span className={`expand-icon ${expandedSeries === serie.name ? 'expanded' : ''}`}>
                        ▼
                      </span>
                    </div>

                    {expandedSeries === serie.name && (
                      <div className="series-comics">
                        <div className="comics-grid">
                          {serie.comics.map(comic => (
                            <ComicCard
                              key={comic._id}
                              comic={comic}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              onSelectComic={setSelectedComic}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div className="pagination-controls bottom">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</button>
                  <span> Página {currentPage} / {totalPages} </span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</button>
                </div>
              </>
            );
          })()
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

      {showForm && (
        <div className="form-modal">
          <div className="form-container">
            <ComicForm
              comic={editingComic}
              onSubmit={handleEditComic}
              onCancel={handleCancel}
              onDelete={handleDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SeriesPage;
