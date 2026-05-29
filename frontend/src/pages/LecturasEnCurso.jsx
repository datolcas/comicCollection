import React, { useState, useEffect } from 'react';
import { getLecturas, deleteLectura } from '../services/lecturasService';
import AddLecturaModal from '../components/AddLecturaModal';
import EditLecturaModal from '../components/EditLecturaModal';
import '../styles/Lecturas.css';

export default function LecturasEnCurso() {
  const [modalOpen, setModalOpen] = useState(false);
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
      setError('');
    } catch (err) {
      setError('Error al cargar las lecturas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLectura = async (lectura) => {
    setLecturas(prev => [...prev, lectura]);
    setModalOpen(false);
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

  const enCurso = lecturas.filter(l => !l.endDate);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <button onClick={() => setModalOpen(true)}>Añadir lectura</button>
      <AddLecturaModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleAddLectura} />
      <EditLecturaModal open={editModalOpen} lectura={editingLectura} onClose={() => setEditModalOpen(false)} onSave={handleEditSave} />
      <h2>Lecturas en curso</h2>
      {error && <div className="error">{error}</div>}
      {enCurso.length === 0 ? (
        <p>No tienes lecturas en curso</p>
      ) : (
        <table className="lecturas-table">
          <thead>
            <tr>
              <th>Cómic</th>
              <th>Fecha Inicio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {enCurso.map(lectura => (
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
