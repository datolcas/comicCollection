import React, { useState, useContext, useEffect } from 'react';
import { ComicContext } from '../services/ComicContext';
import { createLectura } from '../services/lecturasService';

export default function AddLecturaModal({ open, isOpen, onClose, onSave, preSelectedComicId }) {
  const { comics } = useContext(ComicContext);
  const visible = open ?? isOpen;
  const [selectedComicId, setSelectedComicId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (preSelectedComicId) {
      setSelectedComicId(preSelectedComicId);
    } else if (!visible) {
      setSelectedComicId('');
    }
  }, [preSelectedComicId, visible]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const lectura = await createLectura(selectedComicId, startDate, endDate || null);
      onSave(lectura);
      setSelectedComicId(preSelectedComicId || '');
      setStartDate('');
      setEndDate('');
    } catch (err) {
      setError(err.message || 'Error al guardar la lectura');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Añadir Lectura</h2>
        {error && <div className="error">{error}</div>}
        <label>Cómic:
          <select value={selectedComicId} onChange={e => setSelectedComicId(e.target.value)} disabled={!!preSelectedComicId}>
            <option value="">Selecciona un cómic</option>
            {comics.map(comic => (
              <option key={comic._id} value={comic._id}>{comic.title}</option>
            ))}
          </select>
        </label>
        <label>Fecha inicio:
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </label>
        <label>Fecha fin (opcional):
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button onClick={onClose} disabled={saving}>Cancelar</button>
          <button onClick={handleSave} disabled={!selectedComicId || !startDate || saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
