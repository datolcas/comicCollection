import React, { useState, useEffect } from 'react';
import { useComics } from '../services/ComicContext';
import ComicCard from '../components/ComicCard';
import ComicDetailModal from '../components/ComicDetailModal';
import AddLecturaModal from '../components/AddLecturaModal';
import '../styles/AuthorsPage.css';

const AuthorsPage = () => {
  const { comics, fetchComics } = useComics();
  const [authors, setAuthors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAuthors, setFilteredAuthors] = useState([]);
  const [expandedAuthor, setExpandedAuthor] = useState(null);
  const [selectedComic, setSelectedComic] = useState(null);
  const [addLecturaModalOpen, setAddLecturaModalOpen] = useState(false);
  const [preSelectedComicId, setPreSelectedComicId] = useState(null);

  useEffect(() => {
    fetchComics();
  }, []);

  useEffect(() => {
    // Extraer todos los autores y agrupar cómics por autor
    const authorMap = {};

    comics.forEach(comic => {
      // Procesar guionistas
      if (comic.scriptwriter?.length > 0) {
        comic.scriptwriter.forEach(author => {
          if (!authorMap[author]) {
            authorMap[author] = { name: author, comics: [], role: 'Guionista' };
          }
          if (!authorMap[author].comics.find(c => c._id === comic._id)) {
            authorMap[author].comics.push(comic);
          }
        });
      }

      // Procesar dibujantes
      if (comic.artist?.length > 0) {
        comic.artist.forEach(author => {
          if (!authorMap[author]) {
            authorMap[author] = { name: author, comics: [], role: 'Dibujante' };
          }
          if (!authorMap[author].comics.find(c => c._id === comic._id)) {
            authorMap[author].comics.push(comic);
          }
        });
      }

      // Procesar entintadores
      if (comic.inker?.length > 0) {
        comic.inker.forEach(author => {
          if (!authorMap[author]) {
            authorMap[author] = { name: author, comics: [], role: 'Entintador' };
          }
          if (!authorMap[author].comics.find(c => c._id === comic._id)) {
            authorMap[author].comics.push(comic);
          }
        });
      }

      // Procesar coloristas
      if (comic.colorist?.length > 0) {
        comic.colorist.forEach(author => {
          if (!authorMap[author]) {
            authorMap[author] = { name: author, comics: [], role: 'Colorista' };
          }
          if (!authorMap[author].comics.find(c => c._id === comic._id)) {
            authorMap[author].comics.push(comic);
          }
        });
      }

      // Procesar otros autores
      if (comic.otherAuthors?.length > 0) {
        comic.otherAuthors.forEach(author => {
          if (!authorMap[author]) {
            authorMap[author] = { name: author, comics: [], role: 'Otro' };
          }
          if (!authorMap[author].comics.find(c => c._id === comic._id)) {
            authorMap[author].comics.push(comic);
          }
        });
      }
    });

    // Convertir a array y ordenar alfabéticamente
    const authorList = Object.values(authorMap).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    setAuthors(authorList);
    setFilteredAuthors(authorList);
  }, [comics]);

  useEffect(() => {
    // Filtrar autores por búsqueda
    const filtered = authors.filter(author =>
      author.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAuthors(filtered);
  }, [searchTerm, authors]);

  const handleEdit = (comic) => {
    // Navegar a editar (esto se implementaría con un modal o navegación)
    console.log('Editar:', comic);
  };

  const handleDelete = (comicId) => {
    // Implementar eliminación
    console.log('Eliminar:', comicId);
  };

  const handleCreateLectura = (comic) => {
    setPreSelectedComicId(comic._id);
    setAddLecturaModalOpen(true);
    setSelectedComic(null);
  };

  return (
    <div className="authors-page">
      <div className="authors-header">
        <h1>👥 Autores</h1>
        <p className="authors-count">Total: {authors.length} autores</p>
      </div>

      <div className="authors-search">
        <input
          type="text"
          placeholder="Buscar autor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="authors-list">
        {filteredAuthors.length === 0 ? (
          <div className="no-authors">
            <p>
              {authors.length === 0
                ? 'No hay autores en tu colección'
                : 'No se encontraron autores con ese nombre'}
            </p>
          </div>
        ) : (
          filteredAuthors.map(author => (
            <div key={author.name} className="author-section">
              <div
                className="author-header"
                onClick={() =>
                  setExpandedAuthor(
                    expandedAuthor === author.name ? null : author.name
                  )
                }
              >
                <div className="author-info">
                  <h2>{author.name}</h2>
                  <span className="author-role">{author.role}</span>
                  <span className="comic-count">📚 {author.comics.length}</span>
                </div>
                <span className={`expand-icon ${expandedAuthor === author.name ? 'expanded' : ''}`}>
                  ▼
                </span>
              </div>

              {expandedAuthor === author.name && (
                <div className="author-comics">
                  <div className="comics-grid">
                    {author.comics.map(comic => (
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

export default AuthorsPage;
