// Miscellaneous helpers

export function generateDocNumber(prefix, nextNumber) {
  const padded = String(nextNumber).padStart(4, '0');
  return `${prefix}-${padded}`;
}

export function filterBySearch(items, searchQuery, fields = ['name']) {
  if (!searchQuery || !searchQuery.trim()) return items;
  const q = searchQuery.toLowerCase().trim();
  return items.filter(item => {
    return fields.some(field => {
      const val = item[field];
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(q);
    });
  });
}
