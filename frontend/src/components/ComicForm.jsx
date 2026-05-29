import React, { useState } from 'react';
import { useComics } from '../services/ComicContext';
import '../styles/ComicForm.css';

const ComicForm = ({ comic, onSubmit, onCancel, onDelete }) => {
  const { fetchComicFromUrl } = useComics();
  const [formData, setFormData] = useState(comic || {
    title: '',
    scriptwriter: [],
    artist: [],
    inker: [],
    colorist: [],
    otherAuthors: [],
    series: '',
    issueNumber: '',
    publicationDate: '',
    publisher: '',
    language: '',
    genre: [],
    description: '',
    usaNumbers: '',
    coverDate: '',
    legacyNumber: '',
    whakoomUrl: '',
    rating: 0,
    review: '',
    readingStatus: 'unread',
    location: '',
    condition: 'fine',
    purchasePrice: '',
    purchasePricePaid: '',
  });

  const [genreInput, setGenreInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [fetchingFromUrl, setFetchingFromUrl] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [formError, setFormError] = useState('');
  const [authorInputs, setAuthorInputs] = useState({
    scriptwriter: '',
    artist: '',
    inker: '',
    colorist: '',
    otherAuthors: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['purchasePrice', 'purchasePricePaid'].includes(name)
        ? (value === '' ? '' : parseFloat(value))
        : value,
    }));
  };

  const handleAuthorInput = (e, authorType) => {
    setAuthorInputs(prev => ({ ...prev, [authorType]: e.target.value }));
  };

  const handleAuthorAdd = (authorType) => {
    const input = authorInputs[authorType].trim();
    if (input) {
      setFormData(prev => ({
        ...prev,
        [authorType]: [...(prev[authorType] || []), input],
      }));
      setAuthorInputs(prev => ({ ...prev, [authorType]: '' }));
    }
  };

  const handleAuthorRemove = (authorType, index) => {
    setFormData(prev => ({
      ...prev,
      [authorType]: prev[authorType].filter((_, i) => i !== index),
    }));
  };

  const handleGenreAdd = () => {
    if (genreInput.trim()) {
      setFormData(prev => ({
        ...prev,
        genre: [...(prev.genre || []), genreInput.trim()],
      }));
      setGenreInput('');
    }
  };

  const handleGenreRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      genre: prev.genre.filter((_, i) => i !== index),
    }));
  };

  const handleFetchFromUrl = async () => {
    if (!urlInput.trim()) {
      setUrlError('Por favor introduce una URL válida de Whakoom o Marvel Fandom');
      return;
    }

    setFetchingFromUrl(true);
    setUrlError('');
    try {
      const data = await fetchComicFromUrl(urlInput);
      setFormData(prev => ({
        ...prev,
        ...data,
        // Preserve existing data that wasn't fetched
        readingStatus: prev.readingStatus,
        location: prev.location,
        condition: prev.condition,
        review: prev.review,
      }));
      setUrlInput('');
    } catch (err) {
      setUrlError(err.message || 'Error al cargar los datos del cómic');
    } finally {
      setFetchingFromUrl(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await onSubmit(formData);
    } catch (err) {
      setFormError(err.message || 'Error al guardar el cómic');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este cómic? Esta acción no se puede deshacer.')) {
      try {
        await onDelete(comic._id);
        onCancel(); // Cerrar el formulario después de eliminar exitosamente
      } catch (err) {
        // El error ya se maneja en handleDeleteComic de la página
        console.error('Error al eliminar:', err);
      }
    }
  };

  return (
    <form className="comic-form" onSubmit={handleSubmit}>
      <h2>{comic ? 'Editar Cómic' : 'Agregar Nuevo Cómic'}</h2>

      {formError && <div className="form-error">{formError}</div>}

      {/* Whakoom URL Import Section */}
      <div className="whakoom-section">
      <div className="whakoom-title">🔗 Obtener desde URL</div>
        <div className="whakoom-input-group">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Pega URL de Whakoom o Marvel Fandom (ej: https://www.whakoom.com/comic/... o https://marvel.fandom.com/wiki/...)"
            className="whakoom-input"
            disabled={fetchingFromUrl}
          />
          <button
            type="button"
            onClick={handleFetchFromUrl}
            disabled={fetchingFromUrl}
            className="btn-fetch"
          >
            {fetchingFromUrl ? '⏳ Cargando...' : '📥 Obtener'}
          </button>
        </div>
        {urlError && <div className="whakoom-error">{urlError}</div>}
      </div>

      {/* Serie */}
      <div className="form-group">
        <label>Serie</label>
        <input type="text" name="series" value={formData.series} onChange={handleChange} />
      </div>

      {/* Título */}
      <div className="form-group">
        <label>Título *</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>

      {/* Número */}
      <div className="form-group">
        <label>Número #</label>
        <input type="text" name="issueNumber" value={formData.issueNumber} onChange={handleChange} />
      </div>

      {/* Legacy */}
      <div className="form-group">
        <label>Número Legacy</label>
        <input type="text" name="legacyNumber" value={formData.legacyNumber} onChange={handleChange} placeholder="Ej: 12" />
      </div>

      {/* Fecha de Portada */}
      <div className="form-group">
        <label>Fecha de Portada</label>
        <input type="text" name="coverDate" value={formData.coverDate} onChange={handleChange} placeholder="Ej: diciembre 2018" />
      </div>

      {/* Contenido USA */}
      <div className="form-group">
        <label>Contenido USA</label>
        <input type="text" name="usaNumbers" value={formData.usaNumbers} onChange={handleChange} placeholder="Ej: Teen Titans Vol. 3 #72-76" />
      </div>

      {/* Editorial */}
      <div className="form-group">
        <label>Editorial</label>
        <input type="text" name="publisher" value={formData.publisher} onChange={handleChange} />
      </div>

      {/* Idioma */}
      <div className="form-group">
        <label>Idioma</label>
        <select name="language" value={formData.language} onChange={handleChange}>
          <option value="">Seleccionar idioma...</option>
          <option value="Español">Español</option>
          <option value="Inglés">Inglés</option>
          <option value="Francés">Francés</option>
          <option value="Alemán">Alemán</option>
          <option value="Italiano">Italiano</option>
          <option value="Portugués">Portugués</option>
          <option value="Holandés">Holandés</option>
          <option value="Japonés">Japonés</option>
          <option value="Otro">Otro</option>
        </select>
      </div>

      {/* Fecha de Publicación */}
      <div className="form-group">
        <label>Fecha de Publicación</label>
        <input type="text" name="publicationDate" value={formData.publicationDate} onChange={handleChange} placeholder="Ej: enero 2012" />
      </div>

      {/* Estado de Lectura y Puntuación */}
      <div className="form-row">
        <div className="form-group">
          <label>Estado de Lectura</label>
          <select name="readingStatus" value={formData.readingStatus} onChange={handleChange}>
            <option value="unread">No Leído</option>
            <option value="reading">Leyendo</option>
            <option value="completed">Completado</option>
          </select>
        </div>
        <div className="form-group">
          <label>Puntuación</label>
          <input type="number" name="rating" min="0" max="5" step="0.5" value={formData.rating} onChange={handleChange} />
        </div>
      </div>

      {/* Ubicación */}
      <div className="form-group">
        <label>Ubicación</label>
        <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Estantería, caja, etc." />
      </div>

      {/* Precio de compra */}
      <div className="form-group">
        <label>Precio</label>
        <input
          type="number"
          name="purchasePrice"
          value={formData.purchasePrice}
          onChange={handleChange}
          min="0"
          step="0.01"
          placeholder="Ej: 19.95"
        />
      </div>

      {/* Comprado por */}
      <div className="form-group">
        <label>Comprado por</label>
        <input
          type="number"
          name="purchasePricePaid"
          value={formData.purchasePricePaid}
          onChange={handleChange}
          min="0"
          step="0.01"
          placeholder="Ej: 15.00"
        />
      </div>

      {/* Autores */}
      <div className="form-row">
        <div className="form-group">
          <label>Guionista</label>
          <div className="author-input-group">
            <input 
              type="text" 
              value={authorInputs.scriptwriter} 
              onChange={(e) => handleAuthorInput(e, 'scriptwriter')}
              placeholder="Agregar guionista"
            />
            <button type="button" onClick={() => handleAuthorAdd('scriptwriter')}>+</button>
          </div>
          <div className="author-tags">
            {formData.scriptwriter?.map((author, idx) => (
              <span key={idx} className="author-tag">
                {author} <button type="button" onClick={() => handleAuthorRemove('scriptwriter', idx)}>×</button>
              </span>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Dibujante</label>
          <div className="author-input-group">
            <input 
              type="text" 
              value={authorInputs.artist} 
              onChange={(e) => handleAuthorInput(e, 'artist')}
              placeholder="Agregar dibujante"
            />
            <button type="button" onClick={() => handleAuthorAdd('artist')}>+</button>
          </div>
          <div className="author-tags">
            {formData.artist?.map((author, idx) => (
              <span key={idx} className="author-tag">
                {author} <button type="button" onClick={() => handleAuthorRemove('artist', idx)}>×</button>
              </span>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Entintador</label>
          <div className="author-input-group">
            <input 
              type="text" 
              value={authorInputs.inker} 
              onChange={(e) => handleAuthorInput(e, 'inker')}
              placeholder="Agregar entintador"
            />
            <button type="button" onClick={() => handleAuthorAdd('inker')}>+</button>
          </div>
          <div className="author-tags">
            {formData.inker?.map((author, idx) => (
              <span key={idx} className="author-tag">
                {author} <button type="button" onClick={() => handleAuthorRemove('inker', idx)}>×</button>
              </span>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Colorista</label>
          <div className="author-input-group">
            <input 
              type="text" 
              value={authorInputs.colorist} 
              onChange={(e) => handleAuthorInput(e, 'colorist')}
              placeholder="Agregar colorista"
            />
            <button type="button" onClick={() => handleAuthorAdd('colorist')}>+</button>
          </div>
          <div className="author-tags">
            {formData.colorist?.map((author, idx) => (
              <span key={idx} className="author-tag">
                {author} <button type="button" onClick={() => handleAuthorRemove('colorist', idx)}>×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Otros Autores</label>
        <div className="author-input-group">
          <input 
            type="text" 
            value={authorInputs.otherAuthors} 
            onChange={(e) => handleAuthorInput(e, 'otherAuthors')}
            placeholder="Colorista, letrador, etc."
          />
          <button type="button" onClick={() => handleAuthorAdd('otherAuthors')}>+</button>
        </div>
        <div className="author-tags">
          {formData.otherAuthors?.map((author, idx) => (
            <span key={idx} className="author-tag">
              {author} <button type="button" onClick={() => handleAuthorRemove('otherAuthors', idx)}>×</button>
            </span>
          ))}
        </div>
      </div>

      {/* URL de Whakoom */}
      <div className="form-group">
        <label>URL de Whakoom</label>
        <input type="url" name="whakoomUrl" value={formData.whakoomUrl} onChange={handleChange} placeholder="https://www.whakoom.com/comics/..." readOnly style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }} />
      </div>

      {/* Reseña */}
      <div className="form-group">
        <label>Reseña</label>
        <textarea name="review" value={formData.review} onChange={handleChange} rows="3"></textarea>
      </div>

      {/* Géneros (campo adicional) */}
      <div className="form-group">
        <label>Géneros</label>
        <div className="genre-input-group">
          <input
            type="text"
            value={genreInput}
            onChange={(e) => setGenreInput(e.target.value)}
            placeholder="Agregar género y presionar botón"
          />
          <button type="button" onClick={handleGenreAdd}>Agregar</button>
        </div>
        <div className="genre-tags">
          {formData.genre?.map((g, idx) => (
            <span key={idx} className="genre-tag">
              {g} <button type="button" onClick={() => handleGenreRemove(idx)}>×</button>
            </span>
          ))}
        </div>
      </div>

      {/* Descripción (campo adicional) */}
      <div className="form-group">
        <label>Descripción</label>
        <textarea name="description" value={formData.description} onChange={handleChange} rows="3"></textarea>
      </div>

      {/* Condición (campo adicional) */}
      <div className="form-group">
        <label>Condición</label>
        <select name="condition" value={formData.condition} onChange={handleChange}>
          <option value="mint">Impecable</option>
          <option value="fine">Excelente</option>
          <option value="very-good">Muy Bueno</option>
          <option value="good">Bueno</option>
          <option value="fair">Regular</option>
          <option value="poor">Pobre</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">Guardar Cómic</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
        {comic && (
          <button type="button" className="btn-delete" onClick={handleDelete}>Eliminar Cómic</button>
        )}
      </div>
    </form>
  );
};

export default ComicForm;
