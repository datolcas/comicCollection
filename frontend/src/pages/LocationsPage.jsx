import React, { useState, useEffect } from 'react';
import { useComics } from '../services/ComicContext';
import ComicCard from '../components/ComicCard';
import ComicDetailModal from '../components/ComicDetailModal';
import AddLecturaModal from '../components/AddLecturaModal';
import '../styles/LocationsPage.css';

const LocationsPage = () => {
  const { comics, fetchComics } = useComics();
  const [locations, setLocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [expandedLocation, setExpandedLocation] = useState(null);
  const [newLocation, setNewLocation] = useState('');
  const [showNewLocationForm, setShowNewLocationForm] = useState(false);
  const [selectedComic, setSelectedComic] = useState(null);
  const [addLecturaModalOpen, setAddLecturaModalOpen] = useState(false);
  const [preSelectedComicId, setPreSelectedComicId] = useState(null);

  useEffect(() => {
    if (comics.length === 0) {
      fetchComics();
    }
  }, [comics.length]);

  useEffect(() => {
    // Extraer todas las ubicaciones y agrupar cómics por ubicación
    const locationMap = {};

    comics.forEach(comic => {
      if (comic.location?.trim()) {
        const loc = comic.location.trim();
        if (!locationMap[loc]) {
          locationMap[loc] = { name: loc, comics: [] };
        }
        locationMap[loc].comics.push(comic);
      }
    });

    // Convertir a array y ordenar alfabéticamente
    const locationList = Object.values(locationMap).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    setLocations(locationList);
    setFilteredLocations(locationList);
  }, [comics]);

  useEffect(() => {
    // Filtrar ubicaciones por búsqueda
    const filtered = locations.filter(location =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLocations(filtered);
  }, [searchTerm, locations]);

  const handleAddLocation = () => {
    if (newLocation.trim()) {
      // El usuario puede agregar ubicaciones navegando a crear un nuevo cómic
      alert('Para agregar una nueva ubicación, crea un nuevo cómic o edita uno existente y asigna la ubicación.');
      setNewLocation('');
      setShowNewLocationForm(false);
    }
  };

  const handleEdit = (comic) => {
    console.log('Editar:', comic);
  };

  const handleDelete = (comicId) => {
    console.log('Eliminar:', comicId);
  };

  const handleCreateLectura = (comic) => {
    setPreSelectedComicId(comic._id);
    setAddLecturaModalOpen(true);
    setSelectedComic(null);
  };

  return (
    <div className="locations-page">
      <div className="locations-header">
        <h1>📍 Ubicaciones</h1>
        <p className="locations-count">Total: {locations.length} ubicaciones</p>
      </div>

      <div className="locations-search">
        <input
          type="text"
          placeholder="Buscar ubicación..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="locations-info">
        <p>
          💡 Tip: Para crear una nueva ubicación, crea o edita un cómic e ingresa el nombre de la nueva ubicación en el campo "Ubicación".
        </p>
      </div>

      <div className="locations-list">
        {filteredLocations.length === 0 ? (
          <div className="no-locations">
            <p>
              {locations.length === 0
                ? 'Aún no hay cómics con ubicación asignada'
                : 'No se encontraron ubicaciones con ese nombre'}
            </p>
          </div>
        ) : (
          filteredLocations.map(location => (
            <div key={location.name} className="location-section">
              <div
                className="location-header"
                onClick={() =>
                  setExpandedLocation(
                    expandedLocation === location.name ? null : location.name
                  )
                }
              >
                <div className="location-info-header">
                  <h2>📦 {location.name}</h2>
                  <span className="comic-count">📚 {location.comics.length}</span>
                </div>
                <span className={`expand-icon ${expandedLocation === location.name ? 'expanded' : ''}`}>
                  ▼
                </span>
              </div>

              {expandedLocation === location.name && (
                <div className="location-comics">
                  <div className="comics-grid">
                    {location.comics.map(comic => (
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
          ))
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

export default LocationsPage;
