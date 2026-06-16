import React, { useState, useEffect } from 'react';
import { useComics } from '../services/ComicContext';
import ComicCard from '../components/ComicCard';
import ComicListRow from '../components/ComicListRow';
import ComicForm from '../components/ComicForm';
import ComicDetailModal from '../components/ComicDetailModal';
import AddLecturaModal from '../components/AddLecturaModal';
import BulkLoadModal from '../components/BulkLoadModal';
import SearchBar from '../components/SearchBar';
import '../styles/CollectionPage.css';

const CollectionPage = () => {
  const { comics, loading, error, fetchComics, addComic, updateComic, deleteComic } = useComics();
  const [showForm, setShowForm] = useState(false);
  const [showBulkLoad, setShowBulkLoad] = useState(false);
  const [editingComic, setEditingComic] = useState(null);
  const [selectedComic, setSelectedComic] = useState(null);
  const [searchFilters, setSearchFilters] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'list'
  const [selectedComics, setSelectedComics] = useState(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [addLecturaModalOpen, setAddLecturaModalOpen] = useState(false);
  const [preSelectedComicId, setPreSelectedComicId] = useState(null);

  const loadPage = async (pageNumber = 1) => {
    const response = await fetchComics({ ...searchFilters, limit: 50, page: pageNumber });
    if (response) {
      setPage(pageNumber);
      setHasMore(response.hasMore ?? response.data.length === 50);
      setSelectedComics(new Set());
    }
  };

  useEffect(() => {
    loadPage(1);
  }, [searchFilters]);

  const handleSearch = (filters) => {
    setSearchFilters(filters);
  };

  const handleAddComic = async (data) => {
    try {
      await addComic(data);
      setShowForm(false);
      setEditingComic(null);
    } catch (err) {
      // El error se muestra en el formulario mediante setFormError
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

  const handleDeleteComic = async (id) => {
    try {
      await deleteComic(id);
    } catch (err) {
      alert('Error al eliminar cómic: ' + err.message);
    }
  };

  const handleEdit = (comic) => {
    setEditingComic(comic);
    setShowForm(true);
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

  const handleSelectComic = (comicId) => {
    const newSelected = new Set(selectedComics);
    if (newSelected.has(comicId)) {
      newSelected.delete(comicId);
    } else {
      newSelected.add(comicId);
    }
    setSelectedComics(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedComics.size === comics.length) {
      setSelectedComics(new Set());
    } else {
      setSelectedComics(new Set(comics.map(c => c._id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedComics.size === 0) {
      alert('Selecciona al menos un cómic para eliminar');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas eliminar ${selectedComics.size} cómic(s)?`)) {
      return;
    }

    try {
      // Convertir Set a Array para evitar problemas de sincronización durante iteración
      const comicsToDelete = Array.from(selectedComics);
      
      // Eliminar todos en paralelo
      await Promise.all(comicsToDelete.map(comicId => deleteComic(comicId)));
      
      setSelectedComics(new Set());
    } catch (err) {
      alert('Error al eliminar cómics: ' + err.message);
    }
  };

  const handleClearSelection = () => {
    setSelectedComics(new Set());
  };

  return (
    <div className="collection-page">
      <div className="page-header">
        <h1>Mi Colección de Cómics</h1>
        <div className="header-actions">
          <button className="btn-add" onClick={() => { setEditingComic(null); setShowForm(true); }}>
            + Agregar Cómic
          </button>
          <button className="btn-bulk-load" onClick={() => setShowBulkLoad(true)}>
            📥 Cargar desde lista
          </button>
          <button 
            className={`btn-view-toggle ${viewMode}`}
            onClick={() => {
              setViewMode(viewMode === 'grid' ? 'list' : 'grid');
              setSelectedComics(new Set());
            }}
          >
            {viewMode === 'grid' ? '📋 Vista Lista' : '🎴 Vista Grid'}
          </button>
        </div>
      </div>

      {selectedComics.size > 0 && (
        <div className="selection-bar">
          <span>{selectedComics.size} cómic(s) seleccionado(s)</span>
          <div className="selection-actions">
            <button 
              className="btn-delete-selected"
              onClick={handleDeleteSelected}
            >
              🗑️ Eliminar Seleccionados
            </button>
            <button 
              className="btn-clear-selection"
              onClick={handleClearSelection}
            >
              Limpiar Selección
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="form-modal">
          <div className="form-container">
            <ComicForm
              comic={editingComic}
              onSubmit={editingComic ? handleEditComic : handleAddComic}
              onCancel={handleCancel}
              onDelete={handleDeleteComic}
            />
          </div>
        </div>
      )}

      <SearchBar onSearch={handleSearch} />

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Cargando cómics...</div>
      ) : comics.length === 0 ? (
        <div className="empty-state">
          <p>No hay cómics aún. ¡Comienza a construir tu colección!</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>Agregar Tu Primer Cómic</button>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="comics-grid">
              {comics.map(comic => (
                <ComicCard
                  key={comic._id}
                  comic={comic}
                  onEdit={handleEdit}
                  onDelete={handleDeleteComic}
                  onSelectComic={setSelectedComic}
                />
              ))}
            </div>
          ) : (
            <div className="comics-list">
              <div className="list-header">
                <input 
                  type="checkbox" 
                  checked={selectedComics.size === comics.length && comics.length > 0}
                  onChange={handleSelectAll}
                  className="select-all-checkbox"
                  title="Seleccionar todos"
                />
                <div className="col-title">Título</div>
                <div className="col-series">Serie</div>
                <div className="col-status">Estado</div>
                <div className="col-date">Fecha</div>
                <div className="col-actions">Acciones</div>
              </div>
              {comics.map(comic => (
                <ComicListRow
                  key={comic._id}
                  comic={comic}
                  isSelected={selectedComics.has(comic._id)}
                  onSelect={handleSelectComic}
                  onEdit={handleEdit}
                  onDelete={handleDeleteComic}
                />
              ))}
            </div>
          )}
          <div className="pagination-controls">
            <button
              className="btn-pagination"
              disabled={page <= 1 || loading}
              onClick={() => loadPage(page - 1)}
            >
              ◀ Anterior
            </button>
            <span className="pagination-label">Página {page}</span>
            <button
              className="btn-pagination"
              disabled={!hasMore || loading}
              onClick={() => loadPage(page + 1)}
            >
              Siguiente ▶
            </button>
          </div>
        </>
      )}

      {selectedComic && (
        <ComicDetailModal
          comic={selectedComic}
          onClose={() => setSelectedComic(null)}
          onCreateLectura={handleCreateLectura}
        />
      )}

      {addLecturaModalOpen && (
        <AddLecturaModal
          open={addLecturaModalOpen}
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

      <BulkLoadModal isOpen={showBulkLoad} onClose={() => setShowBulkLoad(false)} />
    </div>
  );
};


export default CollectionPage;
