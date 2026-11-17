export const toMillis = (v) => {
  if (!v) return 0;
  if (typeof v === 'object' && (v.seconds || v._seconds)) return (v.seconds || v._seconds) * 1000;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
};

export const includesText = (value, text) => {
  if (Array.isArray(value)) return value.some((v) => includesText(v, text));
  return String(value || '').toLowerCase().includes(text);
};

// Same filters the API used to apply, now done in memory over the full collection
export const filterAndSortComics = (comics, filters) => {
  const { search, author, series, status, sort } = filters;
  let result = comics;

  if (status) result = result.filter((c) => c.readingStatus === status);
  if (author) {
    const a = author.trim().toLowerCase();
    result = result.filter((c) =>
      [c.author, c.scriptwriter, c.artist, c.inker, c.colorist, c.otherAuthors].some((v) => includesText(v, a))
    );
  }
  if (series) {
    const s = series.trim().toLowerCase();
    result = result.filter((c) => includesText(c.series, s));
  }
  if (search) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (c) => includesText(c.title, q) || includesText(c.author, q) || includesText(c.series, q)
    );
  }

  result = [...result];
  if (sort === 'rating') result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (sort === 'title') result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  else result.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  return result;
};

// Returns the slice of `items` for a 1-based page, clamping out-of-range pages.
export const paginate = (items, page, pageSize) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    currentPage,
    totalPages,
    hasMore: currentPage < totalPages,
  };
};
