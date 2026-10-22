import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';

export function useClosingStock() {
  const entries = useLiveQuery(
    () => (db.closingStockEntries ? db.closingStockEntries.toArray() : []),
    []
  ) || [];

  // Sort descending by date, then createdAt
  const sortedEntries = [...entries].sort((a, b) => {
    const dDiff = new Date(b.date || 0) - new Date(a.date || 0);
    if (dDiff !== 0) return dDiff;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const latestEntry = sortedEntries[0] || null;
  const latestAmount = latestEntry ? Number(latestEntry.amount || 0) : 0;

  const addEntry = async ({ date, amount }) => {
    const newEntry = {
      id: 'cs_' + Date.now() + Math.random().toString(36).substring(2, 6),
      date: date || new Date().toISOString().split('T')[0],
      amount: Number(amount || 0),
      createdAt: new Date().toISOString(),
    };
    await db.closingStockEntries.add(newEntry);
    return newEntry;
  };

  const updateEntry = async (id, { date, amount }) => {
    await db.closingStockEntries.update(id, {
      date,
      amount: Number(amount || 0),
      updatedAt: new Date().toISOString(),
    });
  };

  const deleteEntry = async (id) => {
    await db.closingStockEntries.delete(id);
  };

  return {
    closingStockEntries: sortedEntries,
    latestClosingStock: latestEntry,
    closingStockValue: latestAmount,
    addEntry,
    updateEntry,
    deleteEntry,
  };
}
