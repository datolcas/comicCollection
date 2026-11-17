import React, { createContext, useContext, useState, useRef, useMemo } from 'react';
import api from './api';
import * as lecturasService from './lecturasService';

const ComicContext = createContext();

export const ComicProvider = ({ children }) => {
  // Full collection (including sold comics), loaded once and kept in sync locally
  // after every create/update/delete so navigating between pages costs no requests.
  const [allComics, setAllComics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [usVolumes, setUsVolumes] = useState([]);
  const [volumeLoading, setVolumeLoading] = useState(false);
  const comicsLoaded = useRef(false);
  const comicsRequest = useRef(null);
  const volumesLoaded = useRef(false);
  const [lecturas, setLecturas] = useState([]);
  const [lecturasLoading, setLecturasLoading] = useState(true);
  const [lecturasError, setLecturasError] = useState('');
  const lecturasLoaded = useRef(false);
  const lecturasRequest = useRef(null);

  // Sold comics are hidden everywhere in the UI
  const comics = useMemo(() => allComics.filter((c) => c.sold !== true), [allComics]);

  // Loads the whole collection once. Filters are applied client-side by each page,
  // so the `filters` argument is ignored (kept for backwards compatibility).
  const fetchComics = async (_filters = {}, options = {}) => {
    const { force = false } = options;
    if (comicsLoaded.current && !force) return { data: comics };
    if (comicsRequest.current) return comicsRequest.current;

    setLoading(true);
    comicsRequest.current = (async () => {
      try {
        const response = await api.get('/comics?sold=true');
        const data = Array.isArray(response.data) ? response.data : response.data.data;
        setAllComics(data);
        comicsLoaded.current = true;
        setError(null);
        return { data: data.filter((c) => c.sold !== true) };
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || 'Error al cargar cómics';
        setError(errorMessage);
        return { data: [] };
      } finally {
        comicsRequest.current = null;
        setLoading(false);
      }
    })();
    return comicsRequest.current;
  };

  // Lecturas: loaded once, then kept in sync locally after each change
  const fetchLecturas = async (options = {}) => {
    if (lecturasLoaded.current && !options.force) return lecturas;
    if (lecturasRequest.current) return lecturasRequest.current;
    setLecturasLoading(true);
    lecturasRequest.current = (async () => {
      try {
        const data = await lecturasService.getLecturas();
        setLecturas(data);
        lecturasLoaded.current = true;
        setLecturasError('');
        return data;
      } catch (err) {
        console.error(err);
        setLecturasError('Error al cargar las lecturas');
        return [];
      } finally {
        lecturasRequest.current = null;
        setLecturasLoading(false);
      }
    })();
    return lecturasRequest.current;
  };

  const addLectura = async (comicId, startDate, endDate) => {
    const lectura = await lecturasService.createLectura(comicId, startDate, endDate);
    setLecturas((prev) => [...prev, lectura]);
    return lectura;
  };

  const editLectura = async (id, startDate, endDate) => {
    const updated = await lecturasService.updateLectura(id, startDate, endDate);
    setLecturas((prev) => prev.map((l) => (l._id === id ? updated : l)));
    return updated;
  };

  const removeLectura = async (id) => {
    await lecturasService.deleteLectura(id);
    setLecturas((prev) => prev.filter((l) => l._id !== id));
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/comics/statistics');
      setStatistics(response.data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  const addComic = async (comic) => {
    try {
      const response = await api.post('/comics', comic);
      setAllComics((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error al agregar el cómic';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateComic = async (id, comic) => {
    try {
      const response = await api.put(`/comics/${id}`, comic);
      setAllComics((prev) => prev.map((c) => (c._id === id ? response.data : c)));
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteComic = async (id) => {
    try {
      await api.delete(`/comics/${id}`);
      setAllComics((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const exportData = async () => {
    try {
      const response = await api.get('/comics/export');
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'comics-export.json';
      link.click();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const exportCsv = async () => {
    try {
      const response = await api.get('/comics/export?format=csv', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'comics-export.csv';
      link.click();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const importData = async (jsonData) => {
    try {
      const response = await api.post('/comics/import', jsonData);
      await fetchComics({}, { force: true });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const fetchComicFromUrl = async (url) => {
    try {
      const response = await api.post('/comics/fetch-from-url', { url });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const fetchVolumeFromUrl = async (url) => {
    try {
      const response = await api.post('/usa-volumes/fetch-from-url', { url });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const createOrUpdateUsVolume = async (url) => {
    try {
      const response = await api.post('/usa-volumes', { url });
      await fetchUsVolumes({ force: true });
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error al guardar el volumen';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteUsVolume = async (id) => {
    try {
      await api.delete(`/usa-volumes/${id}`);
      setUsVolumes((prev) => prev.filter((volume) => volume._id !== id));
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error al eliminar el volumen';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const fetchUsVolumes = async (options = {}) => {
    if (volumesLoaded.current && !options.force) return usVolumes;
    setVolumeLoading(true);
    try {
      const response = await api.get('/usa-volumes');
      setUsVolumes(response.data);
      volumesLoaded.current = true;
      setError(null);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error cargando volúmenes';
      setError(errorMessage);
      throw err;
    } finally {
      setVolumeLoading(false);
    }
  };

  const loadComicsFromList = async (urls) => {
    try {
      const response = await api.post('/comics/load-from-list', { urls });
      // Refresh comics after loading
      await fetchComics({}, { force: true });
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error al cargar cómics desde lista';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return (
    <ComicContext.Provider
      value={{
        comics,
        loading,
        error,
        statistics,
        fetchComics,
        fetchStatistics,
        addComic,
        updateComic,
        deleteComic,
        exportData,
        exportCsv,
        importData,
        fetchComicFromUrl,
        fetchVolumeFromUrl,
        createOrUpdateUsVolume,
        deleteUsVolume,
        fetchUsVolumes,
        usVolumes,
        volumeLoading,
        loadComicsFromList,
        lecturas,
        lecturasLoading,
        lecturasError,
        fetchLecturas,
        addLectura,
        editLectura,
        removeLectura,
      }}
    >
      {children}
    </ComicContext.Provider>
  );
};

export const useComics = () => {
  const context = useContext(ComicContext);
  if (!context) {
    throw new Error('useComics must be used within ComicProvider');
  }
  return context;
};

export { ComicContext };
