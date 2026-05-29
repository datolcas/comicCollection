import api from './api';

export const getLecturas = async () => {
  const response = await api.get('/lecturas');
  return response.data;
};

export const createLectura = async (comicId, startDate, endDate) => {
  const response = await api.post('/lecturas', {
    comic: comicId,
    startDate,
    endDate,
  });
  return response.data;
};

export const updateLectura = async (id, startDate, endDate) => {
  const response = await api.put(`/lecturas/${id}`, {
    startDate,
    endDate,
  });
  return response.data;
};

export const deleteLectura = async (id) => {
  await api.delete(`/lecturas/${id}`);
};
