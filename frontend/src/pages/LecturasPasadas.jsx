import React, { useState, useEffect } from 'react';
import { getLecturas, deleteLectura } from '../services/lecturasService';
import EditLecturaModal from '../components/EditLecturaModal';
import '../styles/Lecturas.css';

export default function LecturasPasadas() {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [lecturas, setLecturas] = useState([]);
  const [editingLectura, setEditingLectura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLecturas();
  }, []);

  const loadLecturas = async () => {
    try {
      setLoading(true);
      const data = await getLecturas();
      setLecturas(data);
    } catch (err) {
      console.error('Error al cargar las lecturas', err);
      setError('Error al cargar las lecturas');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (lectura) => {
    setEditingLectura(lectura);
    setEditModalOpen(true);
  };

  const handleEditSave = (updated) => {
    setLecturas(prev => prev.map(l => l._id === updated._id ? updated : l));
    setEditModalOpen(false);
    setEditingLectura(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta lectura?')) {
      try {
        await deleteLectura(id);
        setLecturas(prev => prev.filter(l => l._id !== id));
      } catch (err) {
        setError('Error al eliminar la lectura');
        console.error(err);
      }
    }
  };

  const pasadas = lecturas.filter(l => l.endDate);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <EditLecturaModal open={editModalOpen} lectura={editingLectura} onClose={() => setEditModalOpen(false)} onSave={handleEditSave} />
      <h2>Lecturas Pasadas</h2>
      {error && <div className="error">{error}</div>}
      {pasadas.length === 0 ? (
        <p>No tienes lecturas pasadas</p>
      ) : (
        <table className="lecturas-table">
          <thead>
            <tr>
              <th>Cómic</th>
              <th>Fecha Inicio</th>
              <th>Fecha Fin</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pasadas.map(lectura => (
              <tr key={lectura._id}>
                <td>{lectura.comic?.title || 'Sin título'}</td>
                <td>{new Date(lectura.startDate).toLocaleDateString()}</td>
                <td>{new Date(lectura.endDate).toLocaleDateString()}</td>
                <td className="acciones">
                  <button className="btn-small" onClick={() => handleEditClick(lectura)}>Editar</button>
                  <button className="btn-small btn-delete" onClick={() => handleDelete(lectura._id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
