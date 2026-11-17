import React, { useState } from 'react';
import { useComics } from '../services/ComicContext';
import EditLecturaModal from '../components/EditLecturaModal';
import '../styles/Lecturas.css';

export default function LecturasFuturas() {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { lecturas, lecturasLoading: loading, lecturasError, removeLectura } = useComics();
  const [editingLectura, setEditingLectura] = useState(null);
  const [deleteError, setError] = useState('');
  const error = deleteError || lecturasError;

  const handleEditClick = (lectura) => {
    setEditingLectura(lectura);
    setEditModalOpen(true);
  };

  const handleEditSave = (updated) => {
    setEditModalOpen(false);
    setEditingLectura(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta lectura?')) {
      try {
        await removeLectura(id);
      } catch (err) {
        setError('Error al eliminar la lectura');
        console.error(err);
      }
    }
  };

  const hoy = new Date();
  const futuras = lecturas.filter(l => !l.endDate && new Date(l.startDate) > hoy);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <EditLecturaModal open={editModalOpen} lectura={editingLectura} onClose={() => setEditModalOpen(false)} onSave={handleEditSave} />
      <h2>Lecturas Futuras</h2>
      {error && <div className="error">{error}</div>}
      {futuras.length === 0 ? (
        <p>No tienes lecturas futuras programadas</p>
      ) : (
        <table className="lecturas-table">
          <thead>
            <tr>
              <th>Cómic</th>
              <th>Fecha Programada</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {futuras.map(lectura => (
              <tr key={lectura._id}>
                <td>{lectura.comic?.title || 'Sin título'}</td>
                <td>{new Date(lectura.startDate).toLocaleDateString()}</td>
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
