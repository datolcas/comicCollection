import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

const ComicContext = createContext();

export const ComicProvider = ({ children }) => {
  const [comics, setComics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [usVolumes, setUsVolumes] = useState([]);
  const [volumeLoading, setVolumeLoading] = useState(false);

  const fetchComics = async (filters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/comics?${params}`);
      setComics(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
      setComics([...comics, response.data]);
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
      setComics(comics.map(c => c._id === id ? response.data : c));
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteComic = async (id) => {
    try {
      await api.delete(`/comics/${id}`);
      setComics(prevComics => prevComics.filter(c => c._id !== id));
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

  const importData = async (jsonData) => {
    try {
      const response = await api.post('/comics/import', jsonData);
      await fetchComics();
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
      await fetchUsVolumes();
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

  const fetchUsVolumes = async () => {
    setVolumeLoading(true);
    try {
      const response = await api.get('/usa-volumes');
      setUsVolumes(response.data);
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
      await fetchComics();
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
        importData,
        fetchComicFromUrl,
        fetchVolumeFromUrl,
        createOrUpdateUsVolume,
        deleteUsVolume,
        fetchUsVolumes,
        usVolumes,
        volumeLoading,
        loadComicsFromList,
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
