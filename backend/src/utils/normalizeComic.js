export function normalizeComicForInsert(comic) {
  const out = { ...comic };

  // Normalize rating: keep only integer part
  if (out.rating !== undefined && out.rating !== null) {
    const raw = String(out.rating).replace(',', '.');
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      out.rating = Math.max(0, Math.floor(parsed));
    }
  }

  // Normalize language: prefer 'Español (España)' for Spanish pages
  if (out.language && typeof out.language === 'string') {
    const l = out.language.toLowerCase();
    if (l.startsWith('es') || l.includes('españ')) {
      out.language = 'Español (España)';
    } else if (l.includes('ingl') || l.includes('english')) {
      out.language = 'Inglés';
    }
  }

  return out;
}
