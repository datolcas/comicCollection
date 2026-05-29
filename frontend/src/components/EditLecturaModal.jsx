import React, { useState, useEffect } from 'react';
import { updateLectura } from '../services/lecturasService';

export default function EditLecturaModal({ open, lectura, onClose, onSave }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (lectura) {
      setStartDate(lectura.startDate?.split('T')[0] || '');
      setEndDate(lectura.endDate?.split('T')[0] || '');
    }
  }, [lectura]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const updated = await updateLectura(lectura._id, startDate, endDate || null);
      onSave(updated);
      setStartDate('');
      setEndDate('');
    } catch (err) {
      setError(err.message || 'Error al actualizar la lectura');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !lectura) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Editar Lectura</h2>
        <p><strong>{lectura.comic?.title || 'Sin título'}</strong></p>
        {error && <div className="error">{error}</div>}
        <label>Fecha inicio:
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </label>
        <label>Fecha fin (opcional):
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button onClick={onClose} disabled={saving}>Cancelar</button>
          <button onClick={handleSave} disabled={!startDate || saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
