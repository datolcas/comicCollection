import React, { useState, useEffect } from 'react';
import { useComics } from '../services/ComicContext';
import Statistics from '../components/Statistics';
import '../styles/DashboardPage.css';

const DashboardPage = () => {
  const { statistics, fetchStatistics, exportData, importData } = useComics();
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const handleExport = async () => {
    try {
      await exportData();
      alert('¡Cómics exportados exitosamente!');
    } catch (err) {
      alert('Error al exportar: ' + err.message);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      alert('¡Cómics importados exitosamente!');
      await fetchStatistics();
    } catch (err) {
      alert('Error al importar: ' + err.message);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Panel de Control</h1>
        <div className="action-buttons">
          <button className="btn-export" onClick={handleExport}>📥 Exportar Colección</button>
          <label className="btn-import">
            📤 Importar Colección
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={importing}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <Statistics stats={statistics} />
    </div>
  );
};

export default DashboardPage;
